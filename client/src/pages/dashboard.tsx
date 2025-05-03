import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, BarChart2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Batch } from "@shared/schema";
import CountModal from "@/components/counts/CountModal";
import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";

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
  
  // Format currency
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };
  
  // Handle new count action
  const handleNewCount = () => {
    setIsCountModalOpen(true);
  };
  
  // Handle modal close
  const handleCloseModal = () => {
    setIsCountModalOpen(false);
  };
  
  // Get last 5 batches for chart
  const getRecentBatches = () => {
    if (!allBatches) return [];
    
    return [...allBatches]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .reverse();
  };
  
  const recentBatches = getRecentBatches();
  
  // Find the highest amount for scaling
  const maxAmount = recentBatches.length > 0 
    ? Math.max(...recentBatches.map(b => parseFloat(b.totalAmount?.toString() || "0")))
    : 5000;
  
  // Chart height calculation
  const getBarHeight = (amount: string | number | null | undefined) => {
    if (!amount) return 0;
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (numAmount / maxAmount) * 200; // Max height of 200px
  };
  
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
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
        className="w-full py-6 mb-6 bg-[#4299E1] hover:bg-[#4299E1]/90 text-white text-lg"
        onClick={handleNewCount}
      >
        <Plus className="mr-2 h-5 w-5" />
        Start New Count
      </Button>
      
      {/* Last Count Submitted */}
      {isLoadingBatch ? (
        <div className="flex justify-center items-center py-8 mb-6">
          <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
        </div>
      ) : lastBatch ? (
        <Card className="mb-6 bg-[#48BB78] text-white">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-medium mb-2">Last Count Submitted</h2>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(lastBatch.totalAmount || 0)}
            </div>
            <div className="text-lg">
              {format(new Date(lastBatch.date), 'EEEE, MMMM d, yyyy')}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-gray-100">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-medium mb-1">No Counts Yet</h2>
            <p className="text-gray-600">Create your first count to get started</p>
          </CardContent>
        </Card>
      )}
      
      {/* Prior Counts Chart */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4 text-center">Prior Counts</h2>
          
          {isLoadingAllBatches ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
            </div>
          ) : recentBatches.length > 0 ? (
            <div className="relative h-[250px]">
              <div className="absolute bottom-0 w-full flex items-end justify-around">
                {recentBatches.map((batch, index) => (
                  <div key={index} className="flex flex-col items-center w-1/5">
                    <div 
                      className="bg-[#4299E1] rounded-t w-16" 
                      style={{ height: `${getBarHeight(batch.totalAmount)}px` }}
                    >
                      <div className="text-white text-center text-xs font-medium mt-1">
                        {formatCurrency(batch.totalAmount || 0)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {format(new Date(batch.date), 'd-MMM-yy')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <BarChart2 className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-gray-500">No counts available to display</p>
            </div>
          )}
        </CardContent>
      </Card>
      
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