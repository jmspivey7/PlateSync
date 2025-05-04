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

  // Mutation to close batch if needed
  const closeBatchMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: "CLOSED" })
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches", batchId] });
      
      toast({
        title: "Batch Closed",
        description: "Count has been automatically closed for attestation.",
      });
      
      // Refetch the batch to update status
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to close batch: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  });

  // Automatically close the batch if it's not already closed or finalized
  const ensureBatchIsClosed = () => {
    if (batch && batch.status === "OPEN") {
      closeBatchMutation.mutate();
      return false;
    }
    return true;
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
    
    // Navigate to Historical Counts page with Finalized filter selected
    setLocation('/counts?filter=finalized');
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

  // Check if we need to close the batch
  if (batch.status === "OPEN") {
    return (
      <PageLayout 
        title={`Preparing Count for Attestation`} 
        subtitle={`${batch.name}`}
      >
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Preparing for Attestation</CardTitle>
            <CardDescription>
              The count needs to be closed before attestation can begin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 p-4 bg-amber-50 rounded-md border border-amber-200">
              <Alert>
                <AlertCircle className="h-4 w-4 text-amber-600 mr-2" />
                <AlertDescription className="text-amber-700">
                  This count is currently open. It needs to be closed before attestation.
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
              
              <Button 
                onClick={() => closeBatchMutation.mutate()}
                className="bg-[#69ad4c] hover:bg-[#5c9a42] text-white"
                disabled={closeBatchMutation.isPending}
              >
                {closeBatchMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Close Count and Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  // If batch is already closed or finalized, show attestation form
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