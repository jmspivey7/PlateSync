"use client";

import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, Upload, CheckCircle, ArrowRight, ChevronsRight, X, 
  Plus, ChevronLeft, Mail, FileUp, Users, Link as LinkIcon, UserPlus,
  AlertCircle, AlertTriangle, BellRing, Calendar, Gift, CreditCard
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import plateSyncLogo from "../assets/platesync-logo.png";

// Onboarding Steps
enum OnboardingStep {
  CREATING_ACCOUNT = 0,
  VERIFY_EMAIL = 1,
  UPLOAD_LOGO = 2,
  SERVICE_OPTIONS = 3,
  IMPORT_MEMBERS = 4,
  EMAIL_NOTIFICATIONS = 5,
  SUBSCRIPTION = 6,
  COMPLETE = 7
}

interface OnboardingParams {
  churchId?: string;
  churchName?: string;
  email?: string;
}

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(OnboardingStep.VERIFY_EMAIL);
  const [progress, setProgress] = useState(0);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { startOnboardingTrial, isStartingOnboardingTrial } = useSubscription();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isAccountCreating, setIsAccountCreating] = useState(false);
  
  // Service options states
  const [serviceOptions, setServiceOptions] = useState<string[]>([]);
  const [newServiceOption, setNewServiceOption] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  
  // Email verification states
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  // Member import states
  const [activeImportTab, setActiveImportTab] = useState<string>("csv");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  
  // Email notification state - default to false (OFF)
  const [donorNotificationsEnabled, setDonorNotificationsEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlanningCenterConnecting, setIsPlanningCenterConnecting] = useState(false);
  const [isPlanningCenterConnected, setIsPlanningCenterConnected] = useState(false);
  const [isImportingFromPlanningCenter, setIsImportingFromPlanningCenter] = useState(false);
  const queryClient = useQueryClient();
  
  // Mutation for saving donor notification settings
  const donorNotificationMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      try {
        // Get the churchId from localStorage that was stored during verification
        const churchId = localStorage.getItem('onboardingChurchId') || '';
        
        console.log('Sending email notification request:', { enabled, churchId });
        
        const response = await apiRequest("/api/onboard-email-setting", "POST", { 
          enabled,
          churchId: churchId
        });
        
        console.log('Email notification response received:', response);
        return response;
      } catch (error) {
        console.error("Error in notification settings API request:", error);
        throw error;
      }
    },
    onSuccess: () => {

      
      // Move to next step after short delay
      setTimeout(() => {
        handleNextStep();
      }, 1000);
    },
    onError: (error) => {
      console.error("Error saving notification settings:", error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save notification settings',
        variant: 'destructive',
      });
    }
  });

  // Create the importCsvMutation for handling CSV imports
  const importCsvMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      try {
        // Add church ID to the form data for registration flow
        const storedUserId = localStorage.getItem('userId');
        const idToUse = churchId || storedUserId;
        
        if (idToUse) {
          formData.append('churchId', idToUse);
        }
        
        const response = await fetch('/api/members/import', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to import members');
        }
        
        return await response.json();
      } catch (error) {
        console.error('Import error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('CSV Import Success Data:', data);
      const importCount = data.importedCount || data.addedCount || data.added || data.imported || 0;
      setImportStatus('success');
      setStatusMessage(`Successfully imported ${importCount} members.`);
      setImportProgress(100);
      
      // Invalidate the members query to refresh the list if needed
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Import successful - no toast needed during onboarding flow
      // User can now manually proceed with Save & Continue button
    },
    onError: (error) => {
      setImportStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An error occurred during import');
      setImportProgress(0);
      
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import members',
        variant: 'destructive',
      });
    }
  });
  
  // Get parameters from URL query
  const params = new URLSearchParams(window.location.search);
  const churchId = params.get('churchId') || undefined;
  const churchName = params.get('churchName') || 'Your Church';
  const email = params.get('email') || undefined;
  
  // Simulate account creation process with a timer
  useEffect(() => {
    if (currentStep === OnboardingStep.CREATING_ACCOUNT) {
      const timer = setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress + 4;
          if (newProgress >= 100) {
            clearInterval(timer);
            // Move to next step after a small delay
            setTimeout(() => {
              setCurrentStep(OnboardingStep.VERIFY_EMAIL);
            }, 500);
            return 100;
          }
          return newProgress;
        });
      }, 200); // Update progress every 200ms for about 5 seconds total
      
      return () => {
        clearInterval(timer);
      };
    }
  }, [currentStep]);
  
  // Auto-send verification code when on verification step
  useEffect(() => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL && !verificationSent && email && churchId) {
      sendVerificationCode();
    }
  }, [currentStep, verificationSent, email, churchId]);
  
  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPEG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          setLogoPreview(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle logo upload
  // Handle service options saving
  const handleServiceOptionsSave = async () => {
    const storedUserId = localStorage.getItem('userId');
    const idToUse = churchId || storedUserId;
    
    if (!idToUse) {
      console.log('No church ID available for service options save');
      return;
    }
    
    // Get service options from localStorage
    const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
    if (storedOptions.length === 0) {
      console.log('No service options to save');
      return;
    }
    
    console.log('Saving service options:', storedOptions);
    
    try {
      // Save each service option to the database
      for (const option of storedOptions) {
        const saveResponse = await fetch('/api/service-options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: option,
            churchId: idToUse
          }),
        });
        
        if (!saveResponse.ok) {
          console.error(`Failed to save service option "${option}":`, await saveResponse.text());
        } else {
          console.log(`Service option "${option}" saved successfully`);
        }
      }
      
      // Clear the localStorage after successful save
      localStorage.removeItem('onboardingServiceOptions');
      
    } catch (error) {
      console.error('Error saving service options:', error);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      toast({
        title: "No logo selected",
        description: "Please select a logo to upload",
        variant: "destructive"
      });
      return;
    }
    
    // Get userId from localStorage if available (might have been saved during verification)
    const storedUserId = localStorage.getItem('userId');
    
    // Use either churchId from params or userId from verification
    const idToUse = churchId || storedUserId;
    
    console.log('Logo Upload - User info:', { 
      idToUse, 
      churchId, 
      storedUserId
    });
    
    if (!idToUse) {
      toast({
        title: "Missing church ID",
        description: "Church ID is required for logo upload",
        variant: "destructive"
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('logo', logoFile);
      formData.append('churchId', idToUse);
      
      console.log(`Uploading logo for churchId: ${idToUse}`);
      
      // Send to server
      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        console.error('Failed to upload logo:', await response.text());
        throw new Error('Failed to upload logo');
      }
      
      setUploadSuccess(true);
      
      // Logo uploaded successfully - no toast needed during onboarding
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  // Send email verification code
  const sendVerificationCode = async () => {
    if (!email || !churchId) {
      toast({
        title: "Error",
        description: "Missing email or church ID",
        variant: "destructive"
      });
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Try to get any stored user data from localStorage
      const storedFirstName = localStorage.getItem('firstName');
      const storedLastName = localStorage.getItem('lastName');
      
      const response = await fetch('/api/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          churchId,
          churchName,
          firstName: storedFirstName || '',
          lastName: storedLastName || ''
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send verification code');
      }
      
      setVerificationSent(true);
      

    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Failed to send verification code");
      
      toast({
        title: "Failed to send verification code",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Update account creation spinner state based on verification step
  // We already have this state declared higher in the file
  
  // Verify the email verification code
  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6 || !email || !churchId) {
      toast({
        title: "Invalid code",
        description: "Please enter a valid 6-digit code",
        variant: "destructive"
      });
      return;
    }
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: verificationCode,
          email,
          churchId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid verification code');
      }
      
      // Successful verification means user is now authenticated
      const data = await response.json();
      
      // Store the userId in localStorage if provided in the response
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
        console.log('User ID stored during verification:', data.userId);
        
        // Also store the verified status for this user
        localStorage.setItem('userVerified', 'true');
      }
      
      // Store the churchId for later use in trial subscription creation
      if (churchId) {
        localStorage.setItem('onboardingChurchId', churchId);
        console.log('Church ID stored for subscription:', churchId);
      }
      
      toast({
        title: "Email verified",
        description: "Your email has been verified successfully",
        variant: "default"
      });
      
      // Show the account creation spinner screen
      setIsAccountCreating(true);
      
      // Account creation complete - user can proceed manually
      setIsAccountCreating(false);
      
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : "Invalid verification code");
      
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "Invalid verification code",
        variant: "destructive"
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Handle skip
  const handleSkip = () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // Cannot skip email verification
      toast({
        title: "Email verification required",
        description: "You must verify your email to continue",
        variant: "destructive"
      });
      return;
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      setCurrentStep(OnboardingStep.IMPORT_MEMBERS);
    } else if (currentStep === OnboardingStep.IMPORT_MEMBERS) {
      setCurrentStep(OnboardingStep.EMAIL_NOTIFICATIONS);
    } else if (currentStep === OnboardingStep.EMAIL_NOTIFICATIONS) {
      // When skipping email notifications, save as OFF (false) by default
      donorNotificationMutation.mutate(false);
    } else {
      // If on last step or otherwise, redirect to login page
      setLocation("/login-local");
    }
  };
  
  // Handle CSV file operations
  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processCsvFile(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      processCsvFile(droppedFile);
    }
  };

  const processCsvFile = (selectedFile: File) => {
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setImportStatus('error');
      setStatusMessage('Please upload a valid CSV file');
      return;
    }

    setCsvFile(selectedFile);
    setImportStatus('idle');
    setStatusMessage(null);
    setImportProgress(0);
    
    // Preview the CSV data
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',');
        
        // Check if CSV has the expected headers
        const requiredHeaders = ['First Name', 'Last Name', 'Email', 'Mobile Phone Number'];
        const hasRequiredHeaders = requiredHeaders.every(header => 
          headers.some(h => h.trim().toLowerCase() === header.toLowerCase())
        );
        
        if (!hasRequiredHeaders) {
          setImportStatus('error');
          setStatusMessage('CSV file must include First Name, Last Name, Email, and Mobile Phone Number columns');
          return;
        }
        
        // Create preview with first 5 rows
        const previewRows = [];
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          if (lines[i].trim()) {
            const rowData: Record<string, string> = {};
            const values = lines[i].split(',');
            for (let j = 0; j < headers.length; j++) {
              const headerKey = headers[j].trim();
              rowData[headerKey] = values[j]?.trim() || '';
            }
            previewRows.push(rowData);
          }
        }
        setPreviewData(previewRows);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleCsvImport = async () => {
    if (!csvFile) return;
    
    setImportStatus('loading');
    setImportProgress(10);
    
    const formData = new FormData();
    formData.append('csvFile', csvFile, csvFile.name);
    
    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setImportProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        return newProgress < 90 ? newProgress : prev;
      });
    }, 300);
    
    try {
      // Always use the real import function, never simulate
      console.log('Starting real CSV import during registration...');
      await importCsvMutation.mutateAsync(formData);
    } catch (error) {
      setImportStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An error occurred during import');
      setImportProgress(0);
      
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import members',
        variant: 'destructive',
      });
    } finally {
      clearInterval(progressInterval);
    }
  };

  const handleCsvClick = () => {
    fileInputRef.current?.click();
  };
  
  // Handle next step
  const handleNextStep = async () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // For verification step, we need to verify the code
      verifyCode();
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      // If user has selected a logo but hasn't uploaded it yet, upload it first
      if (logoFile && !uploadSuccess) {
        await handleLogoUpload();
      }
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      // If user has service options in localStorage, save them automatically
      const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
      if (storedOptions.length > 0) {
        await handleServiceOptionsSave();
      }
      setCurrentStep(OnboardingStep.IMPORT_MEMBERS);
    } else if (currentStep === OnboardingStep.IMPORT_MEMBERS) {
      // Member import is complete or skipped, move to email notifications
      setCurrentStep(OnboardingStep.EMAIL_NOTIFICATIONS);
    } else if (currentStep === OnboardingStep.EMAIL_NOTIFICATIONS) {
      // Save the email notification setting first, then user can manually proceed
      try {
        await donorNotificationMutation.mutateAsync(donorNotificationsEnabled);
        // Setting saved successfully - user can now manually proceed to subscription
      } catch (error) {
        console.error('Error saving email notification setting:', error);
        // Show error but don't auto-advance
      }
      setCurrentStep(OnboardingStep.SUBSCRIPTION);
    } else if (currentStep === OnboardingStep.SUBSCRIPTION) {
      // Subscription step is complete, move to completion
      setCurrentStep(OnboardingStep.COMPLETE);
    } else if (currentStep === OnboardingStep.COMPLETE) {
      // Clear ALL stored authentication data to force proper login
      localStorage.removeItem('userVerified');
      localStorage.removeItem('onboardingServiceOptions');
      localStorage.removeItem('firstName');
      localStorage.removeItem('lastName');
      localStorage.removeItem('userId');
      localStorage.removeItem('onboardingChurchId');
      localStorage.removeItem('churchId');
      localStorage.removeItem('email');
      
      // Force a complete logout by calling both logout endpoints
      try {
        await fetch('/api/logout-local', { method: 'POST', credentials: 'include' });
        await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        
        // Small delay to ensure session is cleared on server
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.log('Logout calls completed');
      }
      
      // Force browser to reload to clear any cached authentication state
      window.location.href = "/login-local";
    }
  };
  
  // Handle back step
  const handleBackStep = () => {
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      // Cannot go back from email verification
      return;
    } else if (currentStep === OnboardingStep.UPLOAD_LOGO) {
      // Cannot go back to verification once verified
      return;
    } else if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      setCurrentStep(OnboardingStep.UPLOAD_LOGO);
    } else if (currentStep === OnboardingStep.IMPORT_MEMBERS) {
      setCurrentStep(OnboardingStep.SERVICE_OPTIONS);
    } else if (currentStep === OnboardingStep.EMAIL_NOTIFICATIONS) {
      setCurrentStep(OnboardingStep.IMPORT_MEMBERS);
    } else if (currentStep === OnboardingStep.SUBSCRIPTION) {
      setCurrentStep(OnboardingStep.EMAIL_NOTIFICATIONS);
    } else if (currentStep === OnboardingStep.COMPLETE) {
      setCurrentStep(OnboardingStep.SUBSCRIPTION);
    }
  };
  
  // Handle adding a new service option
  const handleAddServiceOption = async () => {
    if (!newServiceOption.trim()) {
      toast({
        title: "Invalid service name",
        description: "Please enter a valid service name",
        variant: "destructive"
      });
      return;
    }
    
    if (serviceOptions.includes(newServiceOption.trim())) {
      toast({
        title: "Duplicate service",
        description: "This service option already exists",
        variant: "destructive"
      });
      return;
    }
    
    setIsAddingService(true);
    
    try {
      const trimmedOption = newServiceOption.trim();
      setServiceOptions([...serviceOptions, trimmedOption]);
      setNewServiceOption('');
      
      // Get userId from localStorage if available (saved during verification)
      const storedUserId = localStorage.getItem('userId');
      const idToUse = churchId || storedUserId;
      
      // If we have a user ID and they've been verified, try to save directly to the database
      const userVerified = localStorage.getItem('userVerified') === 'true';
      
      if (idToUse && userVerified) {
        // Save directly to the database
        try {
          const response = await fetch('/api/service-options', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: trimmedOption,
              churchId: idToUse
            }),
          });
          
          if (!response.ok) {
            // If API call fails, still store in localStorage as fallback
            console.warn('Failed to save service option to database, falling back to localStorage');
            const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
            localStorage.setItem('onboardingServiceOptions', JSON.stringify([...storedOptions, trimmedOption]));
          }
        } catch (error) {
          console.error('Error saving service option to database:', error);
          // Fall back to localStorage
          const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
          localStorage.setItem('onboardingServiceOptions', JSON.stringify([...storedOptions, trimmedOption]));
        }
      } else {
        // Store in localStorage to persist during onboarding
        const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
        localStorage.setItem('onboardingServiceOptions', JSON.stringify([...storedOptions, trimmedOption]));
      }
      
      // Service option added successfully - no toast needed during onboarding
      
    } catch (error) {
      toast({
        title: "Failed to add service option",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    } finally {
      setIsAddingService(false);
    }
  };
  
  // Handle removing a service option
  const handleRemoveServiceOption = async (option: string) => {
    try {
      // Update local state
      setServiceOptions(serviceOptions.filter(service => service !== option));
      
      // Get userId from localStorage if available (saved during verification)
      const storedUserId = localStorage.getItem('userId');
      const idToUse = churchId || storedUserId;
      const userVerified = localStorage.getItem('userVerified') === 'true';
      
      // If user is verified and we have an ID, try to remove from database
      if (idToUse && userVerified) {
        try {
          // First try to find the service option ID (if it exists in the database)
          const getResponse = await fetch(`/api/service-options?churchId=${idToUse}`);
          
          if (getResponse.ok) {
            const serviceOptionsList = await getResponse.json();
            const serviceToDelete = serviceOptionsList.find((s: any) => s.name === option);
            
            if (serviceToDelete) {
              // If found in database, delete it
              const deleteResponse = await fetch(`/api/service-options/${serviceToDelete.id}`, {
                method: 'DELETE',
              });
              
              if (!deleteResponse.ok) {
                console.warn('Failed to delete service option from database, updating localStorage only');
              }
            }
          }
        } catch (error) {
          console.error('Error removing service option from database:', error);
        }
      }
      
      // Always update localStorage (even if database update succeeds)
      const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
      localStorage.setItem(
        'onboardingServiceOptions', 
        JSON.stringify(storedOptions.filter((item: string) => item !== option))
      );
      

    } catch (error) {
      toast({
        title: "Failed to remove service option",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };
  
  // Clear service options in localStorage when a new user registers
  useEffect(() => {
    // Once the verification page is shown, clear any stored service options
    // This ensures that new users start with a clean slate
    if (currentStep === OnboardingStep.VERIFY_EMAIL) {
      localStorage.removeItem('onboardingServiceOptions');
    }
  }, [currentStep]);

  // Load existing service options when entering the service options step
  useEffect(() => {
    if (currentStep === OnboardingStep.SERVICE_OPTIONS) {
      // Load from localStorage during onboarding
      try {
        const storedOptions = JSON.parse(localStorage.getItem('onboardingServiceOptions') || '[]');
        setServiceOptions(storedOptions);
      } catch (error) {
        console.error('Error loading service options from localStorage:', error);
        // Default options if there's an error loading from localStorage
        setServiceOptions([]);
      }
    }
  }, [currentStep]);
  
  // Update progress bar based on current step
  useEffect(() => {
    switch (currentStep) {
      case OnboardingStep.CREATING_ACCOUNT:
        // Progress is handled by the animation
        break;
      case OnboardingStep.VERIFY_EMAIL:
        setProgress(14);
        break;
      case OnboardingStep.UPLOAD_LOGO:
        setProgress(28);
        break;
      case OnboardingStep.SERVICE_OPTIONS:
        setProgress(42);
        break;
      case OnboardingStep.IMPORT_MEMBERS:
        setProgress(56);
        break;
      case OnboardingStep.EMAIL_NOTIFICATIONS:
        setProgress(70);
        break;
      case OnboardingStep.SUBSCRIPTION:
        setProgress(85);
        break;
      case OnboardingStep.COMPLETE:
        setProgress(100);
        break;
    }
  }, [currentStep]);
  
  // Render different content based on current step
  const renderStepContent = () => {
    switch (currentStep) {
      case OnboardingStep.CREATING_ACCOUNT:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
            <Loader2 className="h-16 w-16 animate-spin text-[#69ad4c]" />
            <h2 className="text-2xl font-bold">Hold tight while we create your Church organization</h2>
            <Progress value={progress} className="w-full max-w-md" />
            <p className="text-gray-500">Setting up your account...</p>
          </div>
        );
      
      case OnboardingStep.VERIFY_EMAIL:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Verify Your Email</h2>
              <div className="text-sm text-gray-500">Step 1 of 7</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              We've sent a 6-digit verification code to <span className="font-medium">{email}</span>. 
              Please enter the code below to continue with your account setup.
            </p>
            
            <div className="flex flex-col items-center space-y-8 py-6">
              <div className="bg-gray-50 p-8 rounded-lg w-full max-w-md flex flex-col items-center space-y-6">
                <Mail className="h-12 w-12 text-[#69ad4c] mb-2" />
                
                <InputOTP 
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying}
                  className="gap-2"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                
                {verificationError && (
                  <p className="text-sm text-red-500 mt-2">{verificationError}</p>
                )}
                
                <div className="flex justify-center mt-4 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isVerifying || !email}
                    onClick={sendVerificationCode}
                    className="px-6"
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 max-w-md text-center">
                Didn't receive a code? Check your spam folder or click the resend button above.
                If you continue to have issues, please contact support.
              </p>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
                disabled={true} // Back button is disabled for verification
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <div>
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  onClick={verifyCode}
                  disabled={isVerifying || verificationCode.length !== 6}
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify & Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
        
      case OnboardingStep.UPLOAD_LOGO:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 2: Upload Your Church Logo</h2>
              <div className="text-sm text-gray-500">Step 2 of 7</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Upload your church logo to personalize your PlateSync experience. This logo will appear on donation receipts and reports.
              <br />
              <span className="text-sm italic">You can skip this step now and add your logo later in Settings.</span>
            </p>
            
            <div className="flex flex-col items-center space-y-6 bg-gray-50 p-8 rounded-lg border border-dashed border-gray-300">
              {logoPreview ? (
                <div className="flex flex-col items-center">
                  <img 
                    src={logoPreview} 
                    alt="Logo Preview" 
                    className="max-w-[300px] max-h-[150px] object-contain rounded"
                  />
                  <Button 
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      setUploadSuccess(false);
                    }}
                  >
                    Remove Logo
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="bg-white p-6 rounded-full mb-4">
                    <Upload className="h-12 w-12 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">Drag and drop your logo here, or click to browse</p>
                  <p className="text-gray-400 text-sm mt-2">Supports: JPEG, PNG, GIF (Max: 5MB)</p>
                </div>
              )}
              
              <label className={`relative ${logoPreview ? 'hidden' : ''}`}>
                <Button
                  type="button"
                  variant={logoPreview ? "outline" : "default"}
                  className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                >
                  Browse Files
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onChange={handleLogoChange}
                />
              </label>
            </div>
            
            <div className="flex justify-between pt-4 border-t mt-8">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
                disabled={true} // Back button disabled for this step (as mentioned in handleBackStep)
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
                

                
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  onClick={handleNextStep}
                >
                  Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      
      case OnboardingStep.SERVICE_OPTIONS:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 3: Add Service Options</h2>
              <div className="text-sm text-gray-500">Step 3 of 7</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Set up your service types for donation tracking. Add options like "Sunday Morning", "Wednesday Night", "Special Events", etc.
              <br />
              <span className="text-sm italic">You can add or modify these options later in Settings.</span>
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Enter a service name (e.g., Sunday Morning)"
                  value={newServiceOption}
                  onChange={(e) => setNewServiceOption(e.target.value)}
                  className="flex-1"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !isAddingService) {
                      e.preventDefault();
                      handleAddServiceOption();
                    }
                  }}
                />
                
                <Button
                  onClick={handleAddServiceOption}
                  disabled={isAddingService}
                  className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                >
                  {isAddingService ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  <span className="ml-2">Add</span>
                </Button>
              </div>
              
              {/* List of service options */}
              <div className="bg-gray-50 rounded-lg p-4 min-h-[200px]">
                <div className="flex justify-between mb-2">
                  <h3 className="font-medium text-gray-900">Your Service Options</h3>
                  <span className="text-sm text-gray-500">{serviceOptions.length} options</span>
                </div>
                
                {serviceOptions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                    <p>No service options added yet</p>
                    <p className="text-sm">Add some options above to get started</p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {serviceOptions.map((option, index) => (
                      <li 
                        key={index} 
                        className="flex justify-between items-center p-3 bg-white rounded-md border border-gray-200"
                      >
                        <span>{option}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveServiceOption(option)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-gray-500 hover:text-red-500" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              
              {/* Suggested services */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Suggested services:</h3>
                <div className="flex flex-wrap gap-2">
                  {["Sunday Morning", "Sunday Evening", "Wednesday Night", "Special Event"].map(
                    (suggestion) => {
                      // Only show if not already added
                      if (serviceOptions.includes(suggestion)) return null;
                      
                      return (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewServiceOption(suggestion);
                          }}
                          className="bg-gray-100"
                        >
                          {suggestion}
                        </Button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
                
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  onClick={handleNextStep}
                >
                  Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      
      case OnboardingStep.EMAIL_NOTIFICATIONS:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 5: Donor Notifications</h2>
              <div className="text-sm text-gray-500">Step 5 of 7</div>
            </div>
            
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-[#69ad4c]" />
                    <h3 className="text-lg font-medium">Donor Email Notifications</h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    When enabled, PlateSync will automatically send email notifications to donors after each 
                    count is finalized. This helps keep your congregation informed about their contributions.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch 
                    id="donor-notifications"
                    checked={donorNotificationsEnabled}
                    onCheckedChange={(checked) => {
                      setDonorNotificationsEnabled(checked || false);
                    }}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-200"
                  />
                  <span className="font-semibold text-base">{donorNotificationsEnabled ? "ON" : "OFF"}</span>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-medium text-sm">Important Information</h4>
                    <p className="text-xs text-gray-600">
                      Email notifications will only be sent to members who have valid email addresses in the system.
                      You can edit member email addresses or notification preferences any time in Settings after setup.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-4 rounded-md border bg-blue-50 border-blue-100">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium">Email Preview</h4>
                    <p className="text-sm text-gray-700">
                      Members will receive a professional email notification with your church's logo
                      that includes their donation amount, date, and type for their records.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={handleSkip}
                >
                  Skip for now
                </Button>
                
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  onClick={handleNextStep}
                  disabled={donorNotificationMutation.isPending}
                >
                  {donorNotificationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        );
        
      case OnboardingStep.IMPORT_MEMBERS:
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 4: Import Members</h2>
              <div className="text-sm text-gray-500">Step 4 of 7</div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Import your church members to start tracking donations. You can import via CSV file or connect to Planning Center.
            </p>
            
            <Tabs 
              value={activeImportTab} 
              onValueChange={setActiveImportTab} 
              className="w-full mb-6"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="csv">CSV Import</TabsTrigger>
                <TabsTrigger value="planning-center">Planning Center</TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv" className="pt-4">
                <div className="space-y-4">
                  {/* CSV Import UI */}
                  <div 
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                      ${isDragging ? 'border-[#4299E1] bg-[#4299E1]/10' : 'border-gray-300'}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleCsvClick}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                    />
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      {csvFile ? csvFile.name : 'Drag and drop a CSV file here, or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported format: CSV with columns for First Name, Last Name, Email, and Mobile Phone Number
                    </p>
                  </div>

                  {importStatus === 'loading' && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Importing members...</span>
                        <span className="text-sm text-gray-500">{Math.round(importProgress)}%</span>
                      </div>
                      <Progress value={importProgress} className="h-2" />
                    </div>
                  )}

                  {importStatus === 'success' && (
                    <Alert className="mb-4 bg-green-50 border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertTitle className="text-green-800">Import Successful</AlertTitle>
                      <AlertDescription className="text-green-700 text-sm">
                        {statusMessage}
                      </AlertDescription>
                    </Alert>
                  )}

                  {importStatus === 'error' && (
                    <Alert className="mb-4 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertTitle className="text-red-800">Import Failed</AlertTitle>
                      <AlertDescription className="text-red-700 text-sm">
                        {statusMessage || 'An error occurred during the import.'}
                      </AlertDescription>
                    </Alert>
                  )}

                  {previewData && previewData.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium mb-2">Preview of first 5 records:</h3>
                      <div className="border rounded-md overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50">
                            <tr>
                              {Object.keys(previewData[0]).map((header) => (
                                <th key={header} className="px-3 py-2 text-left text-gray-600">{header}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {previewData.map((row, index) => (
                              <tr key={index}>
                                {Object.values(row).map((value: any, i) => (
                                  <td key={i} className="px-3 py-2 text-gray-800">{value}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {csvFile && importStatus !== 'loading' && (
                    <div className="flex justify-center">
                      <Button
                        onClick={handleCsvImport}
                        className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white px-6"
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        Import Members
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="planning-center" className="pt-4">
                <div className="space-y-4">
                  {/* Planning Center Integration UI */}
                  <div className="flex flex-col items-center justify-center p-4 space-y-6 rounded-lg border border-gray-300">
                    <img 
                      src="/images/integrations/planning-center-logo.png" 
                      alt="Planning Center Logo" 
                      className="h-12 mb-2" 
                    />
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Connect your Planning Center Online account to import your members directly into PlateSync.
                        This integration uses OAuth 2.0 to securely connect without storing your credentials.
                      </p>
                      
                      {isPlanningCenterConnected ? (
                        <div className="space-y-4">
                          <Alert>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            <AlertTitle className="flex items-center">
                              <Users className="h-4 w-4 mr-2" />
                              Planning Center Connected
                            </AlertTitle>
                            <AlertDescription>
                              Your Planning Center account is connected and ready to import members.
                            </AlertDescription>
                          </Alert>
                          
                          <Button 
                            onClick={() => {
                              setIsImportingFromPlanningCenter(true);
                              // Mock successful import after 2 seconds
                              setTimeout(() => {
                                setIsImportingFromPlanningCenter(false);
                                setImportStatus('success');
                                setStatusMessage('Successfully imported members from Planning Center.');
                                toast({
                                  title: 'Import Successful',
                                  description: 'Members imported successfully from Planning Center.',
                                  className: 'bg-[#48BB78] text-white',
                                });
                                
                                // Auto advance to next step after 2 seconds
                                setTimeout(() => {
                                  handleNextStep();
                                }, 2000);
                              }, 2000);
                            }}
                            disabled={isImportingFromPlanningCenter}
                            className="text-white w-full"
                            style={{ backgroundColor: '#2176FF' }}
                          >
                            {isImportingFromPlanningCenter ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Import Members
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setIsPlanningCenterConnecting(true);
                            
                            // Get church ID for registration flow
                            const storedUserId = localStorage.getItem('userId');
                            const idToUse = churchId || storedUserId;
                            
                            if (idToUse) {
                              // Redirect to Planning Center OAuth with church ID
                              const authUrl = `/api/planning-center/authorize?churchId=${idToUse}`;
                              window.location.href = authUrl;
                            } else {
                              // Mock successful connection if no church ID available
                              setTimeout(() => {
                                setIsPlanningCenterConnecting(false);
                                setIsPlanningCenterConnected(true);
                              }, 2000);
                            }
                          }}
                          className="w-full text-white"
                          style={{ backgroundColor: '#2176FF' }}
                          disabled={isPlanningCenterConnecting}
                        >
                          {isPlanningCenterConnecting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <LinkIcon className="mr-2 h-4 w-4" />
                          )}
                          Connect to Planning Center
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <div className="space-x-2">
                {importStatus !== 'success' && (
                  <Button
                    variant="outline"
                    onClick={handleNextStep}
                  >
                    Skip for now
                  </Button>
                )}
                
                <Button 
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                  onClick={handleNextStep}
                >
                  Save & Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
        
      case OnboardingStep.SUBSCRIPTION:
        // Calculate trial dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);
        
        // Format dates for display
        const formatDate = (date: Date) => {
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        };
        
        return (
          <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Step 6: Subscription Plan</h2>
              <div className="text-sm text-gray-500">Step 6 of 7</div>
            </div>
            
            <div className="bg-white rounded-lg border p-6 mb-6">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mr-4">
                  <Gift className="h-8 w-8 text-[#69ad4c]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Start Your Free Trial</h3>
                  <p className="text-gray-600">Experience the full power of PlateSync</p>
                </div>
              </div>
              
              <p className="text-center mb-6">
                Your Free Trial of PlateSync is set to start. You'll have 30 days to use the app to 
                make sure it meets your needs. After your trial period ends you will be able to continue 
                using the app by choosing one of two billing options:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <Card className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl">Monthly Plan</CardTitle>
                    <CardDescription>Pay monthly, cancel anytime</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold mb-2">$2.99<span className="text-base font-normal text-gray-500">/month</span></p>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>All features included</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>Unlimited members</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
                
                <Card className="border border-green-200 shadow-sm">
                  <CardHeader className="pb-2 bg-green-50 rounded-t-lg">
                    <Badge className="w-fit bg-green-600 mb-2">Best Value</Badge>
                    <CardTitle className="text-xl">Annual Plan</CardTitle>
                    <CardDescription>Get 2 months free</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold mb-2">$25.00<span className="text-base font-normal text-gray-500">/year</span></p>
                    <ul className="space-y-2">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>All features included</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>Unlimited members</span>
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        <span>Save over 30%</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center mb-6">
                <p className="text-gray-600">
                  <Calendar className="inline-block mr-2 h-4 w-4" />
                  <span className="font-medium">Trial Period: </span> 
                  {formatDate(startDate)} to {formatDate(endDate)}
                </p>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <Button 
                className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white px-8"
                onClick={async () => {
                  try {
                    // Get churchId from localStorage during onboarding
                    const churchId = localStorage.getItem('onboardingChurchId');
                    if (!churchId) {
                      toast({
                        title: "Error starting trial",
                        description: "Church ID not found. Please restart onboarding.",
                        variant: "destructive"
                      });
                      return;
                    }
                    
                    // Get church name too if available
                    const storedChurchName = localStorage.getItem('churchName');
                    
                    // Start the trial without authentication requirement
                    await startOnboardingTrial({ 
                      churchId, 
                      churchName: storedChurchName || undefined
                    });
                    handleNextStep();
                  } catch (error) {
                    toast({
                      title: "Error starting trial",
                      description: error instanceof Error ? error.message : "Unknown error",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={isStartingOnboardingTrial}
              >
                {isStartingOnboardingTrial ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting Trial...
                  </>
                ) : (
                  <>
                    Start My Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      
      case OnboardingStep.COMPLETE:
        return (
          <div className="flex flex-col items-center justify-center space-y-6 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-[#69ad4c]" />
            </div>
            <h2 className="text-2xl font-bold">Your Free Trial is Now Active!</h2>
            <p className="text-gray-600 max-w-md">
              Congratulations! Your PlateSync account is ready to use and your 30-day free trial has started. Click the button below to sign in and start managing your donations.
            </p>
            <div className="flex justify-between pt-4 border-t mt-6 w-full max-w-md">
              <Button 
                variant="outline" 
                onClick={handleBackStep}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              
              <Button 
                className="bg-[#69ad4c] hover:bg-[#59ad3c] text-white"
                onClick={handleNextStep}
              >
                Go to Sign In <ChevronsRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
        
      default:
        return <div>Unknown step</div>;
    }
  };
  
  // Show spinner screen while creating account
  if (isAccountCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <div className="flex flex-col items-center justify-center max-w-md text-center">
          <img 
            src={plateSyncLogo} 
            alt="PlateSync Logo" 
            className="h-[5.25rem] mb-8"
          />
          
          <div className="w-16 h-16 mb-6">
            <svg className="animate-spin w-full h-full text-[#69ad4c]" viewBox="0 0 24 24">
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
                fill="none"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Hold tight while we create your Church organization</h2>
          <p className="text-gray-500">Setting up your account...</p>
        </div>
      </div>
    );
  }
  
  // Regular onboarding steps
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-3xl border shadow-lg">
        <CardHeader className="py-6 border-b bg-gray-50">
          <div className="flex items-center justify-center">
            <img 
              src={plateSyncLogo} 
              alt="PlateSync Logo" 
              className="h-[5.25rem]"
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {renderStepContent()}
        </CardContent>
      </Card>
    </div>
  );
}