"use client"

import { TrendingUp } from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
import { format } from "date-fns"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { Batch } from "@shared/schema"

interface CountsChartProps {
  batches: Batch[] | undefined;
}

export function CountsChart({ batches }: CountsChartProps) {
  if (!batches || batches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prior Counts</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <p className="text-muted-foreground">No counts data to display</p>
        </CardContent>
      </Card>
    );
  }

  // Transform batches into the format needed for the chart
  // Take the latest 6 batches
  const chartData = [...batches]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6)
    .reverse()
    .map(batch => ({
      date: format(new Date(batch.date), 'MMM d'),
      amount: parseFloat(batch.totalAmount?.toString() || "0")
    }));

  // Calculate percentage change from the first to the last batch
  const calculatePercentChange = () => {
    if (chartData.length < 2) return 0;
    
    const firstAmount = chartData[0].amount;
    const lastAmount = chartData[chartData.length - 1].amount;
    
    if (firstAmount === 0) return 0;
    
    return ((lastAmount - firstAmount) / firstAmount) * 100;
  };

  const percentChange = calculatePercentChange();
  const isTrendingUp = percentChange >= 0;

  const chartConfig = {
    amount: {
      label: "Amount",
      color: "var(--primary)",
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prior Counts</CardTitle>
        <CardDescription>Recent donation collection history</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="amount" fill="var(--color-amount)" radius={8}>
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
                formatter={(value: number) => new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(value)}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className={`flex gap-2 font-medium leading-none ${isTrendingUp ? 'text-accent' : 'text-destructive'}`}>
          {isTrendingUp ? "Trending up" : "Trending down"} by {Math.abs(percentChange).toFixed(1)}% {isTrendingUp ? <TrendingUp className="h-4 w-4" /> : null}
        </div>
        <div className="leading-none text-muted-foreground">
          Showing donation amounts for the last {chartData.length} counts
        </div>
      </CardFooter>
    </Card>
  )
}