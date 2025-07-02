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
  FileText, 
  PlusCircle, 
  CheckCircle, 
  ArrowLeft,
  Printer,
  Edit,
  AlertTriangle,
  Loader2,
  X,
  UserCheck,
  Download,
  Trash2,
  MoreVertical
} from "lucide-react";
import { format } from "date-fns";
import DonationForm from "../components/donations/DonationForm";
import AttestationForm from "../components/counts/AttestationForm";
import { Batch, BatchWithDonations, Donation, DonationWithMember, batchStatusEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  MobileDialog, 
  MobileDialogContent,

  MobileDialogHeader, 
  MobileDialogTitle 
} from "@/components/ui/mobile-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, useParams } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageLayout from "@/components/layout/PageLayout";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { openPdfExternally, downloadPdfDirectly, isiOS, isPWA } from "@/lib/pdf-utils";

const BatchSummaryPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  const { isAdmin, isAccountOwner } = useAuth();
  
  // For summary page, we always treat it as finalized
  const [showSummary, setShowSummary] = useState(true);
  const [isFinalized, setIsFinalized] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Debug delete confirmation dialog state
  useEffect(() => {
    console.log("showDeleteConfirm state changed to:", showDeleteConfirm);
  }, [showDeleteConfirm]);

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

  // Calculate totals for cash and check donations
  const cashTotal = batch?.donations?.filter(d => d.donationType === "CASH")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;
  
  const checkTotal = batch?.donations?.filter(d => d.donationType === "CHECK")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;

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
      // Invalidate all relevant queries to ensure full UI refresh
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches/latest-finalized"] });
      
      // Also invalidate any dashboard-related data
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      
      toast({
        title: "Success",
        description: "Count has been deleted successfully.",
      });
      
      // Navigate back to the dashboard
      handleBackToDashboard();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete count: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handlePrint = () => {
    // Use enhanced PDF opening for PWA compatibility
    if (batch && batch.id) {
      openPdfExternally(`/api/batches/${batch.id}/pdf-report`);
    } else {
      console.error("Cannot generate PDF: Batch ID not available");
      toast({
        title: "Error",
        description: "Unable to generate PDF report. Batch information is missing.",
        variant: "destructive",
      });
    }
  }

  const handleDownloadPdf = () => {
    // Direct download for iOS PWA users
    if (batch && batch.id) {
      downloadPdfDirectly(`/api/batches/${batch.id}/pdf-report`, `batch-${batch.id}-report.pdf`);
    } else {
      toast({
        title: "Error",
        description: "Unable to download PDF report. Batch information is missing.",
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

  // Add a helper to get friendly status display names
  const getStatusDisplayName = (status: string): string => {
    if (status === "PENDING_FINALIZATION") return "OPEN";
    return status;
  };

  const getBadgeClass = (status: string) => {
    const statusColors = {
      OPEN: "bg-primary/20 text-primary hover:bg-primary/30",
      PENDING_FINALIZATION: "bg-primary/20 text-primary hover:bg-primary/30", // Same style as OPEN
      FINALIZED: "bg-accent/20 text-accent hover:bg-accent/30",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-muted text-muted-foreground";
  };

  // Optimized navigation using hybrid approach
  const handleBackToDashboard = () => {
    // First invalidate the queries to ensure fresh data
    queryClient.invalidateQueries({ queryKey: ['/api/batches'] });
    queryClient.invalidateQueries({ queryKey: ['/api/batches/latest-finalized'] });
    
    // Then use client-side navigation for better performance
    setLocation("/dashboard");
  };
  
  // Show delete confirmation dialog when the three-dot menu delete option is clicked
  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };
  
  const handleDeleteBatch = () => {
    deleteBatchMutation.mutate();
  };

  // View handling
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
          <Button onClick={handleBackToDashboard}>Back to Dashboard</Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout 
      title={batch.name}
    >
      <Card>
        <CardHeader className="pb-2">
          {/* Header with buttons in a row */}
          <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
            {/* Left side - Back button - Stack vertically on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={handleBackToDashboard} className="w-full sm:w-auto">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              {isPWA() && isiOS() ? (
                <>
                  <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white w-full sm:w-auto">
                    <Printer className="mr-2 h-4 w-4" />
                    Open PDF (External)
                  </Button>
                  <Button onClick={handleDownloadPdf} variant="outline" className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c] hover:text-white w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </>
              ) : (
                <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white w-full sm:w-auto">
                  <Printer className="mr-2 h-4 w-4" />
                  View PDF Report
                </Button>
              )}

              {/* Delete confirmation dialog with warning */}
              {showDeleteConfirm && (
                <div className="ml-2 flex flex-col border border-red-200 bg-red-50 rounded-md p-3">
                  <div className="mb-2">
                    <h4 className="text-sm font-semibold text-red-700 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Warning: This action cannot be undone
                    </h4>
                    <p className="text-xs text-gray-700 mt-1">
                      Deleting this count will permanently remove all associated donation records and reports.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
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
                        "Delete Permanently"
                      )}
                    </Button>
                  </div>
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
                    <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!showDeleteConfirm && (
                      <DropdownMenuItem onClick={handleShowDeleteConfirm} className="text-red-600 cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Count
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-2">
          {isFinalized && (
            <Alert className="mb-3 py-2 bg-muted">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle className="text-base">Count Finalized</AlertTitle>
              <AlertDescription>
                This count has been finalized and can no longer be edited. You can view and print a PDF report for your records.
                
                {/* Attestation Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-3 pt-3 border-t border-muted-foreground/20">
                  <div className="text-sm">
                    <span className="font-medium">Primary Attestor:</span>{" "}
                    <span>{batch.primaryAttestorName || "Unknown"}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Secondary Attestor:</span>{" "}
                    <span>{batch.secondaryAttestorName || "Unknown"}</span>
                  </div>
                  <div className="text-sm mt-1 col-span-1 sm:col-span-2">
                    <span className="font-medium">Finalized on:</span>{" "}
                    <span>
                      {batch.attestationConfirmationDate ?
                        format(new Date(batch.attestationConfirmationDate), "MMMM d, yyyy 'at' h:mm a") : 
                        "Unknown"}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Cash Total</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(cashTotal)}
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Check Total</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(checkTotal)}
                </div>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-sm text-muted-foreground">Total Amount</div>
                <div className="text-xl font-bold text-secondary-foreground">
                  {formatCurrency(batch.totalAmount)}
                </div>
              </div>
            </div>
          </div>

          <h3 className="text-lg font-bold mt-2 mb-4">Donations in this Count</h3>
          <div className="border rounded-md">
            {batch.donations && batch.donations.map((donation, index) => (
              <div key={donation.id} className={`p-4 ${index !== 0 ? 'border-t' : ''}`}>
                <div className="flex flex-col sm:flex-row justify-between">
                  <div>
                    <h4 className="font-semibold">
                      {donation.member?.firstName && donation.member?.lastName
                        ? `${donation.member.lastName}, ${donation.member.firstName}`
                        : "Cash Donation"}
                    </h4>
                    <div className="text-sm text-muted-foreground flex items-center mt-1">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {format(new Date(donation.date), "MMMM d, yyyy")}
                      
                      {donation.donationType === "CHECK" && donation.checkNumber && (
                        <>
                          <span className="mx-1.5">•</span>
                          <span>Check #{donation.checkNumber}</span>
                        </>
                      )}
                      
                      {donation.donationType === "CASH" && (
                        <>
                          <span className="mx-1.5">•</span>
                          <span>Cash</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-right">
                    <div className="text-xl font-bold">
                      {formatCurrency(donation.amount)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {(!batch.donations || batch.donations.length === 0) && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No donations have been added to this count yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default BatchSummaryPage;