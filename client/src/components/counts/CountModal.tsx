import { useState, useEffect } from "react";
import { useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertBatchSchema, Batch, ServiceOption } from "@shared/schema";
import { useLocation } from "wouter";
import ConfirmDialog from "@/components/ui/confirm-dialog";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  service: z.string().optional(),
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Fetch service options from the API
  const { data: serviceOptions = [], isLoading: isLoadingServiceOptions } = useQuery<ServiceOption[]>({
    queryKey: ['/api/service-options'],
    queryFn: async () => {
      const response = await fetch('/api/service-options');
      if (!response.ok) {
        throw new Error("Failed to fetch service options");
      }
      return response.json();
    },
  });
  
  // Find the default service option when service options are loaded
  const defaultServiceOption = 
    serviceOptions.find(option => option.isDefault) ||
    (serviceOptions.length > 0 ? serviceOptions[0] : null);
  
  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      name: format(new Date(), 'MMMM d, yyyy'), // Automatically generate name from date
      status: "OPEN",
      notes: "",
      service: "", // Will be updated after service options load
    },
  });
  
  // Fetch batch details if editing
  const { data: batchData, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches', batchId],
    queryFn: async () => {
      if (!batchId) return null;
      
      const response = await fetch(`/api/batches/${batchId}`);
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
        service: batchData.service ?? "",
      });
    }
  }, [batchData, form]);
  
  // Set default service option when options are loaded
  useEffect(() => {
    // Only set default for new counts (not when editing)
    if (!isEdit && defaultServiceOption && serviceOptions.length > 0) {
      const defaultValue = defaultServiceOption.value;
      if (defaultValue && !form.getValues('service')) {
        form.setValue('service', defaultValue);
      }
    }
  }, [serviceOptions, defaultServiceOption, isEdit, form]);
  
  // Auto-generate name when date or service changes
  useEffect(() => {
    const date = form.watch('date');
    const service = form.watch('service');
    
    if (date) {
      let formattedDate = format(new Date(date), 'MMMM d, yyyy');
      let nameValue = formattedDate;
      
      // Find the service option by value
      if (service && serviceOptions.length > 0) {
        const serviceOption = serviceOptions.find(option => option.value === service);
        if (serviceOption) {
          nameValue = `${serviceOption.name}, ${formattedDate}`;
        }
      }
      
      form.setValue('name', nameValue);
    }
  }, [form.watch('date'), form.watch('service'), serviceOptions, form]);
  
  // Create/update batch mutation
  const createBatchMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const url = isEdit && batchId ? `/api/batches/${batchId}` : '/api/batches';
      const method = isEdit ? "PATCH" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      });
      
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
      
      // Use setTimeout to ensure UI has time to update before navigation
      setTimeout(() => {
        // For new count creation, redirect to the batch detail page
        if (!isEdit && data && data.id) {
          console.log(`Navigating to batch/${data.id}`);
          setLocation(`/batch/${data.id}`);
        } else if (isEdit && batchId) {
          // For edits, redirect to the batch detail page if we're not already there
          console.log(`Navigating to batch/${batchId}`);
          setLocation(`/batch/${batchId}`);
        }
      }, 300);
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
      
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete count");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches/current'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      toast({
        title: "Count Deleted",
        description: "The count and all associated donations have been deleted successfully.",
        className: "bg-[#48BB78] text-white",
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
                  name="service"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Only configured service options */}
                          {isLoadingServiceOptions ? (
                            <SelectItem value="loading" disabled>Loading options...</SelectItem>
                          ) : serviceOptions.length > 0 ? (
                            serviceOptions.map((option) => (
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
                      className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
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

export default CountModal;