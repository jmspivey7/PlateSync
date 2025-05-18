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
import { ChurchBatchData } from "@/components/dashboard/ChurchBatchData";
// Import the Thumbs Up icon directly
import thumbsUpIcon from "../../../public/assets/ThumbsUp.png";

// Helper function to validate date
const isValidDate = (dateStr: string | Date | null | undefined): boolean => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  // Check if the date is valid and not NaN
  return !isNaN(d.getTime());
};

// Helper function to safely parse a date
const safelyParseDate = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr || !isValidDate(dateStr)) {
    return new Date(); // Return current date as fallback
  }
  return new Date(dateStr);
};

const Dashboard = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isCountModalOpen, setIsCountModalOpen] = useState(false);
  const [trend, setTrend] = useState({ percentage: 0, trending: 'up' });
  
  // Fetch the latest finalized batch for display
  const { data: lastFinalizedBatch, isLoading: isLoadingBatch } = useQuery<Batch>({
    queryKey: ['/api/batches/latest-finalized'],
    enabled: isAuthenticated,
    retry: false, // Don't retry 404 errors
    throwOnError: false, // Don't throw on any error
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
    try {
      if (!lastFinalizedBatch || !allBatches || allBatches.length === 0) {
        console.log("No batches available for trend calculation");
        return;
      }
      
      // Ensure the latest finalized batch has a valid date
      if (!isValidDate(lastFinalizedBatch.date)) {
        console.log("Latest finalized batch has invalid date:", lastFinalizedBatch.date);
        return;
      }
      
      // Find all finalized batches with valid dates
      const finalizedBatches = allBatches
        .filter(batch => batch.status === 'FINALIZED' && isValidDate(batch.date))
        .sort((a, b) => {
          const dateA = safelyParseDate(a.date);
          const dateB = safelyParseDate(b.date);
          return dateB.getTime() - dateA.getTime();
        });
      
      console.log("Finalized batches for trend:", finalizedBatches.map(b => ({
        id: b.id,
        name: b.name,
        amount: b.totalAmount,
        date: b.date,
        status: b.status
      })));
      
      if (finalizedBatches.length === 0) {
        console.log("No finalized batches with valid dates found");
        setTrend({ percentage: 10, trending: 'up' }); // Default trend
        return;
      }
      
      // If we have only one finalized batch, use closed batches for comparison
      if (finalizedBatches.length === 1) {
        const latestFinalizedBatch = finalizedBatches[0];
        const finalizedAmount = parseFloat(latestFinalizedBatch.totalAmount?.toString() || '0');
        
        // Find up to 4 closed batches with valid dates to compare with
        const closedBatches = allBatches
          .filter(batch => {
            return batch.status === 'CLOSED' && 
                   batch.id !== latestFinalizedBatch.id &&
                   isValidDate(batch.date);
          })
          .sort((a, b) => {
            const dateA = safelyParseDate(a.date);
            const dateB = safelyParseDate(b.date);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 4); // Take up to 4 most recent closed batches
        
        if (closedBatches.length > 0) {
          console.log("Latest finalized batch:", latestFinalizedBatch.id, latestFinalizedBatch.totalAmount);
          console.log(`Using ${closedBatches.length} closed batches for comparison:`, 
            closedBatches.map(b => ({ id: b.id, amount: b.totalAmount })));
          
          // Calculate average of closed batches
          const totalClosedAmount = closedBatches.reduce((sum, batch) => {
            return sum + parseFloat(batch.totalAmount?.toString() || '0');
          }, 0);
          
          const averageClosedAmount = totalClosedAmount / closedBatches.length;
          
          if (averageClosedAmount > 0) {
            const percentageChange = ((finalizedAmount - averageClosedAmount) / averageClosedAmount) * 100;
            console.log("Calculated trend using average of closed batches:", {
              finalizedAmount,
              averageClosedAmount,
              percentageChange,
              numberOfBatchesAveraged: closedBatches.length
            });
            
            setTrend({
              percentage: Math.abs(percentageChange),
              trending: percentageChange >= 0 ? 'up' : 'down'
            });
          } else {
            // Default to 10% up for better UI display if no valid comparison
            setTrend({
              percentage: 10,
              trending: 'up'
            });
          }
        } else {
          // No closed batches either, set a default trend for better UI
          console.log("No other batches for comparison, setting default trend");
          setTrend({
            percentage: 10,
            trending: 'up'
          });
        }
      } else if (finalizedBatches.length >= 2) {
        // We have at least 2 finalized batches to calculate trend
        const latestBatch = finalizedBatches[0];
        const latestAmount = parseFloat(latestBatch.totalAmount?.toString() || '0');
        
        // Get up to 4 previous batches (exclude the most recent one)
        const previousBatches = finalizedBatches.slice(1, Math.min(finalizedBatches.length, 5));
        
        console.log("Latest finalized batch:", latestBatch.id, latestBatch.totalAmount);
        console.log(`Previous ${previousBatches.length} batches:`, previousBatches.map(b => ({ id: b.id, amount: b.totalAmount })));
        
        // Calculate the average amount of the previous counts (up to 4)
        const totalPreviousAmount = previousBatches.reduce((sum, batch) => {
          return sum + parseFloat(batch.totalAmount?.toString() || '0');
        }, 0);
        
        const averagePreviousAmount = totalPreviousAmount / previousBatches.length;
        
        if (averagePreviousAmount > 0) {
          const percentageChange = ((latestAmount - averagePreviousAmount) / averagePreviousAmount) * 100;
          console.log("Calculated trend using average of last few batches:", {
            latestAmount,
            averagePreviousAmount,
            percentageChange,
            numberOfBatchesAveraged: previousBatches.length
          });
          
          setTrend({
            percentage: Math.abs(percentageChange),
            trending: percentageChange >= 0 ? 'up' : 'down'
          });
        } else {
          // Default if average is zero
          setTrend({
            percentage: 10,
            trending: 'up'
          });
        }
      } else {
        console.log("Not enough batches to calculate trend, using default");
        // No finalized batches at all, set a default trend for better UI
        setTrend({
          percentage: 10,
          trending: 'up'
        });
      }
    } catch (error) {
      console.error("Error calculating trend:", error);
      setTrend({ percentage: 10, trending: 'up' }); // Default on error
    }
  }, [lastFinalizedBatch, allBatches]);
  
  // Format currency
  const formatCurrency = (amount: string | number) => {
    try {
      const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      }).format(numericAmount);
    } catch (error) {
      console.error("Error formatting currency:", error);
      return "$0.00"; // Fallback
    }
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
  
  // Safely format date for display
  const formatSafeDate = (dateStr: string | Date | null | undefined) => {
    try {
      if (!dateStr || !isValidDate(dateStr)) {
        return "Waiting on First Count";
      }
      const dateObj = new Date(dateStr);
      const correctedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
      return format(correctedDate, 'EEEE, MMMM d, yyyy');
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Waiting on First Count";
    }
  };
  
  return (
    <PageLayout>
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Start New Count Card Button */}
        <div className="md:w-1/3 h-16 md:h-auto">
          {/* Mobile view: original compact button */}
          <Button 
            className="w-full h-full md:hidden rounded-xl bg-[#69ad4c] hover:bg-[#69ad4c] text-white flex flex-row items-center justify-center text-2xl font-bold py-0 px-4 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#69ad4c]/50 hover:translate-y-[-2px] gap-5"
            onClick={handleNewCount}
          >
            <span className="flex-shrink-0 w-20 h-16 flex items-center justify-center overflow-hidden">
              <img src={thumbsUpIcon} alt="Thumbs Up" className="w-20 h-20 object-contain" />
            </span>
            <span className="whitespace-nowrap text-3xl">New Count</span>
          </Button>
          
          {/* Desktop view: taller card-like button that matches Last Count Finalized height */}
          <Card className="hidden md:flex h-full rounded-xl shadow-sm border overflow-hidden bg-[#69ad4c]">
            <CardContent className="p-0 w-full flex flex-col items-center justify-center">
              <Button 
                className="w-full h-full rounded-none bg-[#69ad4c] hover:bg-[#5c9a42] text-white flex flex-col items-center justify-center border-none shadow-none py-2 transition-all duration-300"
                onClick={handleNewCount}
              >
                <div className="flex items-center justify-center flex-col gap-2 py-3">
                  <span className="flex-shrink-0 w-16 h-16 flex items-center justify-center overflow-hidden">
                    <img src={thumbsUpIcon} alt="Thumbs Up" className="w-16 h-16 object-contain" />
                  </span>
                  <span className="whitespace-nowrap text-2xl font-bold">New Count</span>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Last Count Submitted - Using direct church data */}
        <div className="md:w-2/3">
          <ChurchBatchData />
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