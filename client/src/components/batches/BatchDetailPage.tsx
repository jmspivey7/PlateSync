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
import { Batch, BatchWithDonations, Donation, batchStatusEnum } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const [isPrintView, setIsPrintView] = useState(false);

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
        "PATCH", 
        `/api/batches/${batchId}`, 
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
      OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
      CLOSED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  // Print-specific styles
  if (isPrintView) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">{batch?.name} - Donation Summary</h1>
          <p className="text-gray-500">{format(new Date(batch?.date || new Date()), 'MMMM d, yyyy')}</p>
          <p className="text-gray-500">Status: {batch?.status}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Cash Total</h2>
            <p className="text-xl">{formatCurrency(cashTotal)}</p>
          </div>
          <div className="border p-4 rounded">
            <h2 className="text-lg font-bold mb-2">Check Total</h2>
            <p className="text-xl">{formatCurrency(checkTotal)}</p>
          </div>
        </div>

        <div className="border p-4 rounded mb-6">
          <h2 className="text-lg font-bold mb-2">Total Donations</h2>
          <p className="text-xl">{formatCurrency(parseFloat(batch?.totalAmount?.toString() || "0"))}</p>
        </div>

        <h2 className="text-xl font-bold mb-4">Donation Details</h2>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="text-left py-2">Donor</th>
              <th className="text-left py-2">Date</th>
              <th className="text-left py-2">Type</th>
              <th className="text-left py-2">Details</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {batch?.donations?.map((donation) => (
              <tr key={donation.id} className="border-b border-gray-200">
                <td className="py-2">
                  {donation.member ? 
                    `${donation.member.firstName} ${donation.member.lastName}` : 
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

        <div className="mt-10 text-center text-gray-500 text-sm">
          <p>Printed on {format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          <p>PlateSync - Church Donation Management</p>
        </div>
      </div>
    );
  }

  // Regular view (not print view)
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
              <Button onClick={handlePrint} className="bg-[#4299E1] hover:bg-[#4299E1]/90">
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
                  className="bg-[#48BB78] hover:bg-[#48BB78]/90"
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
                        {donation.member ? 
                          `${donation.member.firstName} ${donation.member.lastName}` : 
                          "Anonymous/Visitor"}
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
              className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
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
            className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white w-full md:w-auto"
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
                      {donation.member ? 
                        `${donation.member.firstName} ${donation.member.lastName}` : 
                        "Anonymous/Visitor"}
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
      <Dialog open={isAddingDonation} onOpenChange={setIsAddingDonation}>
        <DialogContent className="sm:max-w-[800px] p-0">
          <DonationForm onClose={handleDonationAdded} defaultBatchId={batchId} />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BatchDetailPage;