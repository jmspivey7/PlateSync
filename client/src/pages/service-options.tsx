import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Loader2, Edit, Trash, ListChecks } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";
import { ServiceOption } from "@shared/schema";

// Form schema
const serviceOptionSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  isDefault: z.boolean().default(false),
});

type FormValues = z.infer<typeof serviceOptionSchema>;

const ServiceOptions = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [currentOption, setCurrentOption] = useState<ServiceOption | null>(null);
  const [deleteOption, setDeleteOption] = useState<ServiceOption | null>(null);
  
  // Form for creating/editing
  const form = useForm<FormValues>({
    resolver: zodResolver(serviceOptionSchema),
    defaultValues: {
      name: "",
      isDefault: false,
    },
  });
  
  // Reset form values when editing an option
  const resetForm = (option?: ServiceOption) => {
    if (option) {
      form.reset({
        name: option.name,
        // Convert null or undefined to false for isDefault
        isDefault: option.isDefault === true,
      });
    } else {
      form.reset({
        name: "",
        isDefault: false,
      });
    }
  };
  
  // Fetch service options
  const { data: serviceOptions, isLoading } = useQuery<ServiceOption[]>({
    queryKey: ['/api/service-options'],
    queryFn: async () => {
      return await apiRequest('/api/service-options');
    },
  });
  
  // Create service option mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await apiRequest('/api/service-options', {
        method: 'POST',
        body: data, // Pass object directly, apiRequest handles JSON.stringify internally
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service option created successfully',
        className: "bg-[#48BB78] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      setIsCreateOpen(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Service option creation error:", error);
      toast({
        title: 'Error',
        description: `Failed to create service option: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Update service option mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: FormValues }) => {
      const response = await apiRequest(`/api/service-options/${id}`, {
        method: 'PATCH',
        body: data, // Pass object directly, apiRequest handles JSON.stringify internally
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service option updated successfully',
        className: "bg-[#48BB78] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      setIsEditOpen(false);
      setCurrentOption(null);
      form.reset();
    },
    onError: (error) => {
      console.error("Service option update error:", error);
      toast({
        title: 'Error',
        description: `Failed to update service option: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Delete service option mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/service-options/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Service option deleted successfully',
        className: "bg-[#48BB78] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      setDeleteOption(null);
    },
    onError: (error) => {
      console.error("Service option deletion error:", error);
      toast({
        title: 'Error',
        description: `Failed to delete service option: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
      });
    },
  });
  
  // Handle form submissions
  const onCreateSubmit = (data: FormValues) => {
    createMutation.mutate(data);
  };
  
  const onEditSubmit = (data: FormValues) => {
    if (currentOption) {
      updateMutation.mutate({ id: currentOption.id, data });
    }
  };
  
  const handleDelete = () => {
    if (deleteOption) {
      deleteMutation.mutate(deleteOption.id);
    }
  };
  
  // Handle edit button click
  const handleEdit = (option: ServiceOption) => {
    setCurrentOption(option);
    resetForm(option);
    setIsEditOpen(true);
  };
  
  // If not admin, redirect or show error
  if (!isAdmin) {
    return (
      <PageLayout 
        title="Access Denied" 
        subtitle="You do not have permission to access this page"
      >
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-600 mb-4">You need administrator privileges to view this page.</p>
            <Button onClick={() => window.location.href = "/dashboard"}>
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout 
      title="Service Options" 
      subtitle="Manage service options for creating new counts"
      icon={<ListChecks className="h-6 w-6 text-[#69ad4c]" />}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Service Options</CardTitle>
              <CardDescription>
                Configure the available service options for new counts
              </CardDescription>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#588f3f]"
                  onClick={() => resetForm()}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Service Option
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={form.handleSubmit(onCreateSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Create Service Option</DialogTitle>
                    <DialogDescription>
                      Add a new service option that will be available when creating a new count
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Service Name</Label>
                      <Input 
                        id="name" 
                        placeholder="e.g., Sunday Morning Service"
                        {...form.register("name")}
                      />
                      {form.formState.errors.name && (
                        <p className="text-sm text-red-600">
                          {form.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="isDefault" 
                        checked={form.watch("isDefault")}
                        onCheckedChange={(checked) => 
                          form.setValue("isDefault", checked as boolean)
                        }
                      />
                      <Label htmlFor="isDefault">
                        Set as default service option
                      </Label>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      className="bg-[#69ad4c] hover:bg-[#588f3f]"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Option"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !serviceOptions || serviceOptions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No service options found. Create one to get started.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                
                <TableBody>
                  {serviceOptions.map((option) => (
                    <TableRow key={option.id}>
                      <TableCell className="font-medium">
                        {option.name}
                      </TableCell>
                      
                      <TableCell>
                        {option.isDefault ? (
                          <Badge className="bg-green-100 text-green-800">
                            Default
                          </Badge>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {option.createdAt ? format(new Date(option.createdAt), "MMM d, yyyy") : "—"}
                      </TableCell>
                      
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(option)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-red-600"
                                onClick={() => setDeleteOption(option)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Service Option</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{deleteOption?.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={() => setDeleteOption(null)}>
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={handleDelete}
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Service Option Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={form.handleSubmit(onEditSubmit)}>
            <DialogHeader>
              <DialogTitle>Edit Service Option</DialogTitle>
              <DialogDescription>
                Update the service option details
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Service Name</Label>
                <Input 
                  id="edit-name" 
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="edit-isDefault" 
                  checked={form.watch("isDefault")}
                  onCheckedChange={(checked) => 
                    form.setValue("isDefault", checked as boolean)
                  }
                />
                <Label htmlFor="edit-isDefault">
                  Set as default service option
                </Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setIsEditOpen(false);
                  setCurrentOption(null);
                }}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#69ad4c] hover:bg-[#588f3f]"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default ServiceOptions;