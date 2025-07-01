import { useState, useEffect } from "react";
import { X, Download, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobilePdfViewerProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl: string;
  title: string;
}

export function MobilePdfViewer({ isOpen, onClose, pdfUrl, title }: MobilePdfViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      setIsLoading(true);
      setHasError(false);
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    // Create a new window just for printing
    const printWindow = window.open(pdfUrl, '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header with navigation and actions */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-semibold text-gray-900 truncate">
            {title}
          </h2>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleDownload}
            className="p-2"
          >
            <Download className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handlePrint}
            className="p-2"
          >
            <Printer className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="p-2"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* PDF Content Area */}
      <div className="flex-1 relative" style={{ height: 'calc(100vh - 73px)' }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          </div>
        )}

        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center p-6">
              <p className="text-red-600 mb-4">Error loading PDF</p>
              <Button onClick={handleDownload} variant="outline">
                Download PDF Instead
              </Button>
            </div>
          </div>
        )}

        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title={title}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>

      {/* Bottom action bar for mobile */}
      <div className="border-t bg-white p-4 flex gap-3 md:hidden">
        <Button 
          onClick={handleDownload} 
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button 
          onClick={handlePrint} 
          variant="outline" 
          className="flex-1"
        >
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
      </div>
    </div>
  );
}