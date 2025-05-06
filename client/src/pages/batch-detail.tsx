import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar,
  DollarSign, 
  FileText, 
  PlusCircle, 
  CheckCircle, 
  ArrowLeft,
  Printer,
  Edit,
  AlertTriangle,
  X,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import DonationForm from "../components/donations/DonationForm";
import AttestationForm from "../components/counts/AttestationForm";
import { Batch, BatchWithDonations, Donation, DonationWithMember, batchStatusEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import PageLayout from "@/components/layout/PageLayout";

const BatchDetailPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isPrintView, setIsPrintView] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  
  // Debug state management - this will help us see what's happening
  useEffect(() => {
    if (isAttesting) {
      console.log("isAttesting changed to true, modal should display");
      // Force the modal to appear after a slight delay
      setTimeout(() => {
        console.log("Forcing modal to appear");
        document.body.style.overflow = "hidden"; // Prevent scrolling when modal is open
      }, 100);
    } else {
      document.body.style.overflow = "auto"; // Allow scrolling when modal is closed
    }
  }, [isAttesting]);

  // Fetch batch data with donations
  const { data: batch, isLoading } = useQuery<BatchWithDonations>({
    queryKey: ["/api/batches", batchId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      const data = await response.json();
      return {
        ...data,
        donations: data.donations.map((donation: any) => ({
          ...donation,
          member: donation.member || undefined
        }))
      } as BatchWithDonations;
    },
    refetchInterval: 5000, // Poll for updates every 5 seconds
  });

  // Set isFinalized based on batch status when data is loaded
  useEffect(() => {
    if (batch && batch.status === "FINALIZED") {
      setIsFinalized(true);
    }
  }, [batch]);

  // Calculate totals for cash and check donations
  const cashTotal = batch?.donations?.filter(d => d.donationType === "CASH")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;
  
  const checkTotal = batch?.donations?.filter(d => d.donationType === "CHECK")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;

  // Mutation to prepare batch for attestation
  const prepareAttestationMutation = useMutation({
    mutationFn: async () => {
      // No need to change status before attestation
      // We'll now directly navigate to attestation page without changing status
      return { success: true };
    },
    onSuccess: () => {
      // Navigate to attestation page
      setLocation(`/attest-batch/${batchId}`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to prepare count for attestation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Mutation to finalize batch
  const finalizeBatchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: "FINALIZED" })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
      
      toast({
        title: "Success",
        description: "Count has been finalized successfully.",
      });
      
      setIsFinalized(true);
      // Keep the summary visible after finalizing
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to finalize count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handleAddDonation = () => {
    setIsAddingDonation(true);
  };

  const handleDonationAdded = () => {
    // Close the dialogs
    setIsAddingDonation(false);
    setEditingDonationId(null);
    
    // Invalidate all necessary queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
    queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId.toString()] });
    queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId.toString(), "donations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    
    // Show success toast for better UX
    toast({
      title: "Success",
      description: "Donation data has been updated.",
    });
  };
  
  const handleEditDonation = (donationId: number) => {
    // Only allow editing if batch is not finalized
    if (!isFinalized) {
      setEditingDonationId(donationId);
    }
  };

  const handleShowSummary = () => {
    setShowSummary(true);
  };

  const handleEditFromSummary = () => {
    setShowSummary(false);
  };

  const handleFinalizeBatch = () => {
    finalizeBatchMutation.mutate();
  };

  const handlePrint = () => {
    setIsPrintView(true);
    // Use setTimeout to allow the state to update before printing
    setTimeout(() => {
      window.print();
      setIsPrintView(false);
    }, 100);
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const getBadgeClass = (status: string) => {
    const statusColors = {
      OPEN: "bg-primary/20 text-primary hover:bg-primary/30",
      FINALIZED: "bg-accent/20 text-accent hover:bg-accent/30",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-muted text-muted-foreground";
  };

  const handleBackToCounts = () => {
    setLocation("/counts");
  };

  // Print-specific styles
  if (isPrintView) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{batch?.name} - Donation Summary</h1>
          <p className="text-muted-foreground">{format(new Date(batch?.date || new Date()), 'MMMM d, yyyy')}</p>
          <p className="text-muted-foreground">Status: {batch?.status}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-border p-4 rounded-lg bg-muted/30">
            <h2 className="text-lg font-bold mb-2">Cash Total</h2>
            <p className="text-xl text-secondary-foreground">{formatCurrency(cashTotal)}</p>
          </div>
          <div className="border border-border p-4 rounded-lg bg-muted/30">
            <h2 className="text-lg font-bold mb-2">Check Total</h2>
            <p className="text-xl text-secondary-foreground">{formatCurrency(checkTotal)}</p>
          </div>
        </div>

        <div className="border border-border p-4 rounded-lg bg-muted/30 mb-6">
          <h2 className="text-lg font-bold mb-2">Total Donations</h2>
          <p className="text-xl text-secondary-foreground">{formatCurrency(parseFloat(batch?.totalAmount?.toString() || "0"))}</p>
        </div>

        <h2 className="text-xl font-bold mb-4">Donation Details</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2">Donor</th>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Details</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {batch?.donations?.map((donation) => (
              <tr key={donation.id} className="border-b border-border/50">
                <td className="py-2">
                  {donation.memberId && (donation as DonationWithMember).member ? 
                    `${(donation as DonationWithMember).member!.lastName}, ${(donation as DonationWithMember).member!.firstName}` : 
                    "Anonymous/Visitor"}
                </td>
                <td className="py-2">{format(new Date(donation.date), 'MMM d, yyyy')}</td>
                <td className="py-2">{donation.donationType}</td>
                <td className="py-2">
                  {donation.donationType === "CHECK" ? `Check #${donation.checkNumber}` : ""}
                </td>
                <td className="py-2 text-right">{formatCurrency(donation.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 text-center text-muted-foreground text-sm">
          <p>Printed on {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          <p>PlateSync - Church Donation Management</p>
        </div>
      </div>
    );
  }

  // Regular view (not print view)
  if (isLoading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <PageLayout title="Count Not Found">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Count Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested count could not be found.</p>
          <Button onClick={handleBackToCounts}>Back to Counts</Button>
        </div>
      </PageLayout>
    );
  }

  // Summary view for when finalizing the batch
  if (showSummary || isFinalized) {
    return (
      <PageLayout 
        title={batch.name} 
        subtitle={`Count created on ${format(new Date(batch.date), 'MMMM d, yyyy')}`}
      >
        <Card>
          <CardHeader>
            {/* Header with buttons in a row */}
            <div className="w-full flex justify-between items-center mb-4">
              {/* Left side - Back button */}
              <div className="flex space-x-2">
                {isFinalized && (
                  <Button variant="outline" onClick={handleBackToCounts}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Counts
                  </Button>
                )}
                {isFinalized && (
                  <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white ml-2">
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                )}
                {!isFinalized && (
                  <Button variant="outline" onClick={handleEditFromSummary}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Count
                  </Button>
                )}
              </div>
              
              {/* Right side - Title and description */}
              <div className="text-right">
                <CardTitle>Count Summary</CardTitle>
                <CardDescription>
                  Review and finalize your count
                </CardDescription>
              </div>
            </div>
            
            {/* Action buttons container (keeping the structure) */}
            <div className="w-full flex justify-between items-center" style={{display: 'none'}}>
              {/* Left side - Navigation buttons (now empty) */}
              <div className="flex space-x-2">
              </div>
              
              {/* Right side - Action buttons */}
              <div className="flex space-x-2">
                {/* Print button moved to header */}
                
                {!isFinalized && (
                  <Button 
                    onClick={() => {
                      console.log("Attest & Finalize button clicked");
                      prepareAttestationMutation.mutate();
                    }} 
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    disabled={prepareAttestationMutation.isPending}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {prepareAttestationMutation.isPending ? "Preparing..." : "Attest & Finalize"}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isFinalized && (
              <Alert className="mb-6 bg-muted">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Count Finalized</AlertTitle>
                <AlertDescription>
                  This count has been finalized and can no longer be edited. You can print a copy for your records.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Cash Total</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(cashTotal)}
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Check Total</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(checkTotal)}
                </div>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(batch.totalAmount || 0)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Donations in this Count</h3>
              {batch.donations && batch.donations.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-[450px] overflow-y-auto">
                  {batch.donations.map((donation) => (
                    <div key={donation.id} className="p-3 flex justify-between hover:bg-muted">
                      <div>
                        <div className="font-medium">
                          {donation.memberId && (donation as DonationWithMember).member ? 
                            `${(donation as DonationWithMember).member!.lastName}, ${(donation as DonationWithMember).member!.firstName}` : 
                            "Anonymous/Visitor"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(donation.date), 'MMM d, yyyy')} • 
                          {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                        </div>
                      </div>
                      <div className="font-medium text-secondary-foreground">
                        {formatCurrency(donation.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border rounded-lg text-muted-foreground">
                  <p>No donations in this count yet</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Regular batch detail view
  return (
    <PageLayout 
      title={batch.name} 
      subtitle={`Count created on ${format(new Date(batch.date), 'MMMM d, yyyy')}`}
    >
      <Card>
        <CardHeader className="flex flex-col items-end">
          {/* Right-justified header */}
          <div className="w-full text-right mb-4">
            <CardTitle>Count Details</CardTitle>
            <CardDescription>
              Status: <Badge className={getBadgeClass(batch.status)}>{batch.status}</Badge>
            </CardDescription>
          </div>
          
          {/* Action buttons in a row */}
          <div className="w-full flex justify-between items-center">
            {/* Left side - Navigation buttons and Finalize button */}
            <div className="flex space-x-2 items-center">
              <Button variant="outline" onClick={handleBackToCounts}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Counts
              </Button>
              
              {batch.donations && batch.donations.length > 0 && batch.status !== "FINALIZED" && (
                <Button 
                  onClick={() => {
                    console.log("Finalize Count button clicked");
                    prepareAttestationMutation.mutate();
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-black ml-2"
                  disabled={prepareAttestationMutation.isPending}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  {prepareAttestationMutation.isPending ? "Preparing..." : "Finalize Count"}
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              {batch.status === "FINALIZED" && (
                <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white">
                  <Printer className="mr-2 h-4 w-4" />
                  Print
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-xl font-bold text-secondary-foreground">
                {formatCurrency(batch.totalAmount || 0)}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Cash Total</div>
              <div className="text-xl font-bold text-secondary-foreground">
                {formatCurrency(cashTotal)}
              </div>
            </div>
            <div className="bg-muted p-4 rounded-lg">
              <div className="text-sm text-muted-foreground">Check Total</div>
              <div className="text-xl font-bold text-secondary-foreground">
                {formatCurrency(checkTotal)}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <Button 
              onClick={handleAddDonation}
              className="bg-green-600 hover:bg-green-700 text-white w-full md:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Record New Donation
            </Button>
          </div>

          <div>
            <h3 className="font-medium mb-3">Donations in this Count</h3>
            {batch.donations && batch.donations.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[350px] overflow-y-auto">
                {batch.donations.map((donation) => (
                  <div 
                    key={donation.id} 
                    className={`p-3 flex justify-between group ${!isFinalized ? "hover:bg-green-100 cursor-pointer transition-colors duration-200" : ""}`}
                    onClick={() => !isFinalized && handleEditDonation(donation.id)}
                    role={!isFinalized ? "button" : undefined}
                    tabIndex={!isFinalized ? 0 : undefined}
                    title={!isFinalized ? "Click to edit donation" : undefined}
                  >
                    <div>
                      <div className="font-medium">
                        {donation.memberId && (donation as DonationWithMember).member ? 
                          `${(donation as DonationWithMember).member!.lastName}, ${(donation as DonationWithMember).member!.firstName}` : 
                          "Anonymous/Visitor"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(donation.date), 'MMM d, yyyy')} • 
                        {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                      </div>
                    </div>
                    <div className="font-medium text-secondary-foreground flex items-center">
                      {formatCurrency(donation.amount)}
                      {!isFinalized && (
                        <Edit className="ml-2 h-4 w-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg text-muted-foreground">
                <p>No donations in this count yet</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Modal for adding a donation */}
        <Dialog open={isAddingDonation} onOpenChange={setIsAddingDonation}>
          <DialogContent className="sm:max-w-[800px] p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-xl font-bold">Record New Donation</DialogTitle>
            </DialogHeader>
            <DonationForm 
              defaultBatchId={batchId} 
              isInsideDialog={true} 
              onClose={() => setIsAddingDonation(false)} 
            />
          </DialogContent>
        </Dialog>
        
        {/* Modal for editing a donation */}
        <Dialog 
          open={editingDonationId !== null} 
          onOpenChange={(open) => !open && setEditingDonationId(null)}
        >
          <DialogContent className="sm:max-w-[800px] p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle className="text-xl font-bold">Edit Donation</DialogTitle>
            </DialogHeader>
            {editingDonationId && (
              <DonationForm 
                donationId={editingDonationId.toString()} 
                isEdit={true}
                defaultBatchId={batchId}
                isInsideDialog={true} 
                onClose={handleDonationAdded} 
              />
            )}
          </DialogContent>
        </Dialog>
        
        {/* Modal for attestation process - fixed version */}
        <div 
          className={`fixed inset-0 bg-black/50 z-50 items-center justify-center ${isAttesting ? 'flex' : 'hidden'}`}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-[600px] w-full max-h-[90vh] overflow-y-auto relative"
          >
            <button 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
              onClick={() => setIsAttesting(false)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="pb-4 mb-4 border-b">
              <h2 className="text-xl font-bold">Count Attestation</h2>
            </div>
            {/* Attestation form renders below */}
            {isAttesting && (
              <AttestationForm 
                batchId={batchId}
                onComplete={() => {
                  setIsAttesting(false);
                  // After attestation is complete, trigger a batch refetch and mark as finalized
                  queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
                  setIsFinalized(true);
                }}
              />
            )}
          </div>
        </div>
      </Card>
    </PageLayout>
  );
};

export default BatchDetailPage;