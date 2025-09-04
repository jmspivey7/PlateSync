import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Batch, batchStatusEnum, ServiceOption } from "@shared/schema";
import ConfirmDialog from "@/components/ui/confirm-dialog";

// Create a schema for batch form
const formSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  date: z.string().min(1, "Date is required"),
  status: z.enum(["OPEN", "CLOSED", "FINALIZED"]),
  notes: z.string().optional(),
  service: z.string().optional(),
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
  const [_, setLocation] = useLocation();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Load service options
  const { data: serviceOptions = [], isLoading: isLoadingServiceOptions } = useQuery<ServiceOption[]>({
    queryKey: ['/api/service-options'],
    // Always enabled to ensure options are available when the modal opens
  });
  
  // Load batch data if editing
  const { data: batchData, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: batchId ? [`/api/batches/${batchId}`] : ['/api/batches'],
    enabled: !!batchId && isEdit,
  });

  // React Hook Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: format(new Date(), 'MMMM d, yyyy'), // Default to today's date as name
      date: new Date().toISOString().split('T')[0],
      status: "OPEN",
      notes: "",
      service: "",
    },
  });
  
  // Update form values when editing an existing batch
  useEffect(() => {
    if (batchData && isEdit) {
      const formattedDate = new Date(batchData.date).toISOString().split('T')[0];
      
      form.reset({
        name: batchData.name,
        date: formattedDate,
        status: batchData.status as "OPEN" | "CLOSED" | "FINALIZED",
        notes: batchData.notes || "",
        service: batchData.service || "",
      });
    }
  }, [batchData, form, isEdit]);
  
  // Create/update batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (isEdit && batchId) {
        // Update existing batch
        return await apiRequest(`/api/batches/${batchId}`, {
          method: "PATCH",
          body: {
            name: values.name,
            date: values.date,
            status: values.status,
            notes: values.notes,
            service: values.service,
          }
        });
      } else {
        // Create new batch
        return await apiRequest("/api/batches", {
          method: "POST",
          body: {
            name: values.name,
            date: values.date,
            status: values.status,
            notes: values.notes,
            service: values.service,
          }
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Success",
        description: isEdit 
          ? "Count updated successfully." 
          : "Count created successfully.",
        className: "bg-[#d35f5f] text-white",
      });
      
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isEdit ? 'update' : 'create'} count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Delete batch mutation
  const deleteBatchMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      if (!batchId) return;
      
      await apiRequest(`/api/batches/${batchId}`, {
        method: "DELETE",
        returnRaw: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Count Deleted",
        description: "The count and all associated donations have been deleted successfully.",
        className: "bg-[#d35f5f] text-white",
      });
      
      onClose();
      setLocation('/counts');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Form submission handler
  const onSubmit = (values: FormValues) => {
    createBatchMutation.mutate(values);
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px] bg-white">
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
                
                {/* Service Dropdown Field */}
                <FormField
                  control={form.control}
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        value={field.value || ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Empty option */}
                          <SelectItem value="">Select a service</SelectItem>
                          
                          {/* Only configured service options */}
                          {Array.isArray(serviceOptions) && serviceOptions.length > 0 ? (
                            serviceOptions.map((option: ServiceOption) => (
                              <SelectItem key={option.id} value={option.value}>
                                {option.name}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No service options configured</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        The type of service this count is for.
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
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormDescription>
                        Any additional information about this count.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter className="flex justify-between sm:justify-between">
                  {isEdit && (
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-500 text-red-600 hover:bg-red-50"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Count
                    </Button>
                  )}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-[#d35f5f] hover:bg-[#b84f4f] text-white"
                      disabled={createBatchMutation.isPending}
                    >
                      {createBatchMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {isEdit ? "Update Count" : "Create Count"}
                    </Button>
                  </div>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => deleteBatchMutation.mutate()}
        title="Delete Count"
        description="Are you sure you want to delete this count? This action cannot be undone and will permanently delete the count and all associated donations."
        confirmText="Delete Count"
        cancelText="Cancel"
        isPending={deleteBatchMutation.isPending}
        destructive={true}
      />
    </>
  );
};

export default BatchModal;