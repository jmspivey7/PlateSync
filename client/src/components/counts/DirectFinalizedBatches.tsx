import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Batch } from '../../../../shared/schema';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

// Direct component to show finalized batches for church 40829937
export default function DirectFinalizedBatches() {
  const [_, setLocation] = useLocation();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to format currency values
  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  // Badge styling function
  const getBadgeClass = (status: string) => {
    const statusColors = {
      OPEN: "bg-green-100 text-green-800 hover:bg-green-100",
      FINALIZED: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    };
    return statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800";
  };

  // Load the data directly using the fetch API
  useEffect(() => {
    const loadBatches = async () => {
      setIsLoading(true);
      try {
        // Clear URL params to avoid Vite interfering
        const fetchUrl = '/api/batches?churchId=40829937&status=FINALIZED&_=' + Date.now();
        
        const response = await fetch(fetchUrl);
        console.log('Fetch response:', response.status);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch batches: ${response.status}`);
        }
        
        // Try to parse the response as JSON
        const data = await response.json();
        console.log('Fetched batches:', data);
        
        // If we got data, use it
        if (Array.isArray(data)) {
          setBatches(data.filter(batch => batch.status === 'FINALIZED'));
        } else {
          console.error('Failed to parse response as array');
          setError('Error loading finalized counts: Invalid data format');
          setBatches([]);
        }
      } catch (err) {
        console.error('Error loading batches:', err);
        setError('Failed to load finalized counts');
      } finally {
        setIsLoading(false);
      }
    };

    loadBatches();
  }, []);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="w-8 h-8 animate-spin text-[#4299E1]" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>{error}</p>
        <p className="text-sm mt-1">Please try again later</p>
      </div>
    );
  }

  // Show empty state if no batches
  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No finalized counts found</p>
      </div>
    );
  }

  // Show the finalized batches
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
          {batches.map((batch) => (
            <tr 
              key={batch.id}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setLocation(`/batch/${batch.id}`);
              }}
            >
              <td className="py-3 px-3">
                <Badge className={getBadgeClass(batch.status)}>{batch.status}</Badge>
              </td>
              <td className="py-3 px-3 text-gray-700 font-medium">
                {(() => {
                  // Parse the date string and add timezone offset to ensure correct display
                  const dateObj = new Date(batch.date);
                  // Add the timezone offset to keep the date as stored in the database
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