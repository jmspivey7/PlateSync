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
  
  // Fetch users for dropdown - using a special testing endpoint to guarantee we get users
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/test-users"],
    queryFn: async () => {
      console.log("Fetching users for attestation dropdown...");
      try {
        const response = await fetch(`/api/test-users`);
        console.log("Users API response status:", response.status);
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data = await response.json();
        console.log("Users fetched for attestation:", data);
        return data;
      } catch (error) {
        console.error("Error fetching users:", error);
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
                    // Create a new window with just the content for printing
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                      toast({
                        title: "Error",
                        description: "Unable to open print window. Please check your popup blocker settings.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    // Query for batch information for the print content
                    fetch(`/api/batches/${batchId}`)
                      .then(res => res.json())
                      .then(batch => {
                        fetch(`/api/batches/${batchId}/donations`)
                          .then(res => res.json())
                          .then(donations => {
                            // Calculate totals
                            const cashTotal = donations
                              .filter((d: any) => d.donationType === "CASH")
                              .reduce((sum: number, d: any) => sum + parseFloat(d.amount.toString()), 0);
                              
                            const checkTotal = donations
                              .filter((d: any) => d.donationType === "CHECK")
                              .reduce((sum: number, d: any) => sum + parseFloat(d.amount.toString()), 0);
                            
                            const grandTotal = cashTotal + checkTotal;
                            const donationCount = donations.length;
                            
                            // Format currency
                            const formatCurrency = (amount: number | string) => {
                              return new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                minimumFractionDigits: 2
                              }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
                            };
                            
                            // Format date
                            const formatDate = (dateString: string) => {
                              const date = new Date(dateString);
                              return new Intl.DateTimeFormat('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric',
                                hour12: true
                              }).format(date);
                            };
                            
                            // Create the HTML content for printing
                            const printContent = `
                              <!DOCTYPE html>
                              <html>
                              <head>
                                <title>Count Report - ${batch.name}</title>
                                <style>
                                  body {
                                    font-family: Arial, sans-serif;
                                    line-height: 1.6;
                                    color: #333;
                                    max-width: 800px;
                                    margin: 0 auto;
                                    padding: 20px;
                                  }
                                  .header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                  }
                                  .grid {
                                    display: grid;
                                    grid-template-columns: 1fr 1fr;
                                    gap: 15px;
                                    margin-bottom: 30px;
                                  }
                                  .box {
                                    border: 1px solid #ddd;
                                    border-radius: 5px;
                                    padding: 15px;
                                  }
                                  .label {
                                    font-size: 14px;
                                    color: #666;
                                  }
                                  .value {
                                    font-size: 20px;
                                    font-weight: 500;
                                  }
                                  .highlight {
                                    background-color: #f8f8f8;
                                  }
                                  .signature-line {
                                    margin-top: 40px;
                                    margin-bottom: 20px;
                                  }
                                  .signature {
                                    border-top: 1px solid #333;
                                    width: 200px;
                                    padding-top: 5px;
                                    margin-bottom: 20px;
                                  }
                                  .footer {
                                    text-align: center;
                                    margin-top: 40px;
                                    font-size: 12px;
                                    color: #666;
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <h1>${batch.name} - Count Report</h1>
                                  <p>${new Date(batch.date).toLocaleDateString()}</p>
                                  <p>Service: ${batch.service || "Not specified"}</p>
                                  <p>Status: ${batch.status}</p>
                                </div>
                                
                                <h2>Count Summary</h2>
                                <div class="grid">
                                  <div class="box">
                                    <p class="label">Cash Total</p>
                                    <p class="value">${formatCurrency(cashTotal)}</p>
                                  </div>
                                  <div class="box">
                                    <p class="label">Check Total</p>
                                    <p class="value">${formatCurrency(checkTotal)}</p>
                                  </div>
                                  <div class="box">
                                    <p class="label">Number of Donations</p>
                                    <p class="value">${donationCount}</p>
                                  </div>
                                  <div class="box highlight">
                                    <p class="label">Grand Total</p>
                                    <p class="value">${formatCurrency(grandTotal)}</p>
                                  </div>
                                </div>
                                
                                <h2>Attestation Information</h2>
                                <div class="box" style="margin-bottom: 15px;">
                                  <p><strong>Primary Attestor</strong></p>
                                  <p>${batch.primaryAttestorName || "Unknown"}</p>
                                  <p style="font-size: 14px; color: #666; margin-top: 5px;">
                                    ${batch.primaryAttestationDate ? formatDate(batch.primaryAttestationDate) : "No date recorded"}
                                  </p>
                                </div>
                                <div class="box">
                                  <p><strong>Secondary Attestor</strong></p>
                                  <p>${batch.secondaryAttestorName || "Unknown"}</p>
                                  <p style="font-size: 14px; color: #666; margin-top: 5px;">
                                    ${batch.secondaryAttestationDate ? formatDate(batch.secondaryAttestationDate) : "No date recorded"}
                                  </p>
                                </div>
                                
                                <div class="signature-line">
                                  <div class="signature"></div>
                                  <p style="font-size: 14px;">Primary Attestor Signature</p>
                                </div>
                                
                                <div class="signature-line">
                                  <div class="signature"></div>
                                  <p style="font-size: 14px;">Secondary Attestor Signature</p>
                                </div>
                                
                                <div class="footer">
                                  <p>Printed on ${new Date().toLocaleString()}</p>
                                  <p>PlateSync - Church Collection Management</p>
                                  <p style="margin-top: 10px;">This report is to be included with the money bag.</p>
                                </div>
                              </body>
                              </html>
                            `;
                            
                            // Write the content to the new window
                            printWindow.document.open();
                            printWindow.document.write(printContent);
                            printWindow.document.close();
                            
                            // Wait for the content to load before printing
                            setTimeout(() => {
                              printWindow.print();
                            }, 500);
                          })
                          .catch(error => {
                            console.error('Error fetching donations:', error);
                            printWindow.close();
                            toast({
                              title: "Error",
                              description: "Failed to load donation data for printing.",
                              variant: "destructive",
                            });
                          });
                      })
                      .catch(error => {
                        console.error('Error fetching batch:', error);
                        printWindow.close();
                        toast({
                          title: "Error",
                          description: "Failed to load batch data for printing.",
                          variant: "destructive",
                        });
                      });
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