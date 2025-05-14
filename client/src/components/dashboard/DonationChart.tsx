import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { 
  Area, 
  AreaChart, 
  CartesianGrid, 
  XAxis, 
  ResponsiveContainer,
  Tooltip,
  Legend 
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ChartConfig,
  ChartContainer,
} from "@/components/ui/chart";
import { Batch, Donation } from "@shared/schema";

// Chart configuration with colors for cash and check donations
const chartConfig = {
  cash: {
    label: "Cash",
    color: "#69ad4c", // Green for cash
  },
  check: {
    label: "Check",
    color: "#3b82f6", // Blue for check
  },
} satisfies ChartConfig;

// Add CSS variables for the chart colors
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--color-cash', '#69ad4c');
  document.documentElement.style.setProperty('--color-check', '#3b82f6');
}

// Custom tooltip component for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    // Format currency
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };
    
    return (
      <div className="bg-white p-2 border shadow-sm rounded-md">
        <p className="font-medium text-sm">{payload[0]?.payload?.fullDate}</p>
        <div className="flex flex-col gap-1 mt-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs">{entry.name}:</span>
              <span className="text-xs font-medium">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DonationChart() {
  // For navigation to counts page
  const [, navigate] = useLocation();
  // Add state for tracking loading timeout
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  
  // Set a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoadingTimedOut(true);
    }, 5000); // 5 seconds timeout
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  // Fetch all batches
  const { data: batches, isLoading, error: batchError } = useQuery<Batch[]>({
    queryKey: ['/api/batches'],
    retry: 2, // Reduced retry count
    retryDelay: 1000,
    throwOnError: false,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    select: (data) => {
      console.log("Chart received batch data:", data || []);
      return data || [];
    }
  });
  
  // For each batch, fetch its donations
  const { data: batchDonations, isLoading: isDonationsLoading, error: donationsError } = useQuery<Record<number, Donation[]>>({
    queryKey: ['/api/batches/donations'],
    queryFn: async () => {
      try {
        if (!batches || !Array.isArray(batches) || batches.length === 0) {
          console.log("No batches available for donations query");
          // Return empty object immediately if no batches
          return {}; 
        }
        
        // Fetch donations only for FINALIZED batches that have a totalAmount > 0
        const relevantBatches = batches.filter((batch: Batch) => 
          batch.status === 'FINALIZED' && parseFloat(batch.totalAmount?.toString() || '0') > 0
        );
        
        if (relevantBatches.length === 0) {
          console.log("No relevant batches found (FINALIZED with positive amounts)");
          return {}; // Return empty object if no relevant batches
        }
        
        // Create a map of batchId to donations
        const donationsMap: Record<number, Donation[]> = {};
        
        // Fetch donations for each batch in parallel
        await Promise.all(relevantBatches.map(async (batch: Batch) => {
          if (!batch.id) return; // Skip batches without ID
          
          try {
            const response = await fetch(`/api/batches/${batch.id}/donations`, {
              credentials: "include" // Ensure cookies are sent with the request
            });
            
            if (response.ok) {
              const donations = await response.json();
              donationsMap[batch.id] = donations;
            } else if (response.status === 401) {
              console.warn("Authentication required for batch donations");
              // Initialize with empty array instead of skipping
              donationsMap[batch.id] = [];
            } else {
              console.error(`Error response for batch ${batch.id}:`, response.status);
              // Initialize with empty array
              donationsMap[batch.id] = [];
            }
          } catch (error) {
            console.error(`Network error fetching donations for batch ${batch.id}:`, error);
            // Initialize with empty array
            donationsMap[batch.id] = [];
          }
        }));
        
        console.log("Fetched donations for batches:", donationsMap);
        return donationsMap;
      } catch (error) {
        console.error("Error in batch donations query:", error);
        return {}; // Return empty object on error
      }
    },
    enabled: !!batches && Array.isArray(batches) && batches.length > 0,
    retry: 1,
    retryDelay: 1000
  });

  // Handle loading and error states with timeout protection
  if ((isLoading || isDonationsLoading || !batches) && !loadingTimedOut) {
    return (
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>Count Trends</CardTitle>
            <CardDescription>
              Loading chart data...
            </CardDescription>
          </div>
          <Button 
            className="bg-[#69ad4c] hover:bg-[#5a9940] text-white rounded-md" 
            onClick={() => navigate("/counts")}
            disabled={true}
          >
            All Counts
          </Button>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }
  
  // Handle error states or no data - show empty chart with view history option
  if (loadingTimedOut || batchError || donationsError || !Array.isArray(batches) || batches.length === 0 || (Array.isArray(batches) && batches.filter(b => b.status === 'FINALIZED' && parseFloat(b.totalAmount?.toString() || '0') > 0).length === 0)) {
    return (
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle>Count Trends</CardTitle>
            <CardDescription>
              Cash vs. Check donations
            </CardDescription>
          </div>
          <Button 
            className="bg-[#69ad4c] hover:bg-[#5a9940] text-white rounded-md" 
            onClick={() => navigate("/counts")}
          >
            All Counts
          </Button>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center">
          <p className="text-muted-foreground mb-4">No finalized counts available to display</p>
          <p className="text-sm text-muted-foreground">Finalize a count to see donation trends</p>
        </CardContent>
      </Card>
    );
  }

  // Get all FINALIZED batches from the last 12 months
  const recentBatches = (() => {
    if (!Array.isArray(batches) || batches.length === 0) return [];
    
    // First, find all finalized batches with positive amounts
    const finalizedBatches = batches.filter(b => 
      b.status === 'FINALIZED' && parseFloat(b.totalAmount?.toString() || '0') > 0
    );
    
    if (finalizedBatches.length === 0) return [];
    
    // Get the most recent finalized batch date
    const sortedByDate = [...finalizedBatches].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    const mostRecentDate = new Date(sortedByDate[0].date);
    
    // Calculate the date 12 months ago from the most recent batch
    const twelveMonthsAgo = new Date(mostRecentDate);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    
    // Filter to get only batches within the 12-month period
    return finalizedBatches
      .filter(batch => {
        const batchDate = new Date(batch.date);
        return batchDate >= twelveMonthsAgo;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  })();

  console.log("Recent batches for chart:", recentBatches.map(b => b.id));

  // Calculate cash and check totals for each batch
  const chartData = recentBatches.map(batch => {
    // Get donations for this batch from our fetched data
    const donations = (batchDonations && batchDonations[batch.id]) || [];
    console.log(`Batch ${batch.id} donations:`, donations);
    
    // Calculate cash and check totals
    const cashTotal = donations
      .filter((d: Donation) => d.donationType === "CASH")
      .reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);
    
    const checkTotal = donations
      .filter((d: Donation) => d.donationType === "CHECK")
      .reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);

    // Ensure date is displayed correctly by adjusting for timezone offset
    const dateObj = new Date(batch.date);
    const correctedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
    
    return {
      date: format(correctedDate, 'MMM d'),
      cash: cashTotal,
      check: checkTotal,
      // Store the full date for tooltip
      fullDate: format(correctedDate, 'MMMM d, yyyy')
    };
  });

  // Calculate trend percentage
  const calculateTrend = () => {
    if (chartData.length < 2) return { percentage: 0, trending: "none" };
    
    // Get total from most recent batch
    const currentTotal = chartData[chartData.length - 1].cash + chartData[chartData.length - 1].check;
    
    // Get total from previous batch
    const previousTotal = chartData[chartData.length - 2].cash + chartData[chartData.length - 2].check;
    
    if (previousTotal === 0) return { percentage: 0, trending: "none" };
    
    const percentage = ((currentTotal - previousTotal) / previousTotal) * 100;
    const trending = percentage >= 0 ? "up" : "down";
    
    return { percentage: Math.abs(percentage), trending };
  };

  const { percentage, trending } = calculateTrend();
  const displayPercentage = percentage.toFixed(1);

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Count Trends</CardTitle>
          <CardDescription>
            Cash vs. Check donations
          </CardDescription>
        </div>
        <Button 
          className="bg-[#69ad4c] hover:bg-[#5a9940] text-white rounded-md" 
          onClick={() => navigate("/counts")}
        >
          All Counts
        </Button>
      </CardHeader>
      <CardContent className="relative pb-6">
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 5, // Reduced bottom margin to tighten space
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false}
                tickMargin={4} // Reduced from 8 to 4 to tighten spacing
                interval="preserveStartEnd" // Only show first and last tick when there are many data points
                minTickGap={30} // Minimum pixel space between ticks
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: '#69ad4c', strokeWidth: 1, strokeDasharray: '5 5' }}
              />
              <Legend 
                iconType="circle" 
                iconSize={8}
                wrapperStyle={{ 
                  visibility: 'hidden', 
                  height: 0, 
                  position: 'absolute' 
                }} 
              />
              <Area
                type="monotone"
                dataKey="cash"
                name="Cash"
                stackId="1"
                stroke="var(--color-cash)"
                fill="var(--color-cash)"
                fillOpacity={0.4}
              />
              <Area
                type="monotone"
                dataKey="check"
                name="Check"
                stackId="1"
                stroke="var(--color-check)"
                fill="var(--color-check)"
                fillOpacity={0.4}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
      <CardFooter className="pt-2 pb-3">
        <div className="flex w-full justify-between items-center">
          <div className="grid gap-1">
            <div className="flex items-center gap-2 font-medium leading-none">
              {trending === "up" ? (
                <>Trending up by {displayPercentage}% <TrendingUp className="h-4 w-4 text-primary" /></>
              ) : trending === "down" ? (
                <>Trending down by {displayPercentage}% <TrendingDown className="h-4 w-4 text-destructive" /></>
              ) : (
                <>No change in trend</>
              )}
            </div>
            <div className="flex items-center gap-2 leading-none text-muted-foreground">
              Prior 12 Months
            </div>
          </div>
          
          {/* Legend moved to the footer to be on the same line as trending information */}
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#69ad4c] mr-1.5"></div>
              <span className="text-xs text-muted-foreground">Cash</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-[#3b82f6] mr-1.5"></div>
              <span className="text-xs text-muted-foreground">Check</span>
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}