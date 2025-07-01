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
  Trash2,
  MoreVertical,
  Download
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


const BatchDetailPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  const { isAdmin, isAccountOwner } = useAuth();
  
  // Check if we're on the summary route
  const isSummaryRoute = location.includes('batch-summary');
  
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [editingDonationId, setEditingDonationId] = useState<number | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  
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
  
  // Debug delete confirmation dialog state
  useEffect(() => {
    console.log("showDeleteConfirm state changed to:", showDeleteConfirm);
  }, [showDeleteConfirm]);

  // Debug PDF modal state
  useEffect(() => {
    console.log("🚨 isPdfModalOpen state changed to:", isPdfModalOpen);
  }, [isPdfModalOpen]);

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
  // and also handle the summary route state
  useEffect(() => {
    if (batch) {
      // If it's finalized, update state
      if (batch.status === "FINALIZED") {
        setIsFinalized(true);
      }
      
      // If we're on the summary route, force summary view regardless of finalization status
      if (isSummaryRoute) {
        setShowSummary(true);
        setIsFinalized(true); // Treat it as finalized to show the right UI
      }
    }
  }, [batch, isSummaryRoute]);

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
  
  // Function was moved down below
  
  const handleEditDonation = (donationId: number) => {
    // Only allow editing if batch is not finalized
    if (!isFinalized) {
      setEditingDonationId(donationId);
    }
  };
  
  // Mutation for deleting a donation
  const deleteDonationMutation = useMutation({
    mutationFn: async (donationId: number) => {
      return await apiRequest(`/api/donations/${donationId}`, "DELETE");
    },
    onSuccess: () => {
      // Invalidate relevant queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      
      toast({
        title: "Success",
        description: "Donation has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete donation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });
  
  const [isDeletingDonation, setIsDeletingDonation] = useState<number | null>(null);
  
  const handleDeleteDonation = (donationId: number) => {
    // Set the donation ID that's being deleted to show confirmation
    setIsDeletingDonation(donationId);
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
    console.log("Creating PDF viewer directly");
    
    if (!batch || !batch.id) {
      toast({
        title: "Error",
        description: "Unable to generate PDF report. Batch information is missing.",
        variant: "destructive",
      });
      return;
    }

    // Remove existing PDF viewer if present
    const existingViewer = document.getElementById('pdf-viewer-container');
    if (existingViewer) {
      existingViewer.remove();
    }

    // Create PDF viewer container
    const container = document.createElement('div');
    container.id = 'pdf-viewer-container';
    container.className = 'mt-6 bg-white border rounded-lg shadow-lg';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg';
    header.innerHTML = `
      <h3 class="text-lg font-semibold text-gray-900">PDF Report - ${batch.name || `Batch ${batch.id}`}</h3>
      <div class="flex gap-2">
        <button id="download-pdf" class="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700">Download</button>
        <button id="print-pdf" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Print</button>
        <button id="close-pdf" class="px-2 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">×</button>
      </div>
    `;
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.src = `/api/batches/${batch.id}/pdf-report`;
    iframe.className = 'w-full border-0';
    iframe.style.height = '400px';
    iframe.title = `Count Report - ${batch.name || `Batch ${batch.id}`}`;
    
    // Assemble container
    container.appendChild(header);
    container.appendChild(iframe);
    
    // Insert after the main card
    const pageLayout = document.querySelector('[data-page-layout]') || document.body;
    pageLayout.appendChild(container);
    
    // Add event listeners
    document.getElementById('download-pdf')?.addEventListener('click', () => {
      const link = document.createElement('a');
      link.href = `/api/batches/${batch.id}/pdf-report`;
      link.download = `count-report-${batch.name || batch.id}.pdf`;
      link.click();
    });
    
    document.getElementById('print-pdf')?.addEventListener('click', () => {
      const printWindow = window.open(`/api/batches/${batch.id}/pdf-report`, '_blank');
      if (printWindow) {
        printWindow.onload = () => printWindow.print();
      }
    });
    
    document.getElementById('close-pdf')?.addEventListener('click', () => {
      container.remove();
    });
    
    // Scroll to the PDF viewer
    container.scrollIntoView({ behavior: 'smooth' });
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

  const handleBackToCounts = () => {
    setLocation("/counts");
  };
  
  // Show delete confirmation dialog when the three-dot menu delete option is clicked
  const handleShowDeleteConfirm = () => {
    setShowDeleteConfirm(true);
  };
  
  // Using the existing deleteBatchMutation defined above
  
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
      >
        <Card>
          <CardHeader className="pb-2">
            {/* Header with buttons in a row */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
              {/* Left side - Back button - Stack vertically on mobile */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                {isFinalized && (
                  <Button variant="outline" onClick={handleBackToCounts} className="w-full sm:w-auto">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Counts
                  </Button>
                )}
                {isFinalized && (
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
                {!isFinalized && (
                  <Button variant="outline" onClick={handleEditFromSummary}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Count
                  </Button>
                )}
              </div>
              
              {/* Right side - Title and description */}
              <div className="text-left sm:text-right flex items-start w-full sm:w-auto">
                <div className="flex-1">
                  <CardTitle className="text-xl sm:text-2xl">Count Summary</CardTitle>
                  <CardDescription>
                    Review and finalize your count
                  </CardDescription>
                </div>
                
                {/* Three-dot menu - Only show for Account Owners */}
                {/* Show delete menu for Account Owners on finalized counts */}
                {isFinalized && isAccountOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="h-8 w-8 p-0 ml-2 bg-white hover:bg-gray-100">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-md">
                      <DropdownMenuItem 
                        onClick={handleShowDeleteConfirm}
                        className="text-red-600 cursor-pointer bg-white hover:bg-gray-100"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Count
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                {/* Show delete menu for ALL users on open/pending counts */}
                {!isFinalized && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="h-8 w-8 p-0 ml-2 bg-white hover:bg-gray-100">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-md">
                      <DropdownMenuItem 
                        onClick={handleShowDeleteConfirm}
                        className="text-red-600 cursor-pointer bg-white hover:bg-gray-100"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Count
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
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
                    className="bg-amber-500 hover:bg-amber-600 text-white"
                    disabled={prepareAttestationMutation.isPending}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    {prepareAttestationMutation.isPending ? "Preparing..." : "Attest & Finalize"}
                  </Button>
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
                  {formatCurrency(cashTotal + checkTotal)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Donations in this Count</h3>
              {batch.donations && batch.donations.length > 0 ? (
                <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                  {batch.donations.map((donation) => (
                    <div key={donation.id} className="p-2.5 flex justify-between hover:bg-muted">
                      <div>
                        <div className="font-medium">
                          {donation.memberId && (donation as DonationWithMember).member ? 
                            `${(donation as DonationWithMember).member!.lastName}, ${(donation as DonationWithMember).member!.firstName}` : 
                            "Cash Donation"}
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
                <div className="text-center py-4 border rounded-lg text-muted-foreground">
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
    >
      <Card className="p-6">
          {/* Top section - With full mobile responsiveness */}
          <div className="w-full flex flex-col md:flex-row justify-between items-start mb-8 gap-4">
            {/* Left side - Action buttons - Stack vertically on mobile */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={handleBackToCounts} className="h-12 whitespace-nowrap">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Counts
              </Button>
              
              {batch.donations && batch.donations.length > 0 && batch.status !== "FINALIZED" && (
                <Button 
                  onClick={() => {
                    console.log("Finalize Count button clicked");
                    prepareAttestationMutation.mutate();
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white h-12 whitespace-nowrap"
                  disabled={prepareAttestationMutation.isPending}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  {prepareAttestationMutation.isPending ? "Preparing..." : "Finalize Count"}
                </Button>
              )}
            </div>
            
            {/* Right side - Title and Status - Full width on mobile */}
            <div className="text-left md:text-right flex items-start w-full md:w-auto">
              <div className="flex-1">
                <CardTitle className="text-xl md:text-2xl">Count Details</CardTitle>
                <CardDescription className="mt-1">
                  Status: <Badge className={getBadgeClass(batch.status)}>{getStatusDisplayName(batch.status)}</Badge>
                </CardDescription>
              </div>
              
              {/* Three-dot menu - Show for all users on non-finalized counts */}
              {batch.status !== "FINALIZED" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" className="h-8 w-8 p-0 ml-2 bg-white hover:bg-gray-100">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-white border border-gray-200 shadow-md">
                    <DropdownMenuItem 
                      onClick={handleShowDeleteConfirm}
                      className="text-red-600 cursor-pointer bg-white hover:bg-gray-100"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Count
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
          {/* Amount summary section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="mb-2">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-2xl font-bold text-secondary-foreground">
                {formatCurrency(cashTotal + checkTotal)}
              </div>
            </div>
            <div className="mb-2">
              <div className="text-sm text-muted-foreground">Cash Total</div>
              <div className="text-2xl font-bold text-secondary-foreground">
                {formatCurrency(cashTotal)}
              </div>
            </div>
            <div className="mb-2">
              <div className="text-sm text-muted-foreground">Check Total</div>
              <div className="text-2xl font-bold text-secondary-foreground">
                {formatCurrency(checkTotal)}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between mb-4">
            <Button 
              onClick={handleAddDonation}
              className="bg-green-600 hover:bg-green-700 text-white h-12 px-4 sm:px-6 w-full sm:w-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Donations
            </Button>
          </div>

          {/* Donations section */}
          <div>
            <h3 className="font-medium mb-2">Donations in this Count</h3>
            {batch.donations && batch.donations.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {batch.donations.map((donation) => (
                  <div 
                    key={donation.id} 
                    className={`p-2.5 flex justify-between group ${!isFinalized ? "hover:bg-green-100 cursor-pointer transition-colors duration-200" : ""}`}
                    onClick={(e) => {
                      // Only trigger edit if we didn't click the delete button
                      if (!isFinalized && !e.defaultPrevented) {
                        handleEditDonation(donation.id);
                      }
                    }}
                    role={!isFinalized ? "button" : undefined}
                    tabIndex={!isFinalized ? 0 : undefined}
                    title={!isFinalized ? "Click to edit donation" : undefined}
                  >
                    <div>
                      <div className="font-medium">
                        {donation.memberId && (donation as DonationWithMember).member ? 
                          `${(donation as DonationWithMember).member!.lastName}, ${(donation as DonationWithMember).member!.firstName}` : 
                          "Cash Donation"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(donation.date), 'MMM d, yyyy')} • 
                        {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                      </div>
                    </div>
                    <div className="font-medium text-secondary-foreground flex items-center text-xl">
                      {formatCurrency(donation.amount)}
                      <div className="ml-2 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        {!isFinalized && (
                          <>
                            <Edit className="h-4 w-4 text-green-600 mr-2" />
                            <Trash2 
                              className="h-4 w-4 text-red-600 hover:text-red-700 cursor-pointer" 
                              onClick={(e) => {
                                e.preventDefault(); // Prevent edit from triggering
                                e.stopPropagation(); // Prevent event bubbling
                                handleDeleteDonation(donation.id);
                              }}
                              aria-label="Delete donation"
                            />
                          </>
                        )}
                      </div>
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

        {/* Modal for adding a donation */}
        <MobileDialog open={isAddingDonation} onOpenChange={setIsAddingDonation}>
          <MobileDialogContent className="sm:max-w-[800px] p-0">
            <MobileDialogHeader className="px-6 pt-6 pb-0">
              <MobileDialogTitle className="text-xl font-bold">Add Donation</MobileDialogTitle>
            </MobileDialogHeader>
            <DonationForm 
              defaultBatchId={batchId} 
              isInsideDialog={true} 
              onClose={() => setIsAddingDonation(false)} 
            />
          </MobileDialogContent>
        </MobileDialog>
        
        {/* Modal for editing a donation */}
        <MobileDialog 
          open={editingDonationId !== null} 
          onOpenChange={(open) => !open && setEditingDonationId(null)}
        >
          <MobileDialogContent className="sm:max-w-[800px] p-0">
            <MobileDialogHeader className="px-6 pt-6 pb-0">
              <MobileDialogTitle className="text-xl font-bold">Edit Donation</MobileDialogTitle>
            </MobileDialogHeader>
            {editingDonationId && (
              <DonationForm 
                donationId={editingDonationId.toString()} 
                isEdit={true}
                defaultBatchId={batchId}
                isInsideDialog={true} 
                onClose={handleDonationAdded} 
              />
            )}
          </MobileDialogContent>
        </MobileDialog>
        
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
                  // First set both states to ensure the summary view shows immediately
                  setIsAttesting(false);
                  setShowSummary(true);
                  setIsFinalized(true);
                  
                  // Then trigger the refetch to update the data
                  queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
                }}
              />
            )}
          </div>
        </div>
        
        {/* Batch Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Delete Count</h3>
              <div className="mb-6">
                <p className="mb-2">Are you sure you want to delete this count?</p>
                <p className="text-muted-foreground text-sm">This action cannot be undone, and all donation data will be permanently lost.</p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    console.log("Delete button in dialog clicked");
                    handleDeleteBatch();
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteBatchMutation.isPending}
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Count"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Donation Delete Confirmation Dialog */}
        {isDeletingDonation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4">Delete Donation</h3>
              <div className="mb-6">
                <p className="mb-2">Are you sure you want to delete this donation?</p>
                <p className="text-muted-foreground text-sm">
                  This action cannot be undone. The donation amount will be removed from the count total.
                </p>
              </div>
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeletingDonation(null)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (isDeletingDonation) {
                      deleteDonationMutation.mutate(isDeletingDonation);
                      setIsDeletingDonation(null);
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  disabled={deleteDonationMutation.isPending}
                >
                  {deleteDonationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Donation"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
      

    </PageLayout>
  );
};

export default BatchDetailPage;