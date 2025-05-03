"use client"

import { TrendingUp } from "lucide-react"
import { format } from "date-fns"
import { Card, CardContent } from "@/components/ui/card"
import { Batch } from "@shared/schema"

interface TotalRevenueCardProps {
  batch: Batch;
}

export function TotalRevenueCard({ batch }: TotalRevenueCardProps) {
  // Format currency
  const formatCurrency = (amount: string | number | null | undefined) => {
    if (!amount) return "$0.00";
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  return (
    <Card className="mb-6 bg-card">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-medium text-card-foreground/80">Total Revenue</h2>
          <div className="bg-accent/10 text-accent px-2 py-1 rounded-full flex items-center text-sm">
            <TrendingUp className="h-3.5 w-3.5 mr-1" />
            <span>+12.5%</span>
          </div>
        </div>
        
        <div className="text-4xl font-bold mb-6">
          {formatCurrency(batch.totalAmount)}
        </div>
        
        <div className="text-sm text-card-foreground/70">
          <div className="flex items-center">
            <span>Trending up this month</span>
            <TrendingUp className="h-3.5 w-3.5 ml-1" />
          </div>
          <div>
            {format(new Date(batch.date), 'EEEE, MMMM d, yyyy')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}