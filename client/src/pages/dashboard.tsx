import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Plus, BarChart2, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Batch } from "@shared/schema";
import CountModal from "@/components/counts/CountModal";
import { useState } from "react";
import PageLayout from "@/components/layout/PageLayout";
import { DonationChart } from "@/components/dashboard/DonationChart";

const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  
  // Fetch the current/last batch for display
  const { data: lastBatch, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches/current'],
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
        <Card className="mb-6 border rounded-xl shadow-sm">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl text-muted-foreground font-medium">Last Count Submitted</h2>
              <div className="bg-background border rounded-full px-3 py-1 flex items-center text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-1" /> +0.0%
              </div>
            </div>
            <div className="text-4xl font-bold mb-6">
              {formatCurrency(lastBatch.totalAmount || 0)}
            </div>
            <div className="flex justify-between items-center">
              <div className="text-base font-medium flex items-center">
                Trending up <TrendingUp className="h-4 w-4 ml-1" />
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(lastBatch.date), 'EEEE, MMMM d, yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6 bg-muted">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-medium mb-1">No Counts Yet</h2>
            <p className="text-muted-foreground">Create your first count to get started</p>
          </CardContent>
        </Card>
      )}
      
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