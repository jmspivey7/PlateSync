import React from "react";
import { useLocation } from "wouter";
import PageLayout from "@/components/layout/PageLayout";
import PrintCountReport from "@/components/reports/PrintCountReport";
import { Printer } from "lucide-react";

const PrintReportPage: React.FC = () => {
  const [location] = useLocation();
  const [, navigate] = useLocation();
  
  // Extract batch ID from URL
  const batchId = parseInt(new URLSearchParams(location.split("?")[1]).get("batchId") || "0");
  
  if (!batchId) {
    // Redirect to counts page if no batch ID
    navigate("/counts");
    return null;
  }
  
  const handleBack = () => {
    navigate("/counts?filter=FINALIZED");
  };
  
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