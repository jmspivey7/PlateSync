import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle, RotateCw, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";

export default function StripeIntegration() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [liveSecretKey, setLiveSecretKey] = useState("");
  const [livePublicKey, setLivePublicKey] = useState("");
  const [testSecretKey, setTestSecretKey] = useState("");
  const [testPublicKey, setTestPublicKey] = useState("");
  const [monthlyPriceId, setMonthlyPriceId] = useState("");
  const [annualPriceId, setAnnualPriceId] = useState("");
  const [monthlyPaymentLink, setMonthlyPaymentLink] = useState("");
  const [annualPaymentLink, setAnnualPaymentLink] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  // Check if the global admin is authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("globalAdminToken");
        
        if (!token) {
          toast({
            title: "Authentication required",
            description: "Please log in to access the global admin portal",
            variant: "destructive",
          });
          setLocation("/global-admin/login");
          return;
        }
        
        // We have a token, verify if it's valid
        try {
          // Basic token validation
          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }
          
          // Check token expiration
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            throw new Error('Token has expired');
          }
          
          // Token seems valid, proceed with loading
          setIsLoading(false);
          
          // Fetch the Stripe configuration from the API
          try {
            // Get the admin token from localStorage
            const token = localStorage.getItem("globalAdminToken");
            if (!token) {
              throw new Error("Authentication token not found");
            }
            
            // Make API request with token in Authorization header
            const response = await fetch('/api/global-admin/integrations/stripe', {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch configuration: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Stripe config from API:", data);
            
            // Mask the secret keys for security
            if (data.liveSecretKey) {
              setLiveSecretKey("••••••••••••••••••••••••••");
            } else {
              setLiveSecretKey("");
            }
            
            if (data.testSecretKey) {
              setTestSecretKey("••••••••••••••••••••••••••");
            } else {
              setTestSecretKey("");
            }
            
            // Set the rest of the values directly from the API response
            setLivePublicKey(data.livePublicKey || "");
            setTestPublicKey(data.testPublicKey || "");
            setMonthlyPriceId(data.monthlyPriceId || "");
            setAnnualPriceId(data.annualPriceId || "");
            setMonthlyPaymentLink(data.monthlyPaymentLink || "");
            setAnnualPaymentLink(data.annualPaymentLink || "");
            setIsLiveMode(Boolean(data.isLiveMode));
          } catch (error) {
            console.error("Error fetching Stripe config:", error);
          }
          
        } catch (err) {
          console.error('Token validation error:', err);
          localStorage.removeItem("globalAdminToken");
          toast({
            title: "Session expired",
            description: "Please log in again to access the global admin portal",
            variant: "destructive",
          });
          setLocation("/global-admin/login");
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setLocation("/global-admin/login");
      }
    };
    
    checkAuth();
  }, [setLocation, toast]);
  
  // Test Stripe configuration
  const testStripeConfiguration = async () => {
    try {
      setIsTesting(true);
      
      // Show loading toast
      toast({
        title: "Testing Stripe connection...",
        description: "Please wait while we verify your Stripe configuration.",
      });
      
      // Call the API to test Stripe configuration
      await apiRequest('/api/test-stripe');
      
      // Show success toast
      toast({
        title: "Stripe is configured correctly",
        description: "Your Stripe integration is working properly!",
        className: "bg-[#69ad4c] text-white",
      });
    } catch (error) {
      // Show error toast
      toast({
        title: "Stripe configuration issue",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
        className: "bg-white border-red-600",
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Save Stripe configuration
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      // Get the admin token from localStorage
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }
      
      // Use direct fetch to avoid apiRequest type issues
      const response = await fetch('/api/global-admin/integrations/stripe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          liveSecretKey: liveSecretKey.startsWith("••••") ? null : liveSecretKey,
          livePublicKey,
          testSecretKey: testSecretKey.startsWith("••••") ? null : testSecretKey,
          testPublicKey,
          monthlyPriceId,
          annualPriceId,
          monthlyPaymentLink,
          annualPaymentLink,
          isLiveMode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save configuration');
      }
      
      toast({
        title: "Configuration saved",
        description: "Stripe configuration has been successfully updated",
        className: "bg-[#69ad4c] text-white",
      });
      
      // Mask the secret keys after saving
      if (!liveSecretKey.startsWith("••••") && liveSecretKey) {
        setLiveSecretKey("••••••••••••••••••••••••••");
      }
      if (!testSecretKey.startsWith("••••") && testSecretKey) {
        setTestSecretKey("••••••••••••••••••••••••••");
      }
    } catch (error) {
      toast({
        title: "Error saving configuration",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RotateCw className="h-12 w-12 animate-spin text-[#69ad4c]" />
          <p className="text-gray-500">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <GlobalAdminHeader />
      
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <CreditCard className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">Stripe Integration</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-md p-4 flex items-start mb-6">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800">Stripe Configuration</h4>
            <p className="text-sm text-blue-700 mt-1">
              You need a Stripe account to process subscription payments. 
              <a 
                href="https://dashboard.stripe.com/apikeys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 underline ml-1 inline-flex items-center"
              >
                Get your API keys from the Stripe Dashboard
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
          </div>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Configure your Stripe API keys for payment processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4 p-2 bg-gray-50 rounded-md">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${isLiveMode ? 'bg-green-500' : 'bg-amber-500'}`}></div>
                <span className="font-medium">{isLiveMode ? 'Live Mode' : 'Test Mode'}</span>
              </div>
              <div className="flex items-center">
                <Label htmlFor="mode-toggle" className="mr-2 text-sm">Test</Label>
                <div
                  onClick={() => setIsLiveMode(!isLiveMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer ${isLiveMode ? 'bg-[#69ad4c]' : 'bg-gray-300'}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isLiveMode ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </div>
                <Label htmlFor="mode-toggle" className="ml-2 text-sm">Live</Label>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Live Mode Keys</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="liveSecretKey">Live Secret Key</Label>
                    <Input
                      id="liveSecretKey"
                      type="password"
                      value={liveSecretKey}
                      onChange={(e) => setLiveSecretKey(e.target.value)}
                      placeholder="sk_live_..."
                    />
                    <p className="text-sm text-gray-500">
                      Your Stripe Live Secret Key. This is used for server-side API calls.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="livePublicKey">Live Publishable Key</Label>
                    <Input
                      id="livePublicKey"
                      value={livePublicKey}
                      onChange={(e) => setLivePublicKey(e.target.value)}
                      placeholder="pk_live_..."
                    />
                    <p className="text-sm text-gray-500">
                      Your Stripe Live Publishable Key. This is used for client-side integration.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Test Mode Keys</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="testSecretKey">Test Secret Key</Label>
                    <Input
                      id="testSecretKey"
                      type="password"
                      value={testSecretKey}
                      onChange={(e) => setTestSecretKey(e.target.value)}
                      placeholder="sk_test_..."
                    />
                    <p className="text-sm text-gray-500">
                      Your Stripe Test Secret Key. This is used for testing server-side API calls.
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="testPublicKey">Test Publishable Key</Label>
                    <Input
                      id="testPublicKey"
                      value={testPublicKey}
                      onChange={(e) => setTestPublicKey(e.target.value)}
                      placeholder="pk_test_..."
                    />
                    <p className="text-sm text-gray-500">
                      Your Stripe Test Publishable Key. This is used for testing client-side integration.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Subscription Configuration</CardTitle>
            <CardDescription>
              Configure the subscription products and payment links
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-medium">Monthly Subscription ($2.99/month)</h3>
                <div className="space-y-2">
                  <Label htmlFor="monthlyPriceId">Monthly Price ID</Label>
                  <Input
                    id="monthlyPriceId"
                    value={monthlyPriceId}
                    onChange={(e) => setMonthlyPriceId(e.target.value)}
                    placeholder="price_..."
                  />
                  <p className="text-sm text-gray-500">
                    Stripe Price ID for the monthly subscription plan.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="monthlyPaymentLink">Monthly Payment Link</Label>
                  <Input
                    id="monthlyPaymentLink"
                    value={monthlyPaymentLink}
                    onChange={(e) => setMonthlyPaymentLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                  />
                  <p className="text-sm text-gray-500">
                    Stripe Payment Link URL for the monthly subscription plan.
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium">Annual Subscription ($25.00/year)</h3>
                <div className="space-y-2">
                  <Label htmlFor="annualPriceId">Annual Price ID</Label>
                  <Input
                    id="annualPriceId"
                    value={annualPriceId}
                    onChange={(e) => setAnnualPriceId(e.target.value)}
                    placeholder="price_..."
                  />
                  <p className="text-sm text-gray-500">
                    Stripe Price ID for the annual subscription plan.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="annualPaymentLink">Annual Payment Link</Label>
                  <Input
                    id="annualPaymentLink"
                    value={annualPaymentLink}
                    onChange={(e) => setAnnualPaymentLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                  />
                  <p className="text-sm text-gray-500">
                    Stripe Payment Link URL for the annual subscription plan.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-between items-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={testStripeConfiguration} 
                  disabled={isTesting}
                  className="mr-2"
                >
                  {isTesting ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={saveConfiguration} 
                  className="bg-[#69ad4c] hover:bg-[#5a9740] text-white"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Configuration"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}