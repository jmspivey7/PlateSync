import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Form schema for batch creation/editing
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.date({
    required_error: "Date is required",
  }),
  status: z.string({
    required_error: "Status is required",
  }),
  notes: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface BatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number | null;
  isEdit?: boolean;
}

const BatchModal = ({ isOpen, onClose, batchId, isEdit = false }: BatchModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  // Fetch batch data if editing
  const { data: batchData, isLoading: isLoadingBatch } = useQuery({
    queryKey: ["/api/batches", batchId],
    queryFn: async () => {
      if (!batchId) return null;
      const response = await apiRequest("GET", `/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch batch");
      }
      return response.json();
    },
    enabled: isEdit && !!batchId,
  });

  // Generate default name based on current date
  const generateDefaultName = () => {
    const today = new Date();
    return format(today, "MMMM d, yyyy");
  };

  // Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: generateDefaultName(),
      date: new Date(),
      status: "OPEN",
      notes: "",
    },
  });

  // Update form values when editing an existing batch
  useEffect(() => {
    if (isEdit && batchData) {
      form.reset({
        name: batchData.name,
        date: new Date(batchData.date),
        status: batchData.status,
        notes: batchData.notes,
      });
    }
  }, [isEdit, batchData, form]);

  // Create batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("POST", "/api/batches", values);
      
      if (!response.ok) {
        throw new Error("Failed to create batch");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      toast({
        title: "Batch created",
        description: "New donation batch has been created successfully.",
        className: "bg-[#48BB78] text-white",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsPending(false);
    },
  });

  // Update batch mutation
  const updateBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!batchId) throw new Error("Batch ID is required");
      
      const response = await apiRequest("PATCH", `/api/batches/${batchId}`, values);
      
      if (!response.ok) {
        throw new Error("Failed to update batch");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId] });
      toast({
        title: "Batch updated",
        description: "Donation batch has been updated successfully.",
        className: "bg-[#48BB78] text-white",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsPending(false);
    },
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    setIsPending(true);
    if (isEdit && batchId) {
      updateBatchMutation.mutate(values);
    } else {
      createBatchMutation.mutate(values);
    }
  };

  // Loading state
  if (isEdit && isLoadingBatch) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#4299E1]" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogDescription>
            {isEdit 
              ? "Update the details of this donation batch" 
              : "Create a new batch to organize your donations"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Sunday Service May 3, 2025" />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for this collection of donations
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Batch Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    The date when this batch of donations was collected
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batch status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="CLOSED">Closed</SelectItem>
                      <SelectItem value="FINALIZED">Finalized</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Open: Still collecting donations. Closed: Done collecting but not reconciled. Finalized: Reconciled and locked.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional information about this batch"
                      className="h-24 resize-none"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              
              <Button 
                type="submit" 
                className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white"
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEdit ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEdit ? "Update Batch" : "Create Batch"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default BatchModal;