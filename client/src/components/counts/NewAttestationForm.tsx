import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Loader2, CheckCircle2, AlertTriangle, InfoIcon, Printer } from "lucide-react";
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
  
  // Fetch users for dropdown
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch(`/api/users`);
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      return response.json();
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
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Primary attestation complete",
        description: "Please select a second attestor to continue.",
      });
      refetchBatch();
      setStep('secondary');
    },
    onError: (error) => {
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
      toast({
        title: "Count finalized",
        description: "The count has been successfully finalized and attested.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
      setStep('complete');
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
                  <div className="p-3 bg-muted rounded-md mb-4">
                    <p className="text-sm text-muted-foreground mb-1">Primary Attestor</p>
                    <p className="font-medium">{user?.username || user?.email || "Unknown"}</p>
                  </div>
                
                  <FormField
                    control={primaryForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name / Signature</FormLabel>
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
              
              <div className="text-gray-600 mb-4 space-y-3">
                <p>
                  I confirm that the cash and check totals in this count are accurate 
                  and that I have validated these counts with my usher partner.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-blue-800 flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Important:</p>
                    <p>The secondary attestor must be a different person than the primary attestor.</p>
                    <p>Each count requires verification by two different individuals.</p>
                  </div>
                </div>
              </div>
              
              <Form {...secondaryForm}>
                <form onSubmit={secondaryForm.handleSubmit(onSecondarySubmit)} className="space-y-4">
                  <FormField
                    control={secondaryForm.control}
                    name="attestorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Second Attestor</FormLabel>
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
                            {users && users.map((u: User) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.lastName && u.firstName 
                                  ? `${u.lastName}, ${u.firstName}` 
                                  : u.username || u.email || 'Unknown user'}
                              </SelectItem>
                            ))}
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
                        <FormLabel>Your Name / Signature</FormLabel>
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
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-blue-800 flex items-start">
                <Printer className="h-5 w-5 text-blue-500 inline-block mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Print Report:</p>
                  <p>Please print a physical report now to include with the money bag. You can print multiple copies if needed.</p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-3">
                <Button 
                  onClick={() => {
                    window.location.href = `/print-report?batchId=${batchId}&fromAttest=true`;
                  }}
                  className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  Print Report
                </Button>
                
                <Button 
                  onClick={() => setStep('confirmation')}
                  className="bg-amber-500 hover:bg-amber-600 text-black"
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
              This count has been finalized and is now locked.
            </p>
            <Button
              onClick={onComplete}
              className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
            >
              Return to Count List
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="max-w-2xl mx-auto">
      {renderStep()}
    </div>
  );
};

export default AttestationForm;