import React, { useEffect, useState } from "react";
import { useLocation } from "wouter";
import PageLayout from "@/components/layout/PageLayout";
import PrintCountReport from "@/components/reports/PrintCountReport";
import { Printer } from "lucide-react";

const PrintReportPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [batchId, setBatchId] = useState<number | null>(null);
  
  // Extract batch ID from URL in useEffect to avoid state updates during render
  useEffect(() => {
    const urlParams = new URLSearchParams(location.split("?")[1] || "");
    const id = parseInt(urlParams.get("batchId") || "0");
    
    if (id) {
      setBatchId(id);
    } else {
      // Redirect to counts page if no batch ID
      setLocation("/counts");
    }
  }, [location, setLocation]);
  
  const handleBack = () => {
    // Navigate back to the attestation page if we came from there
    const urlParams = new URLSearchParams(location.split("?")[1] || "");
    const fromAttest = urlParams.get("fromAttest");
    
    if (fromAttest && batchId) {
      setLocation(`/attest-batch/${batchId}`);
    } else {
      setLocation("/counts");
    }
  };
  
  if (!batchId) {
    return null; // Wait until useEffect sets the batchId or redirects
  }
  
  return (
    <PageLayout 
      title="Print Count Report" 
      subtitle="Generate a printable report to include with the money bag"
      icon={<Printer className="h-6 w-6 text-[#69ad4c]" />}
    >
      <div className="max-w-2xl mx-auto">
        <PrintCountReport batchId={batchId} onBack={handleBack} />
      </div>
    </PageLayout>
  );
};

export default PrintReportPage;