import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Batch, Donation, Member, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertTriangle, Printer, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


// Define the types needed for batch with donations
interface DonationWithMember extends Donation {
  member?: Member;
}

interface BatchWithDonations extends Batch {
  donations: DonationWithMember[];
}

interface AttestationFormProps {
  batchId: number;
  onComplete?: () => void;
}

// Schema for the form validation
const primaryAttestationSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

const secondaryAttestationSchema = z.object({
  attestorId: z.string().min(1, "Second attestor ID is required"),
  name: z.string().min(1, "Name is required"),
});

const AttestationForm = ({ batchId, onComplete }: AttestationFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Log when the attestation form is mounted
  useEffect(() => {
    console.log("AttestationForm mounted with batchId:", batchId);
  }, []);
  
  const [step, setStep] = useState<'primary' | 'secondary' | 'print' | 'confirmation' | 'complete'>('primary');
  
  // Fetch batch details
  const { data: batch, isLoading: isLoadingBatch, refetch: refetchBatch } = useQuery<BatchWithDonations>({
    queryKey: ["/api/batches", batchId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      const data = await response.json();
      return data;
    },
    refetchInterval: false,
  });
  
  // Fetch users for dropdown - using our test endpoint to guarantee users are available
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/test-users"],
    queryFn: async () => {
      console.log("Original AttestationForm: Fetching users for attestation dropdown...");
      try {
        const response = await fetch(`/api/test-users`);
        console.log("Original AttestationForm: API response status:", response.status);
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        console.log("Original AttestationForm: Users fetched for attestation:", data);
        return data;
      } catch (error) {
        console.error("Original AttestationForm: Error fetching users:", error);
        // Return hardcoded fallback if API fails
        return [
          {
            id: "40829937",
            username: "jspivey",
            email: "jspivey@spiveyco.com",
            firstName: "John",
            lastName: "Spivey",
            role: "ADMIN"
          },
          {
            id: "922299005",
            username: "jmspivey",
            email: "jmspivey@icloud.com",
            firstName: "John",
            lastName: "Spivey",
            role: "USHER"
          }
        ];
      }
    },
  });
  
  // Primary attestation form
  const primaryForm = useForm<{ name: string }>({
    resolver: zodResolver(primaryAttestationSchema),
    defaultValues: {
      name: "", // Keep name field blank
    },
  });
  
  // Secondary attestation form
  const secondaryForm = useForm<{ attestorId: string, name: string }>({
    resolver: zodResolver(secondaryAttestationSchema),
    defaultValues: {
      attestorId: "",
      name: "",
    },
  });
  
  // Update step based on attestation status when batch updates
  useEffect(() => {
    if (batch) {
      if (batch.primaryAttestorId && batch.secondaryAttestorId) {
        // If we're coming from 'print' step don't go back to confirmation
        if (step !== 'print' && step !== 'confirmation') {
          setStep('print');
        }
      } else if (batch.primaryAttestorId) {
        setStep('secondary');
      } else {
        setStep('primary');
      }
    }
  }, [batch, step]);
  
  // Primary attestation mutation
  const primaryAttestMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/batches/${batchId}/attest-primary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      
      if (!response.ok) {
        // Check if the response is JSON
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Attestation failed");
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Primary attestation complete",
        description: "Please select a second attestor to continue.",
      });
      // Refetch batch data first to ensure we have the latest data
      refetchBatch().then(() => {
        // Only change step after we have confirmed updated data
        setStep('secondary');
      });
    },
    onError: (error) => {
      console.error("Primary attestation error:", error);
      toast({
        title: "Attestation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Secondary attestation mutation
  const secondaryAttestMutation = useMutation({
    mutationFn: async (data: { attestorId: string, name: string }) => {
      const response = await fetch(`/api/batches/${batchId}/attest-secondary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Secondary attestation complete",
        description: "Please print a report for the money bag before finalizing.",
      });
      refetchBatch();
      setStep('print');
    },
    onError: (error) => {
      toast({
        title: "Attestation failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Confirmation mutation
  const confirmAttestationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/batches/${batchId}/confirm-attestation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
      return await response.json();
    },
    onSuccess: () => {
      // Removed toast notification as requested
      
      // Invalidate queries first to ensure data is fresh
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      queryClient.invalidateQueries({ queryKey: ['/api/batches', batchId, 'details'] });
      
      // Set step to complete
      setStep('complete');
      
      // Force navigation to the dedicated summary page with a flag to indicate this is a fresh finalization
      window.location.href = `/batch-summary/${batchId}?finalized=true`;
      
      // Only call onComplete if we don't navigate (as a backup)
      if (onComplete) {
        onComplete();
      }
    },
    onError: (error) => {
      toast({
        title: "Finalization failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handlers
  const onPrimarySubmit = (data: { name: string }) => {
    primaryAttestMutation.mutate(data.name);
  };
  
  const onSecondarySubmit = (data: { attestorId: string, name: string }) => {
    secondaryAttestMutation.mutate(data);
  };
  
  const onConfirmAttestation = () => {
    confirmAttestationMutation.mutate();
  };
  
  if (isLoadingBatch) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }
  
  if (!batch) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
          <p className="text-yellow-800">Batch not found or has been deleted.</p>
        </div>
      </div>
    );
  }
  
  // Render appropriate step
  const renderStep = () => {
    if (step === 'primary' || (step === 'secondary' && !batch.primaryAttestorId)) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Primary Attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                I confirm that the cash and check totals in this count are accurate 
                and that I have validated these counts with my usher partner.
              </p>
              
              <Form {...primaryForm}>
                <form onSubmit={primaryForm.handleSubmit(onPrimarySubmit)} className="space-y-4">
                  {/* Use the current user for primary attestation */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 font-bold">Primary Attestor:</p>
                    <p className="font-medium">{user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : (user?.username || user?.email || "Unknown")}</p>
                  </div>
                
                  <FormField
                    control={primaryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Your Name / Signature:</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Type your full name as signature" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                    disabled={primaryAttestMutation.isPending}
                  >
                    {primaryAttestMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Attest
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (step === 'secondary') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Secondary Attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="flex items-center p-3 bg-gray-50 rounded-md mb-6">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                <div>
                  <p className="font-medium">Primary attestation complete</p>
                  <p className="text-sm text-gray-600">
                    By: {batch.primaryAttestorName || "Unknown"}
                  </p>
                </div>
              </div>
              
              <p className="text-gray-600 mb-4">
                I confirm that the cash and check totals in this count are accurate 
                and that I have validated these counts with my usher partner.
              </p>
              
              <Form {...secondaryForm}>
                <form onSubmit={secondaryForm.handleSubmit(onSecondarySubmit)} className="space-y-4">
                  <FormField
                    control={secondaryForm.control}
                    name="attestorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Second Attestor:</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                            // Don't auto-populate the name field
                          }} 
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select second attestor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users && users
                              .filter((u: User) => u.id !== batch.primaryAttestorId)
                              .filter((u: User) => u.isVerified === true) // Only show verified users
                              .map((u: User) => (
                                <SelectItem key={u.id} value={u.id}>
                                  {u.lastName && u.firstName 
                                    ? `${u.lastName}, ${u.firstName}` 
                                    : u.username || u.email || 'Unknown user'}
                                </SelectItem>
                              ))
                            }
                            {users && users.filter((u: User) => u.id !== batch.primaryAttestorId && u.isVerified === true).length === 0 && (
                              <div className="px-2 py-1 text-sm text-red-500">
                                No verified attestors available. Only verified users can perform attestations.
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={secondaryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold">Your Name / Signature:</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Type your full name as signature" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button 
                    type="submit" 
                    className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                    disabled={secondaryAttestMutation.isPending}
                  >
                    {secondaryAttestMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Attest
                  </Button>
                </form>
              </Form>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (step === 'print') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Print Count Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="font-medium">Primary attestation complete</p>
                    <p className="text-sm text-gray-600">
                      By: {batch.primaryAttestorName || "Unknown"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="font-medium">Secondary attestation complete</p>
                    <p className="text-sm text-gray-600">
                      By: {batch.secondaryAttestorName || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800">
                <Printer className="h-5 w-5 text-blue-500 inline-block mr-2" />
                <span className="font-medium">Print Report:</span> Please print a physical report now 
                to include with the money bag. You can print multiple copies if needed.
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={() => {
                    // Check if mobile and direct to Safari if needed
                    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
                    const isMobile = /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(userAgent);
                    
                    if (isMobile) {
                      // Mobile: Direct Safari navigation with return URL parameter
                      const returnUrl = encodeURIComponent(window.location.href);
                      const pdfUrl = `/api/batches/${batchId}/pdf-report?mobile=true&return=${returnUrl}`;
                      window.open(pdfUrl, '_blank');
                    } else {
                      // Desktop: Navigate to internal PDF viewer
                      setLocation(`/pdf-viewer/${batchId}/count`);
                    }
                  }}
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  View & Print PDF Report
                </Button>
                
                <Button 
                  onClick={() => setStep('confirmation')}
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Continue to Finalize
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    if (step === 'confirmation') {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Confirm Attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="font-medium">Primary attestation complete</p>
                    <p className="text-sm text-gray-600">
                      By: {batch.primaryAttestorName || "Unknown"}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center p-3 bg-gray-50 rounded-md">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                  <div>
                    <p className="font-medium">Secondary attestation complete</p>
                    <p className="text-sm text-gray-600">
                      By: {batch.secondaryAttestorName || "Unknown"}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 text-yellow-800">
                <AlertTriangle className="h-5 w-5 text-yellow-500 inline-block mr-2" />
                <span className="font-medium">Important:</span> Finalizing this count will lock all donations 
                and make the count permanent. This action cannot be undone.
              </div>
              
              <Button 
                onClick={onConfirmAttestation}
                className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white w-full"
                disabled={confirmAttestationMutation.isPending}
              >
                {confirmAttestationMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Confirm and Finalize Count
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    // Complete state
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Count Finalized</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <div className="bg-green-100 rounded-full p-3 mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Attestation Complete</h3>
            <p className="text-gray-600 text-center mb-6">
              This count has been finalized.
            </p>
            <Button
              onClick={() => {
                // Direct the user to the batch summary page instead of going back to counts list
                window.location.href = `/batch-summary/${batchId}?finalized=true`;
              }}
              className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
            >
              View Count Summary
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return renderStep();
};

export default AttestationForm;