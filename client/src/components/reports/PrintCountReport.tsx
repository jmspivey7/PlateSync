import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Printer, FileText, ArrowLeft, Download } from "lucide-react";
import { Batch, Donation } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useLocation } from "wouter";
import { PdfModal } from "@/components/ui/pdf-modal";

interface PrintCountReportProps {
  batchId: number;
  onBack?: () => void;
}

const PrintCountReport: React.FC<PrintCountReportProps> = ({ batchId, onBack }) => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Fetch batch details
  const { data: batch, isLoading: isBatchLoading } = useQuery<Batch>({
    queryKey: [`/api/batches/${batchId}`],
  });

  // Fetch donations for this batch
  const { data: donations, isLoading: isDonationsLoading } = useQuery<Donation[]>({
    queryKey: [`/api/batches/${batchId}/donations`],
    enabled: !!batch,
  });

  const handlePrintPDF = () => {
    setIsPdfModalOpen(true);
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const handleBackToFinalized = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/counts?filter=FINALIZED");
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    if (!donations) return { cashTotal: 0, checkTotal: 0, grandTotal: 0, donationCount: 0 };
    
    const cashTotal = donations
      .filter(d => d.donationType === "CASH")
      .reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
    
    const checkTotal = donations
      .filter(d => d.donationType === "CHECK")
      .reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
    
    return {
      cashTotal,
      checkTotal,
      grandTotal: cashTotal + checkTotal,
      donationCount: donations.length
    };
  };

  const { cashTotal, checkTotal, grandTotal, donationCount } = calculateTotals();

  // Loading state
  if (isBatchLoading || isDonationsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Regular view
  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Count Report</CardTitle>
        <CardDescription>
          Print this detailed report to include with the money bag
        </CardDescription>
      </CardHeader>
      <CardContent>
        {batch && (
          <>
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={handleBackToFinalized}
                className="mb-6"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Counts
              </Button>
            </div>

            <div className={`border rounded-md p-4 mb-6 ${
              batch.status === 'FINALIZED' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <h3 className={`font-medium flex items-center ${
                batch.status === 'FINALIZED' ? 'text-green-800' : 'text-blue-800'
              }`}>
                <FileText className="h-5 w-5 mr-2" />
                {batch.status === 'FINALIZED' 
                  ? 'Count Finalized Successfully' 
                  : 'Count Report'
                }
              </h3>
              <p className={batch.status === 'FINALIZED' ? 'text-green-700 mt-1' : 'text-blue-700 mt-1'}>
                {batch.status === 'FINALIZED'
                  ? `Count ${batch.name} has been finalized and attested by two people.
                     Please print the detailed PDF report to include with the money bag.`
                  : `This is a detailed report for count ${batch.name}.
                     Please print the PDF to include with the money bag.`
                }
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-md p-4">
                  <p className="text-sm text-muted-foreground">Cash Total</p>
                  <p className="text-xl font-medium">{formatCurrency(cashTotal)}</p>
                </div>
                <div className="border rounded-md p-4">
                  <p className="text-sm text-muted-foreground">Check Total</p>
                  <p className="text-xl font-medium">{formatCurrency(checkTotal)}</p>
                </div>
                <div className="border rounded-md p-4">
                  <p className="text-sm text-muted-foreground">Number of Donations</p>
                  <p className="text-xl font-medium">{donationCount}</p>
                </div>
                <div className="border rounded-md p-4 bg-gray-50">
                  <p className="text-sm text-muted-foreground">Grand Total</p>
                  <p className="text-xl font-bold">{formatCurrency(grandTotal)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Button 
                  onClick={handlePrintPDF}
                  className="w-full bg-[#69ad4c] hover:bg-[#5a9941] text-white"
                >
                  <Printer className="mr-2 h-5 w-5" />
                  View & Print PDF Report
                </Button>
                
                <p className="text-xs text-center text-muted-foreground">
                  The PDF report includes all donation details and matches the format of emailed reports.
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
    
    {/* PDF Modal */}
    {batch && (
      <PdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={`/api/batches/${batchId}/pdf-report`}
        title={`Count Report - ${batch.name || `Batch ${batch.id}`}`}
        batchId={batchId.toString()}
      />
    )}
    </>
  );
};

export default PrintCountReport;