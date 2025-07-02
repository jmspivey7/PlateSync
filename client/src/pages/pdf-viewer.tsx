import { useLocation, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { useEffect, useState } from "react";

export default function PDFViewer() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/pdf-viewer/:batchId/:type");
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [referrer, setReferrer] = useState<string>("/");
  const [hasOpenedSafari, setHasOpenedSafari] = useState(false);

  const batchId = params?.batchId;
  const type = params?.type; // 'count' or 'receipt'

  // Mobile detection and Safari return handler
  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(userAgent);
      console.log("Mobile detection:", { userAgent, isMobileDevice });
      return isMobileDevice;
    };
    setIsMobile(checkMobile());

    // Add page visibility listener for Safari return detection
    const handleVisibilityChange = () => {
      if (!document.hidden && hasOpenedSafari && checkMobile()) {
        console.log("Detected return from Safari, redirecting to referrer:", referrer);
        // Small delay to ensure Safari transition is complete
        setTimeout(() => {
          setLocation(referrer);
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasOpenedSafari, referrer, setLocation]);

  // PDF loading effect
  useEffect(() => {
    let isMounted = true;
    
    if (batchId && type) {
      // Check if mobile user reached this page directly - redirect them back
      const checkMobile = () => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        return /android|blackberry|iemobile|ipad|iphone|ipod|opera mini|webos/i.test(userAgent);
      };
      
      if (checkMobile()) {
        // Mobile user shouldn't be on this page, redirect to appropriate page
        const redirectPath = type === 'count' 
          ? `/batch/${batchId}/summary`
          : `/batch/${batchId}`;
        console.log("Mobile user detected on PDF viewer, redirecting to:", redirectPath);
        setLocation(redirectPath);
        return;
      }
      
      // Set appropriate referrer based on type for desktop
      if (type === 'count') {
        setReferrer(`/batch/${batchId}/summary`);
      } else if (type === 'receipt') {
        setReferrer(`/batch/${batchId}`);
      }

      const fetchPdf = async () => {
        try {
          setIsLoading(true);
          setError(null);
          
          // Determine the correct API endpoint based on type
          const endpoint = type === 'count' 
            ? `/api/batches/${batchId}/pdf-report`
            : `/api/batches/${batchId}/receipt-report`;
          
          console.log("Fetching PDF from:", endpoint);
          
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
          });

          console.log("PDF fetch response:", {
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            url: response.url
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
          }

          const blob = await response.blob();
          if (!isMounted) return;
          
          const blobUrl = URL.createObjectURL(blob);
          setPdfBlobUrl(blobUrl);
        } catch (error) {
          console.error("Error fetching PDF:", error);
          if (isMounted) {
            setError(error instanceof Error ? error.message : 'Failed to load PDF');
          }
        } finally {
          if (isMounted) {
            setIsLoading(false);
          }
        }
      };

      fetchPdf();
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
        const printWindow = window.open(pdfBlobUrl, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        }
      }
    } catch (error) {
      console.error("Error printing PDF:", error);
    }
  };

  const handleDownload = () => {
    try {
      if (pdfBlobUrl) {
        const link = document.createElement('a');
        link.href = pdfBlobUrl;
        const filename = type === 'count' 
          ? `count-report-batch-${batchId}.pdf`
          : `receipt-report-batch-${batchId}.pdf`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  const handleBack = () => {
    setLocation(referrer);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-4">
        <div className="text-red-600 text-center mb-4">
          <h2 className="text-xl font-semibold mb-2">Error Loading PDF</h2>
          <p>{error}</p>
        </div>
        <Button onClick={handleBack} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <Button
          onClick={handleBack}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        
        <h1 className="text-lg font-semibold text-center flex-1">
          {type === 'count' ? 'Count Report' : 'Receipt Report'}
          {batchId && <span className="text-sm text-gray-500 block">Batch #{batchId}</span>}
        </h1>
        
        {/* Desktop controls - only show on desktop */}
        {!isMobile && (
          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        )}
      </div>
      
      {/* PDF Content */}
      <div className="flex-1 relative">
        {!pdfBlobUrl && (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading"/>
          </div>
        )}
        
        {pdfBlobUrl && (
          <>
            {isMobile ? (
              // Mobile layout: NO PDF, SINGLE BUTTON
              <div className="flex flex-col items-center justify-start h-full bg-gray-50 p-8" style={{ paddingTop: '35%' }}>
                <div className="flex flex-col items-center">
                  <Button
                    onClick={() => {
                      console.log("Opening Safari, setting tracking flag");
                      setHasOpenedSafari(true);
                      window.open(pdfBlobUrl, '_blank');
                    }}
                    className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex items-center gap-2 h-16 text-lg px-8 shadow-lg"
                    style={{ width: '300px' }}
                  >
                    <FileText className="h-5 w-5" />
                    Open Report in Browser
                  </Button>
                </div>
              </div>
            ) : (
              // Desktop layout: Traditional object with fallback
              <object
                data={pdfBlobUrl}
                type="application/pdf"
                className="w-full h-full"
                style={{ minHeight: '600px' }}
              >
                <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-50">
                  <p className="text-gray-600 mb-4 text-center">
                    PDF viewer not supported in this browser.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleDownload}
                      className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button
                      onClick={() => window.open(pdfBlobUrl, '_blank')}
                      variant="outline"
                      className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c] hover:text-white flex items-center gap-2"
                    >
                      Open in New Tab
                    </Button>
                  </div>
                </div>
              </object>
            )}
          </>
        )}
      </div>
    </div>
  );
}