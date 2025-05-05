import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PageLayout from "@/components/layout/PageLayout";
import CsvImporter from "@/components/settings/CsvImporter";
import EmailTemplates from "@/components/settings/EmailTemplates";
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
  churchName: z.string()
    .min(1, "Church name is required")
    .max(35, "Church name cannot exceed 35 characters"),
  emailNotificationsEnabled: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAdmin } = useAuth();
  // Removed showSuccessToast state to eliminate duplicate notifications
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
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values)
      });
      
      if (!response.ok) {
        throw new Error("Failed to update settings");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      
      // Removed duplicate toast notification
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
      
      return await apiRequest("/api/service-options", {
        method: "POST",
        body: {
          name,
          value,
          isDefault: (serviceOptions as ServiceOption[]).length === 0 // Make it default if it's the first one
        }
      });
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
      
      return await apiRequest(`/api/service-options/${id}`, {
        method: "PATCH",
        body: {
          name,
          value,
          isDefault
        }
      });
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
      await apiRequest(`/api/service-options/${id}`, "DELETE");
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
        className: "bg-white border-red-600",
      });
    }
  });
  
  // Set service option as default
  const setAsDefaultMutation = useMutation<any, Error, number>({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/service-options/${id}`, {
        method: "PATCH",
        body: {
          isDefault: true
        }
      });
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
      return await apiRequest("/api/service-options/initialize", {
        method: "POST"
      });
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
        className: "bg-white border-red-600",
      });
    }
  });
  
  // Delete report recipient
  const deleteReportRecipientMutation = useMutation<boolean, Error, number>({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/report-recipients/${id}`, "DELETE");
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
        className: "bg-white border-red-600",
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
        className: "bg-white border-red-600",
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
        className: "bg-white border-red-600",
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
    try {
      // Show loading toast
      toast({
        title: "Testing SendGrid...",
        description: "Please wait while we verify your SendGrid configuration.",
      });
      
      const data = await apiRequest('/api/test-sendgrid', 'GET');
      
      // Show success toast instead of alert
      toast({
        title: "SendGrid is configured correctly",
        description: "SendGrid configuration is working correctly! Your account is ready to send donation notifications.",
        className: "bg-[#69ad4c] text-white",
      });
    } catch (error) {
      // Show error toast
      toast({
        title: "SendGrid configuration issue",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
        className: "bg-white border-red-600",
      });
    }
  };
  
  return (
    <PageLayout 
      title="Settings" 
      subtitle="Manage church details and configurations."
      icon={<SettingsIcon className="h-6 w-6 text-[#69ad4c]" />}
    >
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Church Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="churchName"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel><strong>Church Name:</strong></FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="First Baptist Church" 
                          maxLength={35} 
                          className="border-gray-400"
                          onChange={(e) => {
                            // Limit to 35 characters
                            if (e.target.value.length <= 35) {
                              field.onChange(e);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription className="flex justify-between">
                        <span></span>
                        <span className="text-gray-600 text-xs">
                          {form.watch("churchName")?.length || 0} of 35 Characters Allowed
                        </span>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center">
                    <FormLabel><strong>Church Logo:</strong></FormLabel>
                  </div>
                  
                  {/* Logo Display Section */}
                  <div className="border border-gray-400 rounded-lg p-4 flex flex-col items-center">
                    {user?.churchLogoUrl ? (
                      <div className="mb-3 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-lg border border-gray-400 overflow-hidden mb-1 flex items-center justify-center bg-gray-50">
                          <img 
                            src={user.churchLogoUrl} 
                            alt={`${user.churchName || 'Church'} logo`} 
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                        <p className="text-sm text-gray-500">Current logo</p>
                      </div>
                    ) : (
                      <div className="mb-3 flex flex-col items-center">
                        <div className="w-28 h-28 rounded-lg border border-gray-400 flex items-center justify-center bg-gray-50">
                          <ImageIcon className="h-14 w-14 text-gray-300" />
                        </div>
                        <p className="text-sm text-gray-500 mt-1">No logo uploaded</p>
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
                            className: "bg-white border-red-600",
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
                    <div className="flex space-x-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={logoUploading}
                        className="flex items-center border-gray-400"
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
                                className: "bg-white border-red-600",
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
                  <div className="flex justify-end mt-1">
                    <span className="text-xs text-gray-600">Recommended Size: 400x200px</span>
                  </div>
                </div>
                
                <div className="flex justify-center mt-4">
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
          <CardHeader className="pb-3">
            <CardTitle>Email Notifications</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm text-gray-600">
                        Email notifications can be sent to donors to confirm receipt of their donation, and to individuals specified to receive Count summaries. Click here to test the <button 
                          onClick={testSendGridConfiguration} 
                          disabled={sendgridTestStatus === 'loading'}
                          className="text-[#69ad4c] hover:underline font-medium focus:outline-none"
                        >
                          SendGrid
                        </button> configuration.
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Switch
                        checked={form.watch("emailNotificationsEnabled")}
                        onCheckedChange={(checked) => {
                          // Update the form value
                          form.setValue("emailNotificationsEnabled", checked);
                          
                          // Save the change immediately
                          fetch("/api/settings", {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              churchName: form.getValues("churchName"),
                              emailNotificationsEnabled: checked
                            })
                          })
                          .then(response => {
                            if (!response.ok) throw new Error("Failed to update settings");
                            return response.json();
                          })
                          .then(() => {
                            queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                            toast({
                              title: "Notification Setting Updated",
                              description: `Email notifications have been turned ${checked ? 'ON' : 'OFF'}.`,
                              className: "bg-[#69ad4c] text-white",
                            });
                          })
                          .catch(error => {
                            toast({
                              title: "Error",
                              description: `Failed to update setting: ${error.message}`,
                              variant: "destructive",
                              className: "bg-white border-red-600",
                            });
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
          </CardContent>
        </Card>
        
        {/* Email Templates Section */}
        <EmailTemplates />
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Service Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                <p>Service options are used when creating a new count. They represent different service types such as Sunday morning, Sunday evening, Wednesday night, etc.</p>
              </div>
              
              {/* Add new service option */}
              <div className="flex items-center space-x-2">
                <Input
                  id="new-service-option-input"
                  value={newServiceOption}
                  onChange={(e) => setNewServiceOption(e.target.value)}
                  placeholder="Add a new service option..."
                  className="flex-1 border-gray-400"
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
                    
                    {/* Service options as tags - sort to show default first */}
                    <div className="flex flex-wrap gap-2">
                      {serviceOptions
                        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) // Sort to show default option first
                        .map((option: ServiceOption) => (
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
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                      
                      {/* Removed "Add option" button as it was confusing - input field with add button is sufficient */}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Removed explanatory text about default service option */}
            </div>
          </CardContent>
        </Card>
            
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Import Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4">
            <div className="mb-2">
              <p className="text-sm text-gray-600">
                Upload a CSV file to import members in bulk to the database. Subsequent imports will overwrite the member list. To see a list of the most recent member import <Link href="/members" className="text-[#69ad4c] hover:underline font-medium">click here</Link>.
              </p>
            </div>
            <CsvImporter />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Count Report Notifications</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              {isLoadingReportRecipients ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <div className="text-sm text-gray-600">
                      Email notifications can be sent to individuals specified to receive Count summaries. Click here to test the <button 
                        onClick={() => {
                          fetch('/api/test-count-report')
                            .then(response => response.json())
                            .then(data => {
                              if (data.success) {
                                toast({
                                  title: "Test Email Sent",
                                  description: data.message,
                                  className: "bg-[#69ad4c] text-white",
                                });
                              } else {
                                toast({
                                  title: "Test Failed",
                                  description: data.message,
                                  variant: "destructive",
                                  className: "bg-white border-red-600",
                                });
                              }
                            })
                            .catch(error => {
                              toast({
                                title: "Error",
                                description: "Failed to send test email. Make sure you have report recipients configured.",
                                variant: "destructive",
                                className: "bg-white border-red-600",
                              });
                            });
                        }}
                        className="text-[#69ad4c] hover:underline font-medium focus:outline-none"
                      >
                        Count Report email
                      </button>.
                    </div>
                  </div>
                  
                  {reportRecipients.length === 0 ? (
                    <div>
                      <div className="text-center py-4 border rounded-md bg-muted/10">
                        <MailCheck className="h-10 w-10 mx-auto text-gray-400 mb-1" />
                        <p className="text-sm text-gray-500">No recipients configured</p>
                        <p className="text-xs text-gray-400 mt-0.5">Add recipients to receive count reports</p>
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                        <Button
                          type="button"
                          onClick={openAddRecipientDialog}
                          className="bg-[#69ad4c] hover:bg-[#5c9b43] text-white"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Recipient
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-400">
                              <th className="text-left py-2 font-bold">Name</th>
                              <th className="text-left py-2 font-bold">Email</th>
                              <th className="w-[100px] text-right py-2 font-bold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportRecipients.map((recipient) => (
                              <tr key={recipient.id} className="hover:bg-gray-50">
                                <td className="py-2 text-sm">{recipient.firstName} {recipient.lastName}</td>
                                <td className="py-2 text-sm">{recipient.email}</td>
                                <td className="text-right py-2">
                                  <div className="flex justify-end space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openEditRecipientDialog(recipient)}
                                      title="Edit"
                                      className="h-7 w-7"
                                    >
                                      <Edit className="h-4 w-4 text-gray-500" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => deleteReportRecipientMutation.mutate(recipient.id)}
                                      title="Delete"
                                      className="h-7 w-7"
                                    >
                                      <Trash2 className="h-4 w-4 text-gray-500" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      <div className="mt-4 flex justify-center">
                        <Button
                          type="button"
                          onClick={openAddRecipientDialog}
                          className="bg-[#69ad4c] hover:bg-[#5c9b43] text-white"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Recipient
                        </Button>
                      </div>
                    </div>
                  )}
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
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Last Name</div>
              <Input
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Email</div>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="col-span-3"
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
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Last Name</div>
              <Input
                value={recipientLastName}
                onChange={(e) => setRecipientLastName(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-sm font-medium text-right">Email</div>
              <Input
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="col-span-3"
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
      
      {/* Removed competing toast notification */}
    </PageLayout>
  );
};

export default Settings;
