import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Mail, 
  Plus, 
  Save, 
  Settings as SettingsIcon,
  Trash2,
  Upload,
  ImageIcon,
  Edit,
  MailCheck,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ToastNotification from "@/components/ui/toast-notification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PageLayout from "@/components/layout/PageLayout";
import CsvImporter from "@/components/settings/CsvImporter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Define types
interface ServiceOption {
  id: number;
  name: string;
  isDefault: boolean;
  churchId: string;
  createdAt: string;
  updatedAt: string;
}

interface ReportRecipient {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  churchId: string;
  createdAt: string;
  updatedAt: string;
}


// Create a schema for settings form
const formSchema = z.object({
  churchName: z.string().min(1, "Church name is required"),
  emailNotificationsEnabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [sendgridTestStatus, setSendgridTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sendgridTestMessage, setSendgridTestMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  
  // Report recipient state
  const [isAddRecipientDialogOpen, setIsAddRecipientDialogOpen] = useState(false);
  const [isEditRecipientDialogOpen, setIsEditRecipientDialogOpen] = useState(false);
  const [recipientFirstName, setRecipientFirstName] = useState("");
  const [recipientLastName, setRecipientLastName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [editingRecipientId, setEditingRecipientId] = useState<number | null>(null);

  // Fetch report recipients
  const { data: reportRecipients = [], isLoading: isLoadingReportRecipients } = useQuery<ReportRecipient[]>({
    queryKey: ['/api/report-recipients'],
    enabled: !!user,
  });
  
  // Fetch service options
  const { data: serviceOptions = [] as ServiceOption[], isLoading: isLoadingServiceOptions } = useQuery<ServiceOption[]>({
    queryKey: ['/api/service-options'],
    enabled: !!user,
  });
  
  // React Hook Form setup
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      churchName: user?.churchName || "",
      emailNotificationsEnabled: user?.emailNotificationsEnabled !== false, // Default to true if not set
    },
  });
  
  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest("PATCH", "/api/settings", values);
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      setShowSuccessToast(true);
      
      toast({
        title: "Settings updated",
        description: "Your church settings have been saved successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update settings: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (values: FormValues) => {
    updateSettingsMutation.mutate(values);
  };
  
  // Service Option mutations
  const [newServiceOption, setNewServiceOption] = useState<string>("");
  const [serviceOptionEditId, setServiceOptionEditId] = useState<number | null>(null);
  const [serviceOptionEditName, setServiceOptionEditName] = useState<string>("");
  
  // Create service option
  const createServiceOptionMutation = useMutation({
    mutationFn: async (name: string) => {
      // Create a value based on the name (lowercase, replace spaces with hyphens)
      const value = name.toLowerCase().replace(/\s+/g, '-');
      
      const response = await apiRequest("POST", "/api/service-options", {
        name,
        value,
        isDefault: (serviceOptions as ServiceOption[]).length === 0 // Make it default if it's the first one
      });
      
      if (!response.ok) {
        throw new Error("Failed to create service option");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      setNewServiceOption("");
      toast({
        title: "Service Option Added",
        description: "The service option has been added successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create service option: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Update service option
  const updateServiceOptionMutation = useMutation({
    mutationFn: async ({ id, name, isDefault }: { id: number, name: string, isDefault?: boolean }) => {
      // Create a value based on the name (lowercase, replace spaces with hyphens)
      const value = name.toLowerCase().replace(/\s+/g, '-');
      
      const response = await apiRequest("PATCH", `/api/service-options/${id}`, {
        name,
        value,
        isDefault
      });
      
      if (!response.ok) {
        throw new Error("Failed to update service option");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      setServiceOptionEditId(null);
      setServiceOptionEditName("");
      toast({
        title: "Service Option Updated",
        description: "The service option has been updated successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update service option: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete service option
  const deleteServiceOptionMutation = useMutation<boolean, Error, number>({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/service-options/${id}`);
      
      if (!response.ok) {
        throw new Error("Failed to delete service option");
      }
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      toast({
        title: "Service Option Deleted",
        description: "The service option has been deleted successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete service option: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Set service option as default
  const setAsDefaultMutation = useMutation<any, Error, number>({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/service-options/${id}`, {
        isDefault: true
      });
      
      if (!response.ok) {
        throw new Error("Failed to set service option as default");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      toast({
        title: "Default Updated",
        description: "The default service option has been updated.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update default: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Initialize service options mutation
  const initializeServiceOptionsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/service-options/initialize", {});
      
      if (!response.ok) {
        throw new Error("Failed to initialize service options");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/service-options'] });
      toast({
        title: "Default Options Created",
        description: "Default service options have been initialized successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to initialize options: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Create report recipient
  const createReportRecipientMutation = useMutation({
    mutationFn: async (recipient: { firstName: string; lastName: string; email: string }) => {
      return apiRequest("/api/report-recipients", {
        method: "POST",
        body: recipient
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-recipients'] });
      setIsAddRecipientDialogOpen(false);
      setRecipientFirstName("");
      setRecipientLastName("");
      setRecipientEmail("");
      toast({
        title: "Recipient Added",
        description: "The report recipient has been added successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to add recipient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Update report recipient
  const updateReportRecipientMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { firstName: string; lastName: string; email: string } }) => {
      return apiRequest(`/api/report-recipients/${id}`, {
        method: "PATCH",
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-recipients'] });
      setIsEditRecipientDialogOpen(false);
      setEditingRecipientId(null);
      setRecipientFirstName("");
      setRecipientLastName("");
      setRecipientEmail("");
      toast({
        title: "Recipient Updated",
        description: "The report recipient has been updated successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update recipient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Delete report recipient
  const deleteReportRecipientMutation = useMutation<boolean, Error, number>({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/report-recipients/${id}`, {
        method: "DELETE",
        returnRaw: true
      });
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-recipients'] });
      toast({
        title: "Recipient Deleted",
        description: "The report recipient has been deleted successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete recipient: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Helper functions for recipient management
  const openAddRecipientDialog = () => {
    setRecipientFirstName("");
    setRecipientLastName("");
    setRecipientEmail("");
    setIsAddRecipientDialogOpen(true);
  };
  
  const openEditRecipientDialog = (recipient: ReportRecipient) => {
    setEditingRecipientId(recipient.id);
    setRecipientFirstName(recipient.firstName);
    setRecipientLastName(recipient.lastName);
    setRecipientEmail(recipient.email);
    setIsEditRecipientDialogOpen(true);
  };
  
  const handleAddRecipient = () => {
    if (!recipientFirstName || !recipientLastName || !recipientEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all recipient fields.",
        variant: "destructive",
      });
      return;
    }
    
    createReportRecipientMutation.mutate({
      firstName: recipientFirstName,
      lastName: recipientLastName,
      email: recipientEmail
    });
  };
  
  const handleUpdateRecipient = () => {
    if (!editingRecipientId || !recipientFirstName || !recipientLastName || !recipientEmail) {
      toast({
        title: "Validation Error",
        description: "Please fill in all recipient fields.",
        variant: "destructive",
      });
      return;
    }
    
    updateReportRecipientMutation.mutate({
      id: editingRecipientId,
      data: {
        firstName: recipientFirstName,
        lastName: recipientLastName,
        email: recipientEmail
      }
    });
  };

  // Test SendGrid configuration
  const testSendGridConfiguration = async () => {
    setSendgridTestStatus('loading');
    setSendgridTestMessage(null);
    
    try {
      const data = await apiRequest('/api/test-sendgrid', {
        method: 'GET'
      });
      
      setSendgridTestStatus('success');
      setSendgridTestMessage(data.message);
    } catch (error) {
      setSendgridTestStatus('error');
      setSendgridTestMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };
  
  return (
    <PageLayout 
      title="Settings" 
      subtitle="Manage your church and notification settings"
      icon={<SettingsIcon className="h-6 w-6 text-[#69ad4c]" />}
    >
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Church Information</CardTitle>
            <CardDescription>
              Update your church's information and logo displayed throughout the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="churchName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Church Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="First Baptist Church" />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on receipts and throughout the application
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center">
                    <FormLabel>Church Logo</FormLabel>
                    <span className="text-sm text-gray-500">Recommended size: 400x200px</span>
                  </div>
                  <FormDescription className="mt-0">
                    Your logo will appear in the navigation header and on receipts
                  </FormDescription>
                  
                  {/* Logo Display Section */}
                  <div className="border rounded-lg p-6 flex flex-col items-center">
                    {user?.churchLogoUrl ? (
                      <div className="mb-4 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-lg border overflow-hidden mb-2 flex items-center justify-center bg-gray-50">
                          <img 
                            src={user.churchLogoUrl} 
                            alt={`${user.churchName || 'Church'} logo`} 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-500">Current logo</p>
                      </div>
                    ) : (
                      <div className="mb-4 flex flex-col items-center">
                        <div className="w-32 h-32 rounded-lg border flex items-center justify-center bg-gray-50">
                          <ImageIcon className="h-16 w-16 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 mt-2">No logo uploaded</p>
                      </div>
                    )}
                    
                    {/* Hidden file input */}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="hidden" 
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        // Create FormData for upload
                        const formData = new FormData();
                        formData.append('logo', file);
                        
                        try {
                          setLogoUploading(true);
                          
                          const response = await fetch('/api/settings/logo', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          if (!response.ok) {
                            throw new Error('Failed to upload logo');
                          }
                          
                          // Refresh user data to get updated logo URL
                          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                          
                          toast({
                            title: "Logo updated",
                            description: "Your church logo has been updated successfully.",
                            className: "bg-[#48BB78] text-white",
                          });
                        } catch (error) {
                          toast({
                            title: "Upload failed",
                            description: `Failed to upload logo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            variant: "destructive",
                          });
                        } finally {
                          setLogoUploading(false);
                          // Clear the file input
                          if (fileInputRef.current) {
                            fileInputRef.current.value = '';
                          }
                        }
                      }}
                    />
                    
                    {/* Logo Action Buttons */}
                    <div className="flex space-x-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="flex items-center"
                      >
                        {logoUploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {user?.churchLogoUrl ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      
                      {user?.churchLogoUrl && (
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={async () => {
                            try {
                              setLogoRemoving(true);
                              
                              const response = await fetch('/api/settings/logo', {
                                method: 'DELETE',
                              });
                              
                              if (!response.ok) {
                                throw new Error('Failed to remove logo');
                              }
                              
                              // Refresh user data to remove logo URL
                              queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                              
                              toast({
                                title: "Logo removed",
                                description: "Your church logo has been removed.",
                                className: "bg-[#48BB78] text-white",
                              });
                            } catch (error) {
                              toast({
                                title: "Remove failed",
                                description: `Failed to remove logo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                                variant: "destructive",
                              });
                            } finally {
                              setLogoRemoving(false);
                            }
                          }}
                          disabled={logoRemoving}
                          className="flex items-center"
                        >
                          {logoRemoving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end mt-6">
                  <Button 
                    type="submit" 
                    className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                    disabled={updateSettingsMutation.isPending}
                  >
                    {updateSettingsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Configure how PlateSync sends email notifications to donors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="border rounded-lg p-6 mb-4">
                  <div className="space-y-1">
                    <div className="text-lg font-medium">
                      Enable Email Notifications
                    </div>
                    <div className="text-gray-600">
                      Send email notifications to donors when donations are recorded
                    </div>
                  </div>
                  <div className="mt-8 flex justify-end">
                    <div className="flex items-center">
                      <Switch
                        checked={form.watch("emailNotificationsEnabled")}
                        onCheckedChange={(checked) => {
                          // Update the form value
                          form.setValue("emailNotificationsEnabled", checked);
                          
                          // Save the change immediately
                          updateSettingsMutation.mutate({
                            churchName: form.getValues("churchName"),
                            emailNotificationsEnabled: checked
                          }, {
                            onSuccess: () => {
                              toast({
                                title: "Notification Setting Updated",
                                description: `Email notifications have been turned ${checked ? 'ON' : 'OFF'}.`,
                                className: "bg-[#69ad4c] text-white",
                              });
                            }
                          });
                        }}
                        className="enhanced-switch"
                      />
                      <span className="ml-2 text-base font-bold">
                        {form.watch("emailNotificationsEnabled") ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
            
            <Separator className="my-6" />
            
            {sendgridTestStatus === 'success' && (
              <Alert className="mb-4 bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">SendGrid is configured correctly</AlertTitle>
                <AlertDescription className="text-green-700 text-sm">
                  {sendgridTestMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {sendgridTestStatus === 'error' && (
              <Alert className="mb-4 bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800">SendGrid configuration issue</AlertTitle>
                <AlertDescription className="text-red-700 text-sm">
                  {sendgridTestMessage || 'There was a problem testing your SendGrid configuration.'}
                </AlertDescription>
              </Alert>
            )}
            
            <Button
              onClick={testSendGridConfiguration}
              disabled={sendgridTestStatus === 'loading'}
              variant="outline"
              className="w-full"
            >
              {sendgridTestStatus === 'loading' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing SendGrid Configuration...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Test SendGrid Configuration
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Service Options</CardTitle>
            <CardDescription>
              Manage service options for donation counts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm text-gray-600 mb-2">
                <p>Service options are used when creating a new count. They represent different service types such as Sunday morning, Sunday evening, Wednesday night, etc.</p>
              </div>
              
              {/* Add new service option */}
              <div className="flex items-center space-x-2">
                <Input
                  id="new-service-option-input"
                  value={newServiceOption}
                  onChange={(e) => setNewServiceOption(e.target.value)}
                  placeholder="Add a new service option..."
                  className="flex-1"
                />
                <Button
                  onClick={() => createServiceOptionMutation.mutate(newServiceOption)}
                  disabled={!newServiceOption.trim() || createServiceOptionMutation.isPending}
                  className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                >
                  {createServiceOptionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Service options list as tags */}
              <div className="rounded-md">
                {isLoadingServiceOptions ? (
                  <div className="p-4 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    <p className="text-sm text-gray-500 mt-2">Loading service options...</p>
                  </div>
                ) : serviceOptions.length === 0 ? (
                  <div className="p-6 text-center border rounded-md">
                    <p className="text-gray-500">No service options added yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add your first service option using the field above
                    </p>
                    <Button 
                      onClick={() => initializeServiceOptionsMutation.mutate()}
                      disabled={initializeServiceOptionsMutation.isPending}
                      className="mt-4 bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                    >
                      {initializeServiceOptionsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        "Initialize Default Options"
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Tag editing UI */}
                    {serviceOptionEditId !== null && (
                      <div className="border rounded-md p-4 bg-gray-50">
                        <h4 className="font-medium text-sm mb-2">Edit Service Option</h4>
                        <div className="flex items-center space-x-2">
                          <Input
                            value={serviceOptionEditName}
                            onChange={(e) => setServiceOptionEditName(e.target.value)}
                            className="flex-1"
                            autoFocus
                            placeholder="Service option name"
                          />
                          <Button
                            onClick={() => updateServiceOptionMutation.mutate({
                              id: serviceOptionEditId,
                              name: serviceOptionEditName
                            })}
                            disabled={!serviceOptionEditName.trim() || updateServiceOptionMutation.isPending}
                            size="sm"
                            className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                          >
                            {updateServiceOptionMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Save"
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              setServiceOptionEditId(null);
                              setServiceOptionEditName("");
                            }}
                            size="sm"
                            variant="outline"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Service options as tags */}
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions.map((option: ServiceOption) => (
                        <div 
                          key={option.id} 
                          className={`group inline-flex items-center rounded-full border px-2.5 py-1.5 text-sm font-medium
                            ${option.isDefault 
                              ? 'border-green-600 bg-green-100 text-green-800' 
                              : 'border-gray-300 bg-gray-100 text-gray-900'
                            } transition-colors hover:bg-gray-200`}
                        >
                          <span className="mr-1">{option.name}</span>
                          
                          <div className="ml-1 flex items-center gap-1">
                            {!option.isDefault && (
                              <Button
                                onClick={() => setAsDefaultMutation.mutate(option.id)}
                                disabled={setAsDefaultMutation.isPending}
                                size="icon"
                                variant="ghost"
                                className="h-4 w-4 p-0 opacity-50 hover:opacity-100 hover:text-green-700"
                                title="Set as default"
                              >
                                {setAsDefaultMutation.isPending && setAsDefaultMutation.variables === option.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <SettingsIcon className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => {
                                setServiceOptionEditId(option.id);
                                setServiceOptionEditName(option.name);
                              }}
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0 opacity-50 hover:opacity-100 hover:text-blue-700"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </Button>
                            
                            <Button
                              onClick={() => deleteServiceOptionMutation.mutate(option.id)}
                              disabled={deleteServiceOptionMutation.isPending || option.isDefault}
                              size="icon"
                              variant="ghost"
                              className="h-4 w-4 p-0 opacity-50 hover:opacity-100 hover:text-red-700"
                              title={option.isDefault ? "Cannot delete default option" : "Delete"}
                            >
                              {deleteServiceOptionMutation.isPending && deleteServiceOptionMutation.variables === option.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Add new tag inline */}
                      <div className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2.5 py-1.5 text-sm hover:border-gray-400 cursor-pointer"
                        onClick={() => {
                          // Focus the input field
                          const inputElement = document.getElementById('new-service-option-input');
                          if (inputElement) {
                            inputElement.focus();
                          }
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span className="text-gray-600">Add option</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                * The default service option will be pre-selected when creating a new count
              </p>
            </div>
          </CardContent>
        </Card>
            
        <Card>
          <CardHeader>
            <CardTitle>Import Members</CardTitle>
            <CardDescription>
              Import member data from CSV files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CsvImporter />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Count Report Notifications</CardTitle>
            <CardDescription>
              Configure recipients for count report notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingReportRecipients ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <div className="text-sm font-medium">Recipients</div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={openAddRecipientDialog}
                      className="bg-[#69ad4c] hover:bg-[#5c9b43] text-white"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Recipient
                    </Button>
                  </div>
                  
                  {reportRecipients.length === 0 ? (
                    <div className="text-center py-6 border rounded-md bg-muted/10">
                      <MailCheck className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No recipients configured</p>
                      <p className="text-xs text-gray-400 mt-1">Add recipients to receive count reports</p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {reportRecipients.map((recipient) => (
                            <TableRow key={recipient.id}>
                              <TableCell>{recipient.firstName} {recipient.lastName}</TableCell>
                              <TableCell>{recipient.email}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditRecipientDialog(recipient)}
                                    title="Edit"
                                  >
                                    <Edit className="h-4 w-4 text-gray-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => deleteReportRecipientMutation.mutate(recipient.id)}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-4 w-4 text-gray-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-2">
                    These recipients will receive an email notification when a count is closed
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
      
      {/* Add Recipient Dialog */}
      <Dialog open={isAddRecipientDialogOpen} onOpenChange={setIsAddRecipientDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Report Recipient</DialogTitle>
            <DialogDescription>
              Add a new recipient for count report notifications
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">First Name</div>
              <Input
                value={recipientFirstName}
                onChange={(e) => setRecipientFirstName(e.target.value)}
                className="col-span-3"
                placeholder="John"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Last Name</div>
              <Input
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                className="col-span-3"
                placeholder="Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Email</div>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="col-span-3"
                placeholder="john.doe@example.com"
                type="email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsAddRecipientDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-[#69ad4c] hover:bg-[#5c9b43] text-white"
              onClick={handleAddRecipient}
              disabled={createReportRecipientMutation.isPending}
            >
              {createReportRecipientMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Recipient Dialog */}
      <Dialog open={isEditRecipientDialogOpen} onOpenChange={setIsEditRecipientDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Report Recipient</DialogTitle>
            <DialogDescription>
              Update recipient information for count report notifications
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">First Name</div>
              <Input
                value={recipientFirstName}
                onChange={(e) => setRecipientFirstName(e.target.value)}
                className="col-span-3"
                placeholder="John"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Last Name</div>
              <Input
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                className="col-span-3"
                placeholder="Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Email</div>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="col-span-3"
                placeholder="john.doe@example.com"
                type="email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsEditRecipientDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              className="bg-[#69ad4c] hover:bg-[#5c9b43] text-white"
              onClick={handleUpdateRecipient}
              disabled={updateReportRecipientMutation.isPending}
            >
              {updateReportRecipientMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {showSuccessToast && (
        <ToastNotification
          title="Settings Saved"
          message="Your church settings have been updated successfully."
          variant="success"
          duration={3000}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </PageLayout>
  );
};

export default Settings;
