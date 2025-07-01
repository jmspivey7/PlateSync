import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
  batchId: string;
}

export const PdfModal: React.FC<PdfModalProps> = ({
  isOpen,
  onClose,
  pdfUrl,
  title,
  batchId
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [printError, setPrintError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      setPrintError(false);
    }
  }, [isOpen]);

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    toast({
      title: "PDF Loading Error",
      description: "Unable to load the PDF report. Please try again.",
      variant: "destructive",
    });
  };

  const detectPrintSupport = (): boolean => {
    // Check if we're on a mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check if browser supports iframe printing
    const supportsIframePrint = !!(window as any).print && !isMobile;
    
    return supportsIframePrint;
  };

  const handleNativePrint = async (): Promise<boolean> => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        // Try to print the iframe content
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Native print failed:', error);
      return false;
    }
  };

  const handleDownloadPrint = () => {
    // Create a temporary link to download the PDF
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `count-report-${batchId}.pdf`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "PDF Downloaded",
      description: "The PDF has been downloaded. You can now print it from your device's PDF viewer.",
      duration: 5000,
    });
  };

  const handlePrint = async () => {
    if (isLoading) {
      toast({
        title: "Please Wait",
        description: "PDF is still loading. Please wait a moment and try again.",
        variant: "default",
      });
      return;
    }

    const supportsNativePrint = detectPrintSupport();
    
    if (supportsNativePrint) {
      // Try native print first
      const printSuccess = await handleNativePrint();
      if (!printSuccess) {
        // Fall back to download if native print fails
        setPrintError(true);
        handleDownloadPrint();
      }
    } else {
      // Mobile or unsupported browser - use download method
      handleDownloadPrint();
    }
  };

  const handleClose = () => {
    setIsLoading(true);
    setPrintError(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 gap-0 fixed inset-0 z-50">
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-white">
          <DialogTitle className="text-lg font-semibold text-gray-900 flex-1">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              disabled={isLoading}
              className="bg-[#69ad4c] hover:bg-[#5a9941] text-white"
              size="sm"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <>
                  {detectPrintSupport() && !printError ? (
                    <Printer className="h-4 w-4 mr-2" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                </>
              )}
              {isLoading ? 'Loading...' : 
               detectPrintSupport() && !printError ? 'Print' : 'Download'}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 relative bg-gray-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[#69ad4c]" />
                <p className="text-sm text-gray-600">Loading PDF report...</p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={pdfUrl}
            className="w-full h-full border-0"
            title={title}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
        
        {printError && (
          <div className="p-3 bg-amber-50 border-t border-amber-200">
            <p className="text-sm text-amber-800">
              <Download className="h-4 w-4 inline mr-1" />
              Print dialog not available. PDF will be downloaded for printing.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PdfModal;