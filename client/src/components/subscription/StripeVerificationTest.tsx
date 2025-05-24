import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, CheckCircle2, HelpCircle, LinkIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export function StripeVerificationTest() {
  const [subscriptionId, setSubscriptionId] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("test");
  const { toast } = useToast();
  
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
      setActiveTab("result");
    } catch (err) {
      console.error("Error testing Stripe verification:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLinkSubscription = async () => {
    if (!subscriptionId.trim()) {
      setError("Please enter a subscription ID");
      return;
    }
    
    setLinking(true);
    setError(null);
    
    try {
      const response = await fetch('/api/subscription/link-stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ stripeSubscriptionId: subscriptionId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to link subscription: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Invalidate subscription status to force re-fetch
      queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      
      toast({
        title: "Subscription Linked",
        description: "The Stripe subscription has been linked to your account.",
        variant: "default",
      });
      
      // Update the result display
      handleTest();
    } catch (err) {
      console.error("Error linking subscription:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      
      toast({
        title: "Failed to Link Subscription",
        description: err instanceof Error ? err.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLinking(false);
    }
  };
  
  const renderResultStatus = () => {
    if (!result) return null;
    
    const verificationResult = result.verificationResult || {};
    const isActive = verificationResult.isActive === true;
    const status = verificationResult.status || "";
    
    if (status === "API_ERROR") {
      return (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">API Configuration Issue</AlertTitle>
          <AlertDescription className="text-amber-700">
            The Stripe API couldn't authenticate properly. This usually means the API key is invalid, 
            expired, or doesn't have access to this subscription. Check your API key configuration.
          </AlertDescription>
        </Alert>
      );
    } else if (status === "INVALID") {
      return (
        <Alert className="bg-red-50 border-red-200 mb-4">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Subscription Not Found</AlertTitle>
          <AlertDescription className="text-red-700">
            This subscription ID wasn't found in Stripe. This might be because:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>The subscription ID is incorrect</li>
              <li>The subscription exists in a different Stripe account</li>
              <li>The subscription exists in a different environment (test vs. live)</li>
              <li>The subscription has been deleted from Stripe</li>
            </ul>
          </AlertDescription>
        </Alert>
      );
    } else if (isActive) {
      return (
        <Alert className="bg-green-50 border-green-200 mb-4">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Active Subscription Verified</AlertTitle>
          <AlertDescription className="text-green-700">
            This subscription is active and valid in Stripe. Current status: {status}
          </AlertDescription>
        </Alert>
      );
    } else {
      return (
        <Alert className="bg-slate-50 border-slate-200 mb-4">
          <HelpCircle className="h-4 w-4 text-slate-600" />
          <AlertTitle className="text-slate-800">Subscription Found But Not Active</AlertTitle>
          <AlertDescription className="text-slate-700">
            This subscription exists in Stripe but is not active. Current status: {status}
          </AlertDescription>
        </Alert>
      );
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
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="px-6">
          <TabsList className="w-full">
            <TabsTrigger value="test" className="flex-1">Test</TabsTrigger>
            <TabsTrigger value="result" className="flex-1" disabled={!result}>Results</TabsTrigger>
            <TabsTrigger value="help" className="flex-1">Help</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="test">
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
        </TabsContent>
        
        <TabsContent value="result">
          <CardContent>
            {renderResultStatus()}
            
            {/* Add Link Subscription button when verification is successful */}
            {result?.verificationResult?.isActive && (
              <div className="mb-4">
                <Button 
                  onClick={handleLinkSubscription} 
                  disabled={linking}
                  variant="outline" 
                  className="w-full text-green-600 border-green-200 bg-green-50 hover:bg-green-100 hover:text-green-700 mb-2"
                >
                  {linking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking subscription...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="mr-2 h-4 w-4" />
                      Link Subscription to My Account
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  This will update your account to use this active subscription
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Raw Response</h3>
              <pre className="bg-slate-50 p-4 rounded text-xs overflow-auto max-h-80">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </CardContent>
        </TabsContent>
        
        <TabsContent value="help">
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Common Issues</h3>
              
              <div className="space-y-3">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subscription Not Found</h4>
                  <p className="text-sm mt-1">
                    This occurs when the API key and the subscription are from different Stripe accounts or environments.
                    Make sure your API key is from the same Stripe account where the subscription was created.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">API Error</h4>
                  <p className="text-sm mt-1">
                    Check if your Stripe API key is valid and has the correct permissions.
                    Test mode keys can only access test mode resources, and live mode keys can only access live mode resources.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Where to Find Subscription IDs</h4>
                  <p className="text-sm mt-1">
                    In your Stripe Dashboard, go to Billing {'->'} Subscriptions and click on a specific subscription.
                    The ID will be displayed in the subscription details and always starts with "sub_".
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </TabsContent>
      </Tabs>
    </Card>
  );
}