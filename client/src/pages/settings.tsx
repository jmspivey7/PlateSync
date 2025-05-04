import { useState } from "react";
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
  UserCog,
  Users
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import ToastNotification from "@/components/ui/toast-notification";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import PageLayout from "@/components/layout/PageLayout";
import CsvImporter from "@/components/settings/CsvImporter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Define types
interface ServiceOption {
  id: number;
  name: string;
  isDefault: boolean;
  churchId: string;
  createdAt: string;
  updatedAt: string;
}

interface UserInfo {
  id: string;
  username: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: "ADMIN" | "USHER";
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
  
  // Fetch users (admin only)
  const { data: users = [] as UserInfo[], isLoading: isLoadingUsers } = useQuery<UserInfo[]>({
    queryKey: ['/api/users'],
    enabled: !!user && isAdmin,
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
  
  // Update user role mutation (admin only)
  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string, role: string }) => {
      const response = await apiRequest("PATCH", `/api/users/${id}/role`, { role });
      
      if (!response.ok) {
        throw new Error("Failed to update user role");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "User Role Updated",
        description: "The user's role has been updated successfully.",
        className: "bg-[#48BB78] text-white",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update user role: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  // Test SendGrid configuration
  const testSendGridConfiguration = async () => {
    setSendgridTestStatus('loading');
    setSendgridTestMessage(null);
    
    try {
      const response = await apiRequest('GET', '/api/test-sendgrid');
      const data = await response.json();
      
      if (response.ok) {
        setSendgridTestStatus('success');
        setSendgridTestMessage(data.message);
      } else {
        setSendgridTestStatus('error');
        setSendgridTestMessage(data.message || 'Failed to test SendGrid configuration');
      }
    } catch (error) {
      setSendgridTestStatus('error');
      setSendgridTestMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
    }
  };
  
  return (
    <PageLayout 
      title="Settings" 
      subtitle="Manage your church and notification settings"
      icon={<SettingsIcon className="h-6 w-6 text-gray-700" />}
    >
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Church Information</CardTitle>
            <CardDescription>
              Update your church's information displayed throughout the system
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
                
                <div className="flex justify-end">
                  <Button 
                    type="submit" 
                    className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
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
                <FormField
                  control={form.control}
                  name="emailNotificationsEnabled"
                  render={({ field }) => (
                    <FormItem className="border rounded-lg p-6 mb-4">
                      <div className="space-y-1">
                        <FormLabel className="text-lg font-medium">
                          Enable Email Notifications
                        </FormLabel>
                        <FormDescription className="text-gray-600">
                          Send email notifications to donors when donations are recorded
                        </FormDescription>
                      </div>
                      <div className="mt-8 flex justify-end">
                        <div className="flex items-center">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="enhanced-switch"
                            />
                          </FormControl>
                          <span className="ml-2 text-base font-bold">
                            {field.value ? 'ON' : 'OFF'}
                          </span>
                        </div>
                      </div>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end mt-4">
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
            
            <Separator className="my-6" />
            
            <div className="text-sm text-gray-600 mb-4">
              <p>Email notifications are sent via SendGrid when donations are recorded.</p>
              <p className="mt-2">Notification emails include:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Donation amount</li>
                <li>Donation date</li>
                <li>Donor information</li>
                <li>Your church name</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm mb-4">
              <p className="font-medium">Note about notifications</p>
              <p className="mt-1">
                Make sure your SendGrid API key is properly configured in the environment 
                variables for email notifications to work correctly.
              </p>
            </div>
            
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
        
        <Card className="md:col-span-2">
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
            
        <Card className="md:col-span-2">
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
        
        {/* User Role Management (Admin Only) */}
        {isAdmin && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center">
                <UserCog className="h-5 w-5 mr-2 text-[#69ad4c]" />
                <CardTitle>User Role Management</CardTitle>
              </div>
              <CardDescription>
                Manage access permissions for users in your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  <p>User roles determine what actions each staff member can perform in PlateSync.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li><strong>Admin:</strong> Full access to all features, including settings and user management</li>
                    <li><strong>Usher:</strong> Limited access for donation counting and basic features</li>
                  </ul>
                </div>
                
                {isLoadingUsers ? (
                  <div className="text-center p-6">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-[#69ad4c]" />
                    <p>Loading users...</p>
                  </div>
                ) : users.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Username</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Current Role</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userData) => (
                          <TableRow key={userData.id}>
                            <TableCell className="font-medium">{userData.username}</TableCell>
                            <TableCell>{userData.email || "-"}</TableCell>
                            <TableCell>
                              <Badge
                                className={userData.role === "ADMIN" ? "bg-[#69ad4c]" : "bg-blue-500"}
                              >
                                {userData.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {userData.id === user?.id ? (
                                <span className="text-sm text-gray-500 italic">Cannot change your own role</span>
                              ) : (
                                <Select
                                  defaultValue={userData.role}
                                  onValueChange={(value) => 
                                    updateUserRoleMutation.mutate({ id: userData.id, role: value })
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="USHER">Usher</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center p-6 border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p>No users found</p>
                  </div>
                )}
                
                <Alert className="bg-blue-50 border-blue-200 mt-4">
                  <AlertTitle className="text-blue-800">User Access Tip</AlertTitle>
                  <AlertDescription className="text-blue-700 text-sm">
                    For security reasons, there should always be at least one Admin user who can manage the system.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
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
