import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Clock, Package, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Batch } from "@shared/schema";
import { format } from "date-fns";

export function CurrentCount() {
  const [_, setLocation] = useLocation();
  
  // Get current batch
  const { data: currentBatch, isLoading } = useQuery<Batch>({
    queryKey: ['/api/batches/current'],
  });
  
  // Format currency
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };
  
  // Status badge
  const getStatusBadge = (status: string) => {
    const statusColors = {
      OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
      CLOSED: "bg-orange-100 text-orange-800 hover:bg-orange-100",
      FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    } as const;
    
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Current Count</CardTitle>
        <CardDescription>
          Active donation collection
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-28">
            <div className="animate-pulse h-4 w-24 bg-gray-200 rounded mb-2"></div>
          </div>
        ) : currentBatch ? (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-lg">{currentBatch.name}</h3>
              {getStatusBadge(currentBatch.status)}
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">
                  {format(new Date(currentBatch.date), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 text-[#48BB78] mr-2" />
                <span className="font-medium">
                  {formatCurrency(currentBatch.totalAmount || 0)}
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setLocation("/counts")}
            >
              Manage Counts
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <Package className="h-10 w-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">No active count</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mx-auto"
              onClick={() => setLocation("/counts")}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Create Count
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}