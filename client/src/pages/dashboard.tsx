import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, BarChart2, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Batch } from "@shared/schema";
import CountModal from "@/components/counts/CountModal";
import { useState, useEffect } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { DonationChart } from "@/components/dashboard/DonationChart";

const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [trend, setTrend] = useState({ percentage: 0, trending: 'up' });
  
  // Fetch the latest finalized batch for display
  const { data: lastFinalizedBatch, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches/latest-finalized'],
    enabled: isAuthenticated,
    select: (data) => {
      console.log("Latest finalized batch from API:", data);
      return data;
    }
  });
  
  // Fetch all batches for trend calculation
  const { data: allBatches } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
    enabled: isAuthenticated,
  });
  
  // Calculate trend when data is available
  useEffect(() => {
    if (lastFinalizedBatch && allBatches && allBatches.length > 0) {
      // Find all finalized batches
      const finalizedBatches = allBatches
        .filter(batch => batch.status === 'FINALIZED')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log("Finalized batches for trend:", finalizedBatches.map(b => ({
        id: b.id,
        name: b.name,
        amount: b.totalAmount,
        date: b.date
      })));
      
      if (finalizedBatches.length >= 2) {
        // We have at least 2 finalized batches to calculate trend
        const latestBatch = finalizedBatches[0];
        const previousBatch = finalizedBatches[1];
        
        console.log("Latest batch:", latestBatch.id, latestBatch.totalAmount);
        console.log("Previous batch:", previousBatch.id, previousBatch.totalAmount);
        
        // Calculate percentage change
        const latestAmount = parseFloat(latestBatch.totalAmount || '0');
        const previousAmount = parseFloat(previousBatch.totalAmount || '0');
        
        if (previousAmount > 0) {
          const percentageChange = ((latestAmount - previousAmount) / previousAmount) * 100;
          console.log("Calculated trend:", {
            latestAmount,
            previousAmount,
            percentageChange
          });
          
          setTrend({
            percentage: Math.abs(percentageChange),
            trending: percentageChange >= 0 ? 'up' : 'down'
          });
        }
      } else {
        console.log("Not enough finalized batches to calculate trend");
      }
    }
  }, [lastFinalizedBatch, allBatches]);
  
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
    <PageLayout
      title="Dashboard"
      icon={<BarChart2 className="h-6 w-6 text-gray-700" />}
    >
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Start New Count Card Button */}
        <div className="md:w-1/3">
          <Button 
            className="w-full h-full rounded-xl bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex flex-col items-center justify-center text-3xl font-bold p-6"
            onClick={handleNewCount}
          >
            <span>Start</span>
            <span>New Count</span>
          </Button>
        </div>
        
        {/* Last Count Submitted */}
        <div className="md:w-2/3">
          {isLoadingBatch ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : lastFinalizedBatch ? (
            <Card className="border rounded-xl shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg text-muted-foreground font-medium">Last Count Finalized</h2>
                  <div className="bg-background border rounded-full px-3 py-1 flex items-center text-sm font-medium">
                    {trend.trending === 'up' ? (
                      <TrendingUp className="h-4 w-4 mr-1 text-primary" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1 text-destructive" />
                    )}
                    {trend.trending === 'up' ? '+' : '-'}{trend.percentage.toFixed(1)}%
                  </div>
                </div>
                <div className="text-3xl font-bold my-2">
                  {formatCurrency(lastFinalizedBatch.totalAmount || 0)}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-base font-medium flex items-center">
                    {trend.trending === 'up' ? (
                      <>Trending up <TrendingUp className="h-4 w-4 ml-1 text-primary" /></>
                    ) : (
                      <>Trending down <TrendingDown className="h-4 w-4 ml-1 text-destructive" /></>
                    )}
                  </div>
                  <div className="text-sm font-bold">
                    {format(new Date(lastFinalizedBatch.date), 'EEEE, MMMM d, yyyy')}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-muted">
              <CardContent className="p-4 text-center">
                <h2 className="text-lg font-medium mb-1">No Finalized Counts Yet</h2>
                <p className="text-muted-foreground">Finalize a count to see it displayed here</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      
      {/* Donation Trend Chart */}
      <DonationChart />
      
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