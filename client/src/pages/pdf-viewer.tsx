import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PDFViewer() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/pdf-viewer/:batchId/:type");
  const { toast } = useToast();
  const embedRef = useRef<HTMLEmbedElement>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [pdfBlob, setPdfBlob] = useState<string>("");
  const [referrer, setReferrer] = useState<string>("/");

  const batchId = params?.batchId;
  const type = params?.type; // 'count' or 'receipt'

  useEffect(() => {
    if (batchId && type) {
      // Construct the PDF URL based on type
      const url = type === 'count' 
        ? `/api/batches/${batchId}/pdf-report`
        : `/api/batches/${batchId}/receipt-report/pdf`;
      
      console.log('Loading PDF from:', url);
      setPdfUrl(url);
      
      // Set loading timeout since iframe load events are tricky
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      
      return () => clearTimeout(timer);
      
      // Set appropriate referrer based on type
      if (type === 'count') {
        setReferrer(`/batch-summary/${batchId}`);
      } else if (type === 'receipt') {
        setReferrer(`/batch/${batchId}`);
      } else {
        setReferrer("/counts");
      }
    }

    // Cleanup blob URL on unmount
    return () => {
      if (pdfBlob) {
        URL.revokeObjectURL(pdfBlob);
      }
    };
  }, [batchId, type, toast]);

  const handlePrint = () => {
    try {
      // For embed elements, we need to trigger print differently
      // First try to use window.print() which should print the current page including the embed
      window.print();
      
      toast({
        title: "Print Dialog Opened",
        description: "Your browser's print dialog should now be open.",
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Error",
        description: "Unable to open print dialog. Please try downloading instead.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      console.log('Downloading PDF from:', pdfUrl);
      
      // Fetch the PDF as a blob
      const response = await fetch(pdfUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch PDF');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type}-report-batch-${batchId}.pdf`;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Your PDF is being downloaded.",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    console.log('Navigating back to:', referrer);
    setLocation(referrer);
  };



  if (!batchId || !type) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Invalid PDF Request</h1>
          <p className="mt-2 text-gray-600">Missing batch ID or report type.</p>
          <Button onClick={() => setLocation('/')} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {type === 'count' ? 'Count Report' : 'Receipt Report'}
            </h1>
            <p className="text-sm text-gray-500">Batch #{batchId}</p>
          </div>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            onClick={handlePrint}
            className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c] hover:text-white flex items-center gap-2 flex-1 sm:flex-initial"
          >
            <Download className="h-4 w-4" />
            Download
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute inset-0 bg-white flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-[#69ad4c] border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}
        
        <iframe
          ref={embedRef as any}
          src={pdfBlob || pdfUrl}
          className="w-full h-full border-0"
          title={`${type === 'count' ? 'Count Report' : 'Receipt Report'} - Batch ${batchId}`}
        />
      </div>
    </div>
  );
}