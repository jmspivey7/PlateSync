import { createPortal } from "react-dom";
import { X } from "lucide-react";
import AttestationForm from "./AttestationForm";
import { useQueryClient } from "@tanstack/react-query";

interface AttestationModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: number;
  onComplete: () => void;
}

/**
 * A completely standalone modal component that uses React Portal
 * to render directly to the document body, avoiding any CSS interference
 */
const AttestationModal = ({ isOpen, onClose, batchId, onComplete }: AttestationModalProps) => {
  const queryClient = useQueryClient();

  if (!isOpen) return null;

  // Create portal to render directly to body
  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50"
      style={{ top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <div 
        className="bg-white rounded-lg p-8 max-w-[600px] w-full max-h-[90vh] overflow-y-auto m-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pb-4 mb-4 border-b">
          <h2 className="text-xl font-bold">Count Attestation</h2>
        </div>
        
        <AttestationForm 
          batchId={batchId}
          onComplete={() => {
            onClose();
            onComplete();
            // After attestation is complete, trigger a batch refetch
            queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
          }}
        />
      </div>
    </div>,
    document.body
  );
};

export default AttestationModal;