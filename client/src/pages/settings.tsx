import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
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
import PlanningCenterIntegration from "@/components/settings/PlanningCenterIntegration";
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
  const { user, isAdmin, isAccountOwner } = useAuth();
  const search = useSearch();
  // Removed showSuccessToast state to eliminate duplicate notifications
  const [sendgridTestStatus, setSendgridTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [sendgridTestMessage, setSendgridTestMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [claimingTokens, setClaimingTokens] = useState(false);
  
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
  
  // Planning Center token claim mutation
  const claimTokensMutation = useMutation({
    mutationFn: async ({ tempKey, churchId }: { tempKey: string, churchId?: string }) => {
      setClaimingTokens(true);
      
      // Check if this is a mobile device - try multiple detection methods
      const isMobileSession = sessionStorage.getItem('planningCenterMobileDevice') === 'true';
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobile = isMobileSession || isMobileUserAgent;
      
      console.log("Claiming Planning Center token", {
        tempKey: tempKey.substring(0, 6) + '...',
        hasChurchId: !!churchId,
        churchId: churchId ? churchId.substring(0, 6) + '...' : 'not provided',
        deviceType: isMobile ? 'mobile' : 'desktop',
        detectionSource: isMobileSession ? 'session' : (isMobileUserAgent ? 'user-agent' : 'none')
      });
      
      // Add additional metadata to API calls for mobile
      const deviceMetadata = {
        deviceType: isMobile ? 'mobile' : 'desktop',
        viewportWidth: window.innerWidth,
        userAgent: navigator.userAgent.substring(0, 50) + '...',
        timestamp: Date.now()
      };
      
      console.log("Device metadata for token claim:", deviceMetadata);
      
      // Add retry logic directly in the mutation function to improve reliability
      let retries = 0;
      const maxRetries = isMobile ? 5 : 3; // More retries for mobile devices
      let lastError: Error | null = null;
      
      while (retries < maxRetries) {
        try {
          // Add a small delay between retries to allow server to stabilize
          if (retries > 0) {
            console.log(`Retry attempt ${retries} for claiming token...`);
            // Progressive backoff with longer delays for mobile
            const backoffTime = isMobile ? (1500 * retries) : (1000 * retries);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          }
          
          // Build the URL with churchId parameter if available
          let url = `/api/planning-center/claim-temp-tokens/${tempKey}`;
          
          // Add params as query string parameters
          const params = new URLSearchParams();
          
          if (churchId) {
            params.append('churchId', churchId);
          }
          
          // Add mobile flag if detected
          if (isMobile) {
            params.append('deviceType', 'mobile');
          }
          
          // Add timestamp for cache-busting
          params.append('t', Date.now().toString());
          
          // Combine URL with params
          const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;
          
          console.log("Making token claim request to:", fullUrl);
          const response = await apiRequest(fullUrl, 'GET');
          console.log("Token claim API response:", response);
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          console.error(`Token claim attempt ${retries + 1} failed:`, lastError);
          retries++;
          
          // If we've exhausted all retries, throw the last error
          if (retries >= maxRetries) {
            throw lastError;
          }
        }
      }
      
      // This should never be reached, but TypeScript needs a return value
      throw lastError || new Error("Failed to claim token after multiple attempts");
    },
    onSuccess: (response) => {
      console.log("Planning Center token claim successful, refreshing status...");
      
      // Check if this is a mobile device for special handling
      const isMobileDevice = sessionStorage.getItem('planningCenterMobileDevice') === 'true';
      
      // For mobile devices, we need to show more prominent and longer-lasting notifications
      if (isMobileDevice) {
        console.log("Using mobile-specific success handling");
        toast({
          title: "Planning Center Link Started",
          description: "Successfully claimed tokens. Setting up connection...",
          className: "bg-[#69ad4c] text-white",
          duration: 5000, // Longer duration for mobile
        });
      } else {
        toast({
          title: "Tokens Claimed",
          description: "Successfully claimed Planning Center tokens. Verifying connection...",
          className: "bg-[#69ad4c] text-white",
        });
      }
      
      // First invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
      
      // Allow a small delay for the server to process the token claim
      // Use longer delay for mobile devices
      const verificationDelay = isMobileDevice ? 2500 : 1000;
      
      setTimeout(() => {
        // Then explicitly refetch the current status
        queryClient.fetchQuery({ queryKey: ['/api/planning-center/status'] })
          .then((newStatus: any) => {
            console.log("New Planning Center status after token claim:", newStatus);
            if (newStatus?.connected) {
              // Special handling for mobile success
              if (isMobileDevice) {
                toast({
                  title: "Planning Center Connected! 🎉",
                  description: "Your Planning Center account is now linked with PlateSync.",
                  className: "bg-[#69ad4c] text-white font-medium",
                  duration: 7000, // Even longer for success confirmation on mobile
                });
              } else {
                toast({
                  title: "Connection Successful",
                  description: "Successfully connected to Planning Center!",
                  className: "bg-[#69ad4c] text-white",
                });
              }
            } else {
              // If still not connected, show a warning with more specific info
              toast({
                title: "Connection Partial",
                description: newStatus?.message || 
                  "Tokens were claimed but connection status is still pending. Try reloading the page or clicking 'Clear Connection' and trying again.",
                variant: "default",
              });
            }
          })
          .catch(err => {
            console.error("Failed to refresh Planning Center status:", err);
            toast({
              title: "Status Check Failed",
              description: "Could not verify Planning Center connection status. Please reload the page to check if the connection was successful.",
              variant: "destructive",
            });
          })
          .finally(() => {
            setClaimingTokens(false);
          });
      }, verificationDelay);
      
      // Remove the tempKey from the URL to clean it up
      window.history.replaceState({}, document.title, window.location.pathname);
    },
    onError: (error) => {
      console.error("Planning Center token claim failed:", error);
      
      // Check if this is a mobile device for special handling
      const isMobileDevice = sessionStorage.getItem('planningCenterMobileDevice') === 'true';
      const deviceType = isMobileDevice ? 'mobile' : 'desktop';
      
      console.log(`Planning Center token claim failed on ${deviceType} device:`, error);
      
      // Detailed error message based on the specific error
      let errorMessage = "Failed to connect to Planning Center.";
      let errorTitle = "Connection Failed";
      
      if (error instanceof Error) {
        // Parse error details if available in the message
        if (error.message.includes("Temporary tokens not found")) {
          errorMessage = "The connection tokens have expired. Please clear the connection and try again.";
        } else if (error.message.includes("Authentication required")) {
          errorMessage = "You need to be logged in to connect to Planning Center. Please refresh the page and try again.";
        } else if (error.message.includes("timeout") || error.message.includes("network")) {
          errorMessage = "Network issue occurred. Make sure you have a stable internet connection and try again.";
        } else {
          // Include device type in detailed error messages
          errorMessage = `${error.message}. Please try again.`;
        }
      }
      
      // For mobile devices, add extra help text
      if (isMobileDevice) {
        errorTitle = "Mobile Connection Failed";
        errorMessage += " Ensure you're using the same device throughout the process.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: isMobileDevice ? 8000 : 5000, // Longer duration for mobile errors
      });
      
      // For mobile devices, try to clear session/local storage to prevent issues with future attempts
      if (isMobileDevice) {
        try {
          // Clear all Planning Center related items from storage
          sessionStorage.removeItem('planningCenterDeviceType');
          sessionStorage.removeItem('planningCenterMobileDevice');
          localStorage.removeItem('planningCenterChurchId');
          sessionStorage.removeItem('planningCenterChurchId');
          localStorage.removeItem('planningCenterAuthTimestamp');
          console.log('Cleared all Planning Center storage items for clean slate');
        } catch (e) {
          console.error('Error clearing Planning Center storage during error recovery:', e);
        }
      }
      
      setClaimingTokens(false);
    },
    retry: 0, // We handle retries manually in the mutation function
  });
  
  // Check for temp tokens in URL
  useEffect(() => {
    // Safeguard against null search param
    if (!search) return;
    
    const params = new URLSearchParams(search);
    
    // Check for Planning Center errors first
    const planningCenterError = params.get('planningCenterError');
    if (planningCenterError) {
      const errorDescription = params.get('error_description') || 'Unknown error occurred';
      const errorSource = params.get('mobile') === 'true' ? 'mobile device' : 'browser';
      console.error(`Planning Center error detected (${errorSource}):`, planningCenterError, errorDescription);
      
      // Clean URL parameters immediately to prevent showing the error again on refresh
      try {
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error("Failed to clean up URL error parameters:", e);
      }
      
      // Show more detailed error toast
      toast({
        title: "Planning Center Connection Failed",
        description: `Error: ${errorDescription}. Please try again or contact support if the issue persists.`,
        variant: "destructive",
        duration: 6000, // Longer duration for errors
      });
      
      return; // Exit early on error
    }
    
    // Check if there's a token in the URL query string
    // The format is ?pc_temp_key=<key> possibly with &churchId=<churchId>
    if (search.includes('pc_temp_key=')) {
      const tempKey = params.get('pc_temp_key');
      
      // Try to get churchId from URL parameter or localStorage (set by the redirect page)
      const urlChurchId = params.get('churchId');
      const storedChurchId = localStorage.getItem('planningCenterChurchId');
      const churchId = urlChurchId || storedChurchId || undefined;
      
      // Check if this is from a mobile device
      const isMobileRedirect = params.get('mobile') === 'true';
      
      // Get additional debugging parameters
      const timeParam = params.get('t') || 'none';
      const tsParam = params.get('ts') || 'none';
      
      // Log details for troubleshooting
      console.log('Planning Center redirect details:', {
        hasToken: !!tempKey,
        churchIdSource: urlChurchId ? 'URL' : (storedChurchId ? 'localStorage' : 'none'),
        isMobile: isMobileRedirect,
        timestamp: timeParam,
        extraTimestamp: tsParam
      });
      
      if (tempKey && !claimingTokens && !claimTokensMutation.isPending) {
        console.log("Found temporary Planning Center token key in URL:", tempKey);
        if (churchId) {
          console.log("Using churchId for token claim:", churchId, 
            `(source: ${urlChurchId ? 'URL parameter' : 'localStorage'})`);
        } else {
          console.log("No churchId found for token claim, will use server defaults");
        }
        
        // Record that this was from a mobile device if applicable
        if (isMobileRedirect) {
          console.log("Detected mobile device redirection");
          // Store this in sessionStorage to help with device-specific handling later
          sessionStorage.setItem('planningCenterMobileDevice', 'true');
        }
        
        // Show a toast to inform the user
        toast({
          title: "Processing Connection",
          description: "Completing Planning Center connection...",
          // On mobile, make the toast display longer
          duration: isMobileRedirect ? 5000 : 3000,
        });
        
        // Set claiming tokens state to prevent duplicate claims
        setClaimingTokens(true);
        
        // Short delay to ensure the page is fully loaded and auth is established
        // Use a longer delay for mobile devices
        const delayTime = isMobileRedirect ? 1500 : 1000;
        
        setTimeout(() => {
          console.log("Claiming tokens now...");
          
          try {
            // Call the claim token mutation with or without churchId
            if (churchId) {
              claimTokensMutation.mutate({
                tempKey,
                churchId
              });
            } else {
              claimTokensMutation.mutate({
                tempKey
              });
            }
            
            // Clear the stored churchId from localStorage after using it
            if (storedChurchId) {
              localStorage.removeItem('planningCenterChurchId');
              console.log("Cleared planningCenterChurchId from localStorage");
            }
          } catch (error) {
            console.error("Error initiating token claim:", error);
            setClaimingTokens(false);
            toast({
              title: "Connection Error",
              description: "Failed to process Planning Center connection. Please try again.",
              variant: "destructive",
            });
          }
        }, delayTime);
        
        // Clean up URL parameters more aggressively to prevent issues with browser back/forward
        try {
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (e) {
          console.error("Failed to clean up URL parameters:", e);
        }
      }
    }
  }, [search, claimingTokens, claimTokensMutation.isPending, toast]);
  
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
        {/* Account Owner Information Card */}
        {isAccountOwner && (
          <Card className="border-[#69ad4c]/40 bg-[#69ad4c]/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <span className="bg-[#69ad4c] text-white p-1 rounded-md text-xs font-bold">O</span>
                Account Owner Access
              </CardTitle>
              <CardDescription>
                As the Account Owner, you have additional privileges:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Any settings you update will apply to all users in your church</li>
                  <li>You can manage all users, batches, and settings across your church</li>
                  <li>You are the owner of your church's account</li>
                </ul>
              </CardDescription>
            </CardHeader>
          </Card>
        )}

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
                  <div className="border border-gray-400 rounded-lg p-8 flex flex-col items-center">
                    {user?.churchLogoUrl ? (
                      <div className="mb-6 flex flex-col items-center">
                        <img 
                          src={user.churchLogoUrl} 
                          alt={`${user.churchName || 'Church'} logo`} 
                          className="max-width-[380px] max-h-[80px] object-contain"
                          style={{ maxWidth: "380px", height: "auto" }}
                        />
                      </div>
                    ) : (
                      <div className="mb-6 flex flex-col items-center">
                        <div className="w-[380px] h-[80px] flex items-center justify-center">
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
                          console.log("Uploading logo...");
                          
                          const response = await fetch('/api/settings/logo', {
                            method: 'POST',
                            body: formData,
                          });
                          
                          let errorMessage = 'Failed to upload logo';
                          
                          if (!response.ok) {
                            // Try to get detailed error message from response
                            try {
                              const errorData = await response.json();
                              errorMessage = errorData.message || errorData.error || 'Failed to upload logo';
                              console.error("Logo upload error:", errorData);
                            } catch (jsonError) {
                              console.error("Error parsing error response:", jsonError);
                            }
                            throw new Error(errorMessage);
                          }
                          
                          console.log("Logo upload successful");
                          
                          // Refresh user data to get updated logo URL
                          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                          
                          toast({
                            title: "Logo updated",
                            description: "Your church logo has been updated successfully.",
                            className: "bg-[#48BB78] text-white",
                          });
                        } catch (error) {
                          console.error("Logo upload error:", error);
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
                    <span className="text-xs text-gray-600">Recommended Size: 380x80px</span>
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
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {/* Email Notifications Section */}
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-2">Email Notifications</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="mb-2">
                  <div className="flex justify-between items-start gap-8">
                    <div className="max-w-[80%]">
                      <div className="text-sm text-gray-600">
                        Email notifications can be sent to donors to confirm receipt of their donation, and to individuals specified to receive Count summaries.
                      </div>
                    </div>
                    <div className="flex items-center pl-4">
                      <div className="relative inline-flex">
                        <div className={`relative rounded-full p-[2px] ${form.watch("emailNotificationsEnabled") ? "bg-[#69ad4c]" : "bg-gray-300"} w-11 h-6 transition-colors`}>
                          <button
                            type="button"
                            onClick={() => {
                              const newValue = !form.watch("emailNotificationsEnabled");
                              // Update the form value
                              form.setValue("emailNotificationsEnabled", newValue);
                              
                              // Use a simplified direct API call that only sends the emailNotificationsEnabled field
                              const apiUrl = "/api/settings/email-notifications";
                              
                              // Make a focused API call just for this setting
                              fetch(apiUrl, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({ enabled: newValue })
                              })
                              .then(response => {
                                if (!response.ok) throw new Error("Failed to update notification settings");
                                return response.text();
                              })
                              .then(() => {
                                // If successful, update the query cache
                                queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                                toast({
                                  title: "Notification Setting Updated",
                                  description: `Email notifications have been turned ${newValue ? 'ON' : 'OFF'}.`,
                                  className: "bg-[#69ad4c] text-white",
                                });
                              })
                              .catch(error => {
                                // Revert the UI toggle if there's an error
                                form.setValue("emailNotificationsEnabled", !newValue);
                                toast({
                                  title: "Error",
                                  description: "Failed to update notification settings. Please try again.",
                                  variant: "destructive",
                                  className: "bg-white border-red-600",
                                });
                                console.error("Toggle error:", error);
                              });
                            }}
                            className="focus:outline-none"
                            aria-label="Toggle email notifications"
                          >
                            <span 
                              className={`block h-5 w-5 rounded-full shadow-md transform transition-transform duration-200 ${
                                form.watch("emailNotificationsEnabled") 
                                  ? "translate-x-5 bg-white" 
                                  : "translate-x-0 bg-gray-500"
                              }`} 
                            />
                          </button>
                        </div>
                      </div>
                      <span className="ml-2 text-base font-semibold">
                        {form.watch("emailNotificationsEnabled") ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </div>
              </form>
            </Form>
            </div>
            
            <Separator className="my-6" />
            
            {/* Email Templates Section */}
            <div className="mb-8">
              <EmailTemplates />
            </div>
            
            <Separator className="my-6" />
            
            {/* Count Report Notifications Section */}
            <div>
              <h3 className="text-lg font-medium mb-2">Count Report Notifications</h3>
              <div className="space-y-2">
                {isLoadingReportRecipients ? (
                  <div className="flex justify-center py-3">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <div className="text-sm text-gray-600 max-w-[90%]">
                        Email notifications can be sent to individuals specified to receive Count summaries.
                      </div>
                    </div>
                    
                    {reportRecipients.length === 0 ? (
                      <div>
                        <div className="text-center p-4 border border-gray-200 rounded-md bg-gray-50">
                          <p className="text-gray-600">No recipients configured</p>
                          <p className="text-xs text-gray-400 mt-0.5">Add recipients to receive count reports</p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Table className="border-b border-gray-200">
                          <TableHeader className="border-b border-gray-400">
                            <TableRow>
                              <TableHead className="font-bold">Name</TableHead>
                              <TableHead className="font-bold">Email</TableHead>
                              <TableHead className="font-bold w-[100px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.isArray(reportRecipients) && reportRecipients.length > 0 ? (
                              reportRecipients.map((recipient) => (
                                <TableRow key={recipient.id}>
                                  <TableCell className="py-3 text-sm">
                                    {recipient.firstName} {recipient.lastName}
                                  </TableCell>
                                  <TableCell className="py-3 text-sm">{recipient.email}</TableCell>
                                  <TableCell className="py-3">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        onClick={() => openEditRecipientDialog(recipient)}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        onClick={() => deleteReportRecipientMutation.mutate(recipient.id)}
                                        disabled={deleteReportRecipientMutation.isPending}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                      >
                                        {deleteReportRecipientMutation.isPending && deleteReportRecipientMutation.variables === recipient.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="h-4 w-4" />
                                        )}
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                                  No report recipients found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  
                    <div className="flex justify-center mt-4">
                      <Button
                        onClick={openAddRecipientDialog}
                        className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Recipient
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Service Options Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Service Options</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-3">
              <div className="text-sm text-gray-600 max-w-[90%] mb-4">
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
                      {Array.isArray(serviceOptions) && serviceOptions.length > 0 
                        ? serviceOptions
                            .slice() // Create a copy of the array before sorting
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
                      ))
                        : (
                          <div className="text-gray-500 italic">
                            No service options available
                          </div>
                        )
                      }
                      
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
            <CardTitle>Manage Members</CardTitle>
          </CardHeader>
          <CardContent className="pt-1 pb-4">
            <div className="mb-4">
              <p className="text-sm text-gray-600 max-w-[90%]">
                You can manage your members by importing them in bulk using a CSV file or connecting directly to Planning Center Online. To see a list of all members <Link href="/members" className="text-[#69ad4c] hover:underline font-medium">click here</Link>.
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-medium mb-3">CSV Import</h3>
                <CsvImporter />
              </div>
              
              <div className="mt-6">
                {/* Removed "Planning Center Integration" heading as the logo itself is sufficient */}
                <PlanningCenterIntegration />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Removed duplicate Count Report Notifications card */}

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
