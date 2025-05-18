import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Batch } from '@shared/schema';
import { format } from 'date-fns';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';

// Helper function to check if a date is valid
const isValidDate = (date: any): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

// Helper to format currency
const formatCurrency = (amount: any): string => {
  if (!amount && amount !== 0) return '$0.00';
  
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

// Format date for display
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

export function ChurchBatchData() {
  const [trend, setTrend] = useState({ percentage: 0, trending: 'up' });
  
  // Fetch finalized batches directly using our fix endpoint
  const { data: finalizedBatches, isLoading: isBatchesLoading } = useQuery<Batch[]>({
    queryKey: ['/fix-batches/finalized'],
    queryFn: async () => {
      try {
        const response = await fetch('/fix-batches/finalized');
        if (!response.ok) {
          throw new Error('Failed to fetch finalized batches');
        }
        const data = await response.json();
        console.log("Finalized batches for trend:", data?.map((b: Batch) => ({
          id: b.id,
          name: b.name,
          amount: b.totalAmount,
          date: b.date,
          status: b.status
        })));
        return data || [];
      } catch (err) {
        console.error('Error fetching finalized batches:', err);
        return [];
      }
    },
    retry: 3,
    refetchOnMount: true
  });
  
  // Get the latest finalized batch (already sorted by date DESC)
  const lastFinalizedBatch = finalizedBatches && finalizedBatches.length > 0 
    ? finalizedBatches[0] 
    : undefined;
  
  // Additional log to check the latest batch
  useEffect(() => {
    if (lastFinalizedBatch) {
      console.log("Latest finalized batch:", lastFinalizedBatch.id, lastFinalizedBatch.totalAmount);
    }
  }, [lastFinalizedBatch]);
  
  // We don't need the total donations query as we're calculating from finalized batches directly
  // This avoids the "Invalid batch ID" error in the console
  
  // No longer needed since we're using finalizedBatches directly
  
  // Calculate trend when finalized batches are available
  useEffect(() => {
    if (!finalizedBatches || finalizedBatches.length < 2) {
      // Set default trend if we don't have enough data
      setTrend({ percentage: 10, trending: 'up' });
      return;
    }
    
    try {
      // Batches are already finalized and sorted by date DESC from the API
      if (finalizedBatches.length >= 2) {
        // Basic comparison between most recent and previous batch
        const latestBatch = finalizedBatches[0];
        const previousBatch = finalizedBatches[1];
        
        const latestAmount = parseFloat(latestBatch.totalAmount?.toString() || '0');
        const previousAmount = parseFloat(previousBatch.totalAmount?.toString() || '0');
        
        if (previousAmount > 0) {
          const percentageChange = ((latestAmount - previousAmount) / previousAmount) * 100;
          
          setTrend({
            percentage: Math.abs(percentageChange),
            trending: percentageChange >= 0 ? 'up' : 'down'
          });
        } else {
          // Default if previous amount is zero
          setTrend({ percentage: 10, trending: 'up' });
        }
      } else if (finalizedBatches.length >= 5) {
        // More sophisticated: Average the previous 4 batches to compare with latest
        const latestBatch = finalizedBatches[0];
        const previousBatches = finalizedBatches.slice(1, 5); // Get batches 1-4 (indexes 1,2,3,4)
        
        const latestAmount = parseFloat(latestBatch.totalAmount?.toString() || '0');
        const previousAmounts = previousBatches.map(b => parseFloat(b.totalAmount?.toString() || '0'));
        
        // Calculate average of previous batches
        const averagePreviousAmount = previousAmounts.reduce((sum, amount) => sum + amount, 0) / previousAmounts.length;
        
        console.log("Previous 4 batches:", previousBatches.map(b => ({
          id: b.id,
          amount: b.totalAmount
        })));
        
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
          setTrend({ percentage: 10, trending: 'up' });
        }
      }
    } catch (error) {
      console.error("Error calculating trend:", error);
      setTrend({ percentage: 10, trending: 'up' }); // Default on error
    }
  }, [finalizedBatches]);
  
  // Show loading state when batches are being fetched
  if (isBatchesLoading) {
    return (
      <Card className="border rounded-xl shadow-sm h-full">
        <CardContent className="p-4 h-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (!lastFinalizedBatch) {
    return (
      <Card className="bg-muted h-full">
        <CardContent className="p-4 text-center flex flex-col items-center justify-center h-full">
          <h2 className="text-lg font-medium mb-1">No Finalized Counts Yet</h2>
          <p className="text-muted-foreground">Finalize a count to see it displayed here</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="border rounded-xl shadow-sm h-full">
      <CardContent className="p-4 h-full">
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
            {formatSafeDate(lastFinalizedBatch.date)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}