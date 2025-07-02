import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useEffect, useState } from "react";

export default function PDFViewer() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/pdf-viewer/:batchId/:type");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referrer, setReferrer] = useState<string>("/");

  const batchId = params?.batchId;
  const type = params?.type; // 'count' or 'receipt'

  useEffect(() => {
    let isMounted = true;
    
    if (batchId && type) {
      // Set appropriate referrer based on type
      if (type === 'count') {
        setReferrer(`/batch-summary/${batchId}`);
      } else if (type === 'receipt') {
        setReferrer(`/batch/${batchId}`);
      } else {
        setReferrer("/counts");
      }

      // Fetch PDF as blob to avoid browser security restrictions
      const fetchPDF = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Construct the PDF URL based on type
          const url = type === 'count' 
            ? `/api/batches/${batchId}/pdf-report`
            : `/api/batches/${batchId}/receipt-report/pdf`;
          
          console.log('Fetching PDF from:', url);
          
          const response = await fetch(url, {
            credentials: 'include',
            headers: {
              'Accept': 'application/pdf'
            }
          });
          
          console.log('PDF fetch response:', {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            url: response.url
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('PDF fetch error response:', errorText);
            throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText} - ${errorText}`);
          }
          
          const blob = await response.blob();
          
          // Ensure we're dealing with a PDF
          if (!blob.type.includes('pdf')) {
            console.warn('Response is not a PDF, type:', blob.type);
          }
          
          const blobUrl = URL.createObjectURL(blob);
          
          if (isMounted) {
            setPdfBlobUrl(blobUrl);
          }
          
        } catch (err) {
          console.error('Error fetching PDF:', err);
          if (isMounted) {
            setError(err instanceof Error ? err.message : 'Failed to load PDF');
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchPDF();
    }

    // Cleanup function
    return () => {
      isMounted = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [batchId, type]);

  // Cleanup blob URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  const handlePrint = () => {
    try {
      if (pdfBlobUrl) {
        // Open PDF in new window for printing
        const printWindow = window.open(pdfBlobUrl, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            printWindow.print();
          });
        }
      }
    } catch (error) {
      console.error('Print error:', error);
    }
  };

  const handleDownload = async () => {
    try {
      if (pdfBlobUrl) {
        console.log('Downloading PDF...');
        
        // Create download link
        const link = document.createElement('a');
        link.href = pdfBlobUrl;
        link.download = `${type}-report-batch-${batchId}.pdf`;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Download started for:', `${type}-report-batch-${batchId}.pdf`);
      }
    } catch (error) {
      console.error('Download error:', error);
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

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error Loading PDF</h1>
          <p className="mt-2 text-gray-600">{error}</p>
          <div className="mt-4 space-x-2">
            <Button onClick={handleBack} variant="outline">
              Go Back
            </Button>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <div className="text-right">
          <h1 className="text-lg font-semibold text-gray-900">
            {type === 'count' ? 'Count Report' : 'Receipt Report'}
          </h1>
          <p className="text-sm text-gray-500">Batch #{batchId}</p>
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
        
        {pdfBlobUrl && (
          <>
            <object
              data={pdfBlobUrl}
              type="application/pdf"
              className="w-full h-full"
              title={`${type === 'count' ? 'Count Report' : 'Receipt Report'} - Batch ${batchId}`}
            >
              <div className="flex flex-col items-center h-full bg-gray-50 p-8" style={{ paddingTop: '35%' }}>
                <div className="space-y-3 max-w-md">
                  <Button
                    onClick={handleDownload}
                    className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex items-center gap-2 w-full h-16 text-lg"
                    style={{ width: '125%' }}
                  >
                    <Download className="h-5 w-5" />
                    Download {type === 'count' ? 'Count Report' : 'Receipt Report'}
                  </Button>
                  <Button
                    onClick={() => window.open(pdfBlobUrl, '_blank')}
                    variant="outline"
                    className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c] hover:text-white flex items-center gap-2 w-full h-16 text-lg"
                    style={{ width: '125%' }}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            </object>
          </>
        )}
      </div>
    </div>
  );
}