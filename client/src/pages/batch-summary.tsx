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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Calendar,
  DollarSign, 
  FileCheck, 
  Hash, 
  Printer, 
  AlertTriangle,
  ArrowLeft,
  Check,
  CreditCard,
  MoreVertical,
  Users,
  X,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { useParams, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Donation, Member, Batch } from "@shared/schema";
import { apiRequest, queryClient as queryClientExport } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

// Define types to include member details with donations
interface DonationWithMember extends Donation {
  member?: Member;
}

// Define type for batch with donations
interface BatchWithDonations extends Batch {
  donations: DonationWithMember[];
}

// BatchSummary is a dedicated component for showing finalized batch in summary view
const BatchSummaryPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  const { isAdmin, isAccountOwner } = useAuth();
  
  // Check if this page was loaded immediately after finalization
  // This will be used to determine if we should show "Back to Dashboard" instead of "Back to Counts"
  const [justFinalized, setJustFinalized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Check if we came directly from the attestation flow
  useEffect(() => {
    // Check for URL param that indicates we just finalized the count
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('finalized') === 'true') {
      setJustFinalized(true);
      
      // Clean up the URL to prevent state persistence on refresh
      // This preserves "Back to Dashboard" behavior but allows normal navigation later
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, []);
  
  // Fetch batch details
  const { data: batch, isLoading, error } = useQuery<BatchWithDonations>({
    queryKey: ["/api/batches", batchId, "details"],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Poll for updates every 5 seconds
  });

  // Mutation to delete batch
  const deleteBatchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      if (!response.ok) {
        throw new Error("Failed to delete count");
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      
      toast({
        title: "Success",
        description: "Count has been deleted successfully.",
      });
      
      // Navigate back to the counts page
      handleBackToCounts();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Calculate totals for cash and check donations
  const cashTotal = batch?.donations?.filter(d => d.donationType === "CASH")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;
  
  const checkTotal = batch?.donations?.filter(d => d.donationType === "CHECK")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;

  const handlePrint = () => {
    // Open the PDF report in a new tab, ensuring we have the correct batch ID
    if (batch && batch.id) {
      window.open(`/api/batches/${batch.id}/pdf-report`, '_blank');
    } else {
      console.error("Cannot generate PDF: Batch ID not available");
      toast({
        title: "Error",
        description: "Unable to generate PDF report. Batch information is missing.",
        variant: "destructive",
      });
    }
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
    // If we just finalized, go to dashboard instead of counts page
    if (justFinalized) {
      // Redirect to dashboard to show the latest data
      setLocation("/dashboard");
    } else {
      setLocation("/counts");
    }
  };
  
  const handleShowDeleteConfirm = () => {
    console.log("Delete button clicked, setting showDeleteConfirm to true");
    setShowDeleteConfirm(true);
    console.log("Current showDeleteConfirm value:", showDeleteConfirm);
  };
  
  const handleDeleteBatch = () => {
    deleteBatchMutation.mutate();
  };

  // View handling
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Count Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested count could not be found.</p>
          <Button onClick={handleBackToCounts}>Back to Counts</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">{batch.name}</h1>
      
      {/* Prominent Count Finalized Message */}
      {batch.status === "FINALIZED" && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-4 flex items-start">
          <Check className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800">Count Finalized</h3>
            <p className="text-green-700 mb-2">This count has been finalized and can no longer be edited. You can view and print a PDF report for your records.</p>
            
            <div className="mt-3 pt-3 border-t border-green-200 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <div className="flex items-center">
                <span className="text-green-700">Primary Attestor:</span>
                <span className="ml-1.5 font-medium text-green-900">{batch.primaryAttestorName || "Unknown"}</span>
              </div>
              <div className="flex items-center">
                <span className="text-green-700">Secondary Attestor:</span>
                <span className="ml-1.5 font-medium text-green-900">{batch.secondaryAttestorName || "Unknown"}</span>
              </div>
              <div className="flex items-center col-span-1 sm:col-span-2 mt-1">
                <span className="text-green-700">Finalized on:</span>
                <span className="ml-1.5 font-medium text-green-900">
                  {batch.attestationConfirmationDate ? 
                    format(new Date(batch.attestationConfirmationDate), "MMMM d, yyyy 'at' h:mm a") : 
                    "Unknown"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Card>
        <CardHeader className="pb-2">
          {/* Header with buttons in a row */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            {/* Left side - Back button - Stack vertically on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleBackToCounts} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {justFinalized ? 'Back to Dashboard' : 'Back to Counts'}
              </Button>
              <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" />
                View PDF Report
              </Button>

              {/* Inline confirmation buttons that replace the Delete button when clicked */}
              {isAccountOwner && showDeleteConfirm && (
                <div className="ml-2 flex gap-2 items-center border border-gray-200 rounded-md p-1.5">
                  <span className="text-sm font-medium text-gray-700 mr-1">Confirm deletion?</span>
                  <Button 
                    size="sm"
                    variant="outline" 
                    onClick={() => setShowDeleteConfirm(false)}
                    className="border-gray-300 text-gray-600"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleDeleteBatch}
                    className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={deleteBatchMutation.isPending}
                  >
                    {deleteBatchMutation.isPending ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Confirm Delete"
                    )}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Right side - Title and description */}
            <div className="text-left sm:text-right flex items-start w-full sm:w-auto">
              <div className="flex-1">
                <CardTitle className="text-xl sm:text-2xl">Count Summary</CardTitle>
                <CardDescription>
                  Review your finalized count
                </CardDescription>
              </div>
              
              {/* Three-dot menu - Only show for account owners */}
              {isAccountOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="h-8 w-8 p-0 ml-2 bg-white hover:bg-gray-100">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!showDeleteConfirm && (
                      <DropdownMenuItem onClick={handleShowDeleteConfirm} className="text-red-600 cursor-pointer">
                        Delete Count
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Batch information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Date</p>
                <p className="font-medium">
                  {format(new Date(batch.date), "MM/dd/yyyy")}
                </p>
              </div>
            </div>
            
            <div className="flex items-center">
              <Hash className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Count #</p>
                <p className="font-medium">{batch.id}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <FileCheck className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant="outline" className={getBadgeClass(batch.status)}>
                  {batch.status}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-muted-foreground mr-2" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(batch.totalAmount || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Attestation information */}
          {batch.status === "FINALIZED" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t pt-4">
              <div className="flex items-start">
                <Users className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attestation</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 mr-1" />
                      <span className="font-medium">Primary:</span>
                      <span className="ml-1">{batch.primaryAttestorName || "Unknown"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 mr-1" />
                      <span className="font-medium">Secondary:</span>
                      <span className="ml-1">{batch.secondaryAttestorName || "Unknown"}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Check className="h-3.5 w-3.5 text-green-500 mr-1" />
                      <span className="font-medium">Date:</span>
                      <span className="ml-1">
                        {batch.attestationConfirmationDate ? 
                          format(new Date(batch.attestationConfirmationDate), "MM/dd/yyyy hh:mm a") : 
                          "Unknown"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start">
                <DollarSign className="h-5 w-5 text-muted-foreground mr-2 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Breakdown</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-center text-sm">
                      <CreditCard className="h-3.5 w-3.5 text-blue-500 mr-1" />
                      <span className="font-medium">Check:</span>
                      <span className="ml-1">{formatCurrency(checkTotal)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-3.5 w-3.5 text-green-500 mr-1" />
                      <span className="font-medium">Cash:</span>
                      <span className="ml-1">{formatCurrency(cashTotal)}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="font-medium ml-5">Total:</span>
                      <span className="ml-1 text-green-600 font-bold">{formatCurrency(parseFloat(batch.totalAmount) || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        
        {/* Main content */}
        <CardContent>
          {/* Content based on view state */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Donation List</h3>
            
            {batch.donations && batch.donations.length > 0 ? (
              <div className="overflow-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="p-2 font-semibold">Donor</th>
                      <th className="p-2 font-semibold">Date</th>
                      <th className="p-2 font-semibold">Type</th>
                      <th className="p-2 font-semibold">Check #</th>
                      <th className="p-2 font-semibold text-right">Amount</th>
                      <th className="p-2 font-semibold">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.donations.map((donation) => (
                      <tr key={donation.id} className="border-b hover:bg-gray-50">
                        <td className="p-2">
                          {donation.member ? (
                            <span className="font-medium">
                              {donation.member.lastName}, {donation.member.firstName}
                            </span>
                          ) : (
                            <span className="text-gray-500 italic">Anonymous</span>
                          )}
                        </td>
                        <td className="p-2">{format(new Date(donation.date), "MM/dd/yyyy")}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={
                            donation.donationType === "CASH" 
                              ? "bg-green-50 text-green-600" 
                              : "bg-blue-50 text-blue-600"
                          }>
                            {donation.donationType}
                          </Badge>
                        </td>
                        <td className="p-2">{donation.checkNumber || "—"}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(donation.amount)}</td>
                        <td className="p-2 max-w-[200px] truncate">{donation.notes || "—"}</td>
                      </tr>
                    ))}
                    
                    {/* Summary row */}
                    <tr className="bg-gray-50 font-semibold">
                      <td colSpan={4} className="p-2 text-right">Total:</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(parseFloat(batch.totalAmount))}</td>
                      <td className="p-2"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-6 text-center rounded-md">
                <p className="text-gray-500">No donations have been added to this count yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Export the BatchSummaryPage component
export default BatchSummaryPage;