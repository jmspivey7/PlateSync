import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export function StripeVerificationTest() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!subscriptionId.trim()) {
      setError("Please enter a subscription ID");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/subscription/test-stripe-verification?subscriptionId=${encodeURIComponent(subscriptionId)}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error("Error testing Stripe verification:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Stripe Verification Test</CardTitle>
        <CardDescription>
          Enter a Stripe subscription ID to test verification
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subscription ID</label>
            <Input
              placeholder="sub_123456789"
              value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          {result && (
            <div className="space-y-2 mt-4">
              <h3 className="text-sm font-medium">Result</h3>
              <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            "Test Verification"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}