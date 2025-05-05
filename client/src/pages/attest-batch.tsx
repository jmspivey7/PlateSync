import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Batch } from "@shared/schema";
import AttestationForm from "@/components/counts/NewAttestationForm";
import PageLayout from "@/components/layout/PageLayout";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AttestBatchPage = () => {
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch batch data
  const { data: batch, isLoading, refetch } = useQuery<Batch>({
    queryKey: ["/api/batches", batchId],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      return response.json();
    },
  });

  // No need to close batch anymore as we're removing CLOSED status
  // We'll just check if batch is OPEN (not FINALIZED) before showing the attestation form

  // Check if attestation is allowed based on batch status
  const canAttest = () => {
    // Only OPEN batches can be attested
    return batch && batch.status === "OPEN";
  };

  const handleBackToCount = () => {
    setLocation(`/batch/${batchId}`);
  };

  const handleAttestationComplete = () => {
    // After attestation is complete, refresh the batch data
    queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId, "details"] });
    queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
    
    toast({
      title: "Success",
      description: "Count attestation completed successfully",
    });
    
    // Navigate to the print report page for this batch
    setLocation(`/print-report?batchId=${batchId}`);
  };

  if (isLoading) {
    return (
      <PageLayout title="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  if (!batch) {
    return (
      <PageLayout title="Count Not Found">
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Count Not Found</h2>
          <p className="text-muted-foreground mb-6">The requested count could not be found.</p>
          <Button onClick={() => setLocation("/counts")}>Back to Counts</Button>
        </div>
      </PageLayout>
    );
  }

  // Check if attestation is allowed
  if (!canAttest()) {
    return (
      <PageLayout 
        title={`Count Already Finalized`} 
        subtitle={`${batch.name}`}
      >
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Attestation Not Available</CardTitle>
            <CardDescription>
              This count has already been finalized
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-amber-50 rounded-md border border-amber-200">
              <Alert>
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                <AlertDescription className="text-amber-700">
                  This count has already been attested and finalized. No further attestation is needed.
                </AlertDescription>
              </Alert>
            </div>
            
            <div className="flex justify-between">
              <Button 
                variant="outline"
                onClick={handleBackToCount}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Count
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // Show attestation form for OPEN batches
  return (
    <PageLayout 
      title={`Attest Count: ${batch.name}`} 
      subtitle={`Count created on ${format(new Date(batch.date), 'MMMM d, yyyy')}`}
    >
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Count Attestation</CardTitle>
          <CardDescription>
            Complete the attestation process to finalize this count
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button 
              variant="outline"
              onClick={handleBackToCount}
              className="mb-6"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Count
            </Button>
          </div>

          <AttestationForm 
            batchId={batchId}
            onComplete={handleAttestationComplete}
          />
        </CardContent>
      </Card>
    </PageLayout>
  );
};

export default AttestBatchPage;