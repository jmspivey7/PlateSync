import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Batch } from "@shared/schema";
import AttestationForm from "@/components/counts/AttestationForm";
import PageLayout from "@/components/layout/PageLayout";

const AttestBatchPage = () => {
  const params = useParams();
  const batchId = params.id ? parseInt(params.id) : 0;
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch batch data
  const { data: batch, isLoading } = useQuery<Batch>({
    queryKey: ["/api/batches", batchId],
    queryFn: async () => {
      const response = await fetch(`/api/batches/${batchId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch count details");
      }
      return response.json();
    },
  });

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
    
    // Navigate back to the batch details
    setLocation(`/batch/${batchId}`);
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