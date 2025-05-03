import { useQuery } from "@tanstack/react-query";

import { Loader2, Plus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Batch } from "@shared/schema";
import CountModal from "@/components/counts/CountModal";
import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { CountsChart } from "@/components/dashboard/CountsChart";
import { TotalRevenueCard } from "@/components/dashboard/TotalRevenueCard";

const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  
  // Fetch the current/last batch for display
  const { data: lastBatch, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches/current'],
    enabled: isAuthenticated,
  });
  
  // Fetch all batches for the chart
  const { data: allBatches, isLoading: isLoadingAllBatches } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
    enabled: isAuthenticated,
  });
  
  // Handle new count action
  const handleNewCount = () => {
    setIsCountModalOpen(true);
  };
  
  // Handle modal close
  const handleCloseModal = () => {
    setIsCountModalOpen(false);
  };
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return null; // This will redirect to login page via App.tsx
  }
  
  return (
    <PageLayout>
      {/* Primary Action Button */}
      <Button 
        className="w-full py-6 mb-6 bg-primary hover:bg-primary/90 text-primary-foreground text-lg"
        onClick={handleNewCount}
      >
        <Plus className="mr-2 h-5 w-5" />
        Start New Count
      </Button>
      
      {/* Last Count Submitted */}
      {isLoadingBatch ? (
        <div className="flex justify-center items-center py-8 mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lastBatch ? (
        <TotalRevenueCard batch={lastBatch} />
      ) : (
        <Card className="mb-6 bg-card">
          <CardContent className="p-6">
            <h2 className="text-xl font-medium text-card-foreground/80 mb-4">Last Count</h2>
            <div className="text-4xl font-bold mb-2">$0.00</div>
            <div className="text-md mb-4">No counts recorded</div>
            <div className="text-sm text-card-foreground/70">
              <div>Create your first count to get started</div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Prior Counts Chart */}
      {isLoadingAllBatches ? (
        <div className="flex justify-center items-center py-8 mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <CountsChart batches={allBatches} />
      )}
      
      {/* Count Modal */}
      {isCountModalOpen && (
        <CountModal
          isOpen={isCountModalOpen}
          onClose={handleCloseModal}
          batchId={null}
          isEdit={false}
        />
      )}
    </PageLayout>
  );
};

export default Dashboard;