import { TrendingUp, TrendingDown } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Batch, Donation, BatchWithDonations } from "@shared/schema";

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

export function DonationChart() {
  // For navigation to counts page
  const [, navigate] = useLocation();
  
  // Fetch batch data with their donations
  const { data: batches, isLoading } = useQuery<BatchWithDonations[]>({
    queryKey: ['/api/batches/with-donations'],
    select: (data) => {
      console.log("Chart received batch data with donations:", data);
      return data;
    }
  });

  if (isLoading || !batches) {
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
            View Historical Counts
          </Button>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent batches (up to 6)
  const recentBatches = [...batches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
    .reverse();

  // Calculate cash and check totals for each batch
  const chartData = recentBatches.map(batch => {
    // Group donations by type if they exist
    const donations = batch.donations || [];
    
    // Calculate cash and check totals
    const cashTotal = donations
      .filter((d: Donation) => d.donationType === "CASH")
      .reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);
    
    const checkTotal = donations
      .filter((d: Donation) => d.donationType === "CHECK")
      .reduce((sum: number, d: Donation) => sum + parseFloat(d.amount.toString()), 0);

    return {
      date: format(new Date(batch.date), 'MMM d'),
      cash: cashTotal,
      check: checkTotal,
      // Store the full date for tooltip
      fullDate: format(new Date(batch.date), 'MMMM d, yyyy')
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
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row justify-between items-start">
        <div>
          <CardTitle>Count Trends</CardTitle>
          <CardDescription>
            Cash vs. Check donations over time
          </CardDescription>
        </div>
        <Button 
          className="bg-[#69ad4c] hover:bg-[#5a9940] text-white rounded-md" 
          onClick={() => navigate("/counts")}
        >
          View Historical Counts
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 10,
                right: 30,
                left: 0,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent indicator="dot" />
                }
                formatter={(value: any) => formatCurrency(value)}
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
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
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
              Recent Collections: {chartData.length > 0 ? 
                `${chartData[0].fullDate} - ${chartData[chartData.length-1].fullDate}` : 
                "No data available"}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}