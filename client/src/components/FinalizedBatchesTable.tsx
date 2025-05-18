import { useEffect, useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { format } from 'date-fns';
import { Badge } from "@/components/ui/badge";
import { Loader2 } from 'lucide-react';

interface FinalizedBatch {
  id: number;
  name: string;
  date: string;
  status: string;
  totalAmount: number;
  churchId: string;
  service: string;
}

export default function FinalizedBatchesTable() {
  const [batches, setBatches] = useState<FinalizedBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinalizedBatches = async () => {
      try {
        setLoading(true);
        // Use our direct endpoint with no middleware interference
        const response = await fetch('/fix-batches/finalized');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched finalized batches:', data);
        setBatches(data);
      } catch (err) {
        console.error('Error fetching finalized batches:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch finalized batches');
      } finally {
        setLoading(false);
      }
    };

    fetchFinalizedBatches();
  }, []);

  // Calculate total amount
  const totalAmount = batches.reduce((sum, batch) => sum + Number(batch.totalAmount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading finalized batches...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
        <p className="font-bold">Error loading finalized batches</p>
        <p>{error}</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center p-8 border border-gray-200 rounded-md bg-gray-50">
        <p className="text-gray-500">No finalized batches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="font-medium text-green-700 flex items-center bg-green-50 p-2 rounded">
        <span>Found {batches.length} finalized batches</span>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>
                {format(new Date(batch.date), 'MM/dd/yyyy')}
              </TableCell>
              <TableCell>{batch.service}</TableCell>
              <TableCell>{batch.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {batch.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                ${Number(batch.totalAmount).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
          
          {/* Total row */}
          <TableRow className="font-bold">
            <TableCell colSpan={4} className="text-right">
              TOTAL
            </TableCell>
            <TableCell className="text-right">
              ${totalAmount.toFixed(2)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}