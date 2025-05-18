import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

// Define batch type
interface Batch {
  id: number;
  name: string;
  date: string;
  status: string;
  totalAmount: string;
  churchId: string;
  service: string;
}

export default function FinalizedBatchesTable() {
  const [finalized, setFinalized] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_, navigate] = useLocation();

  // Format currency values
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  // Badge styling
  const getBadgeClass = (status: string) => {
    return "bg-blue-100 text-blue-800 hover:bg-blue-100";
  };

  // Fetch finalized batches from our direct endpoint
  useEffect(() => {
    const loadFinalizedBatches = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Add cache-busting parameter to prevent Vite from interfering
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/direct-finalized-counts?t=${timestamp}`);
        
        console.log('Finalized counts response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch finalized counts: ${response.status}`);
        }
        
        // Parse the response as JSON
        const data = await response.json();
        console.log('Finalized counts data:', data);
        
        if (Array.isArray(data)) {
          setFinalized(data);
        } else {
          throw new Error('Invalid response format: expected an array');
        }
      } catch (err) {
        console.error('Error loading finalized batches:', err);
        setError('Failed to load finalized counts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFinalizedBatches();
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-[#69ad4c]" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error}</p>
      </div>
    );
  }

  // Empty state
  if (!finalized || finalized.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No finalized counts found</p>
      </div>
    );
  }

  // Display finalized batches
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/3">Status</th>
            <th className="py-2 px-3 text-left font-medium text-gray-500 w-1/3">Date</th>
            <th className="py-2 px-3 text-right font-medium text-gray-500 w-1/3">Amount</th>
          </tr>
        </thead>
        <tbody>
          {finalized.map((batch) => (
            <tr 
              key={batch.id}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => navigate(`/batch/${batch.id}`)}
            >
              <td className="py-3 px-3">
                <Badge className={getBadgeClass(batch.status)}>{batch.status}</Badge>
              </td>
              <td className="py-3 px-3 text-gray-700 font-medium">
                {(() => {
                  const dateObj = new Date(batch.date);
                  // Add timezone offset for consistent display
                  const correctedDate = new Date(dateObj.getTime() + dateObj.getTimezoneOffset() * 60000);
                  return format(correctedDate, 'MM/dd/yyyy');
                })()}
              </td>
              <td className="py-3 px-3 font-medium text-[#48BB78] text-right">
                {formatCurrency(batch.totalAmount || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}