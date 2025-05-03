import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertBatchSchema, Batch } from "@shared/schema";
import { useLocation } from "wouter";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Form schema for validation
const formSchema = insertBatchSchema.extend({
  date: z.string().min(1, "Date is required"),
});

// Infer the type from the schema
type FormValues = z.infer<typeof formSchema>;

interface CountModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number | null;
  isEdit?: boolean;
}

const CountModal = ({ isOpen, onClose, batchId, isEdit = false }: CountModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      date: format(new Date(), 'yyyy-MM-dd'),
      status: "OPEN",
      notes: "",
    },
  });
  
  // Fetch batch details if editing
  const { data: batchData, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      
      const response = await apiRequest("GET", `/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count");
      }
      
      return response.json();
    },
    enabled: !!batchId && isEdit,
  });
  
  // Set form values when batch data is loaded
  useEffect(() => {
    if (batchData) {
      form.reset({
        name: batchData.name,
        date: format(new Date(batchData.date), 'yyyy-MM-dd'),
        status: batchData.status,
        notes: batchData.notes ?? "",
      });
    }
  }, [batchData, form]);
  
  // Create/update batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEdit && batchId ? `/api/batches/${batchId}` : '/api/batches';
      const method = isEdit ? "PATCH" : "POST";
      
      const response = await apiRequest(method, url, values);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save count");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Success",
        description: isEdit 
          ? "Count updated successfully." 
          : "Count created successfully.",
        className: "bg-[#48BB78] text-white",
      });
      
      onClose();
      
      // For new count creation, redirect to the batch detail page
      if (!isEdit && data && data.id) {
        setLocation(`/batch/${data.id}`);
      } else if (isEdit && batchId) {
        // For edits, redirect to the batch detail page if we're not already there
        setLocation(`/batch/${batchId}`);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? 'update' : 'create'} count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    createBatchMutation.mutate(values);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#2D3748]">
            {isEdit ? "Edit Count" : "Create New Count"}
          </DialogTitle>
        </DialogHeader>
        
        {isLoadingBatch ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Count Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sunday Service, May 3, 2025" />
                    </FormControl>
                    <FormDescription>
                      Give this count a descriptive name, such as a service date.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormDescription>
                      The date when this count of donations was collected.
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
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="CLOSED">Closed</SelectItem>
                        <SelectItem value="FINALIZED">Finalized</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Open: Still collecting donations<br />
                      Closed: No more donations accepted<br />
                      Finalized: Count verified and ready for accounting
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
                        rows={3} 
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        value={field.value || ""}
                        disabled={field.disabled}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormDescription>
                      Any additional information about this count.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white"
                  disabled={createBatchMutation.isPending}
                >
                  {createBatchMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Update Count" : "Create Count"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CountModal;