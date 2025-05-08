import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";
import DonationForm from "../donations/DonationForm";
import { Batch, BatchWithDonations, Donation, DonationWithMember, batchStatusEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { NoCloseDialog, NoCloseDialogContent } from "@/components/ui/no-close-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface BatchDetailProps {
  batchId: number;
  onBack: () => void;
}

const BatchDetailPage = ({ batchId, onBack }: BatchDetailProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [_, setLocation] = useLocation();
  const [isAddingDonation, setIsAddingDonation] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);

  // Fetch batch data with donations
  const { data: batch, isLoading } = useQuery<BatchWithDonations>({
    queryKey: ["/api/batches", batchId, "details"],
    refetchInterval: 5000, // Poll for updates every 5 seconds
  });

  // Calculate totals for cash and check donations
  const cashTotal = batch?.donations?.filter(d => d.donationType === "CASH")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;
  
  const checkTotal = batch?.donations?.filter(d => d.donationType === "CHECK")
    .reduce((sum, donation) => sum + parseFloat(donation.amount.toString()), 0) || 0;

  // Mutation to finalize batch
  const finalizeBatchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        `/api/batches/${batchId}`,
        "PATCH", 
        { status: "FINALIZED" }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
      
      toast({
        title: "Success",
        description: "Batch has been finalized successfully.",
        className: "bg-[#48BB78] text-white",
      });
      
      setIsFinalized(true);
      // Keep the summary visible after finalizing
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to finalize batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  const handleAddDonation = () => {
    setIsAddingDonation(true);
  };

  const handleDonationAdded = () => {
    setIsAddingDonation(false);
    queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
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
      OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
      CLOSED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  // Regular views only - PDF rendering is handled by the server
  if (isLoading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (!batch) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Count Not Found</h2>
        <p className="text-gray-600 mb-6">The requested count could not be found.</p>
        <Button onClick={onBack}>Back to Counts</Button>
      </div>
    );
  }

  // Summary view for when finalizing the batch
  if (showSummary || isFinalized) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{batch.name}</CardTitle>
            <CardDescription>
              Created on {format(new Date(batch.date), 'MMMM d, yyyy')}
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            {isFinalized && (
              <Button onClick={handlePrint} className="bg-[#69ad4c] hover:bg-[#5c9a42]">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            )}
            {!isFinalized && (
              <>
                <Button variant="outline" onClick={handleEditFromSummary}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Count
                </Button>
                <Button 
                  onClick={handleFinalizeBatch} 
                  className="bg-amber-500 hover:bg-amber-600 text-white"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Finalize Count
                </Button>
              </>
            )}
            {isFinalized && (
              <Button variant="outline" onClick={onBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Counts
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isFinalized && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertTitle className="text-blue-800">Count Finalized</AlertTitle>
              <AlertDescription className="text-blue-700">
                This count has been finalized and can no longer be edited. You can print a copy for your records.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Cash Total</div>
              <div className="text-xl font-bold text-[#48BB78]">
                {formatCurrency(cashTotal)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Check Total</div>
              <div className="text-xl font-bold text-[#48BB78]">
                {formatCurrency(checkTotal)}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="text-xl font-bold text-[#48BB78]">
                {formatCurrency(batch.totalAmount || 0)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-3">Donations in this Count</h3>
            {batch.donations && batch.donations.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-[450px] overflow-y-auto">
                {batch.donations.map((donation) => (
                  <div key={donation.id} className="p-3 flex justify-between hover:bg-gray-50">
                    <div>
                      <div className="font-medium">
                        {donation.memberId ? "Member Donation" : "Cash Donation"}
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(donation.date), 'MMM d, yyyy')} • 
                        {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                      </div>
                    </div>
                    <div className="font-medium text-[#48BB78]">
                      {formatCurrency(donation.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 border rounded-lg text-gray-500">
                <p>No donations in this count yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular batch detail view
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{batch.name}</CardTitle>
          <CardDescription>
            Created on {format(new Date(batch.date), 'MMMM d, yyyy')}
          </CardDescription>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Counts
          </Button>
          {batch.donations && batch.donations.length > 0 && (
            <Button 
              onClick={handleShowSummary}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Finalize Count
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="text-xl font-bold text-[#48BB78]">
              {formatCurrency(batch.totalAmount || 0)}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Status</div>
            <div className="flex items-center">
              <Badge className={getBadgeClass(batch.status)}>
                {batch.status}
              </Badge>
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-500">Donations</div>
            <div className="text-xl font-bold text-[#2D3748]">
              {batch.donations?.length || 0}
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
                <div key={donation.id} className="p-3 flex justify-between hover:bg-gray-50">
                  <div>
                    <div className="font-medium">
                      {donation.memberId ? "Member Donation" : "Cash Donation"}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(new Date(donation.date), 'MMM d, yyyy')} • 
                      {donation.donationType === "CASH" ? " Cash" : ` Check #${donation.checkNumber}`}
                    </div>
                  </div>
                  <div className="font-medium text-[#48BB78]">
                    {formatCurrency(donation.amount)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border rounded-lg text-gray-500">
              <p>No donations in this count yet</p>
            </div>
          )}
        </div>
      </CardContent>

      {/* Modal for adding a donation */}
      <NoCloseDialog open={isAddingDonation} onOpenChange={setIsAddingDonation}>
        <NoCloseDialogContent className="sm:max-w-[800px] p-0">
          <DonationForm 
            onClose={handleDonationAdded} 
            defaultBatchId={batchId} 
          />
        </NoCloseDialogContent>
      </NoCloseDialog>
    </Card>
  );
};

export default BatchDetailPage;