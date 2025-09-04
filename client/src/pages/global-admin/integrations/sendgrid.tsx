import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, AlertCircle, RotateCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function SendGridIntegration() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  
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
          
          // Token seems valid, fetch SendGrid configuration
          setIsLoading(false);
          
          // Fetch the actual configuration from the API
          try {
            const response = await fetch('/api/global-admin/integrations/sendgrid', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              throw new Error('Failed to fetch SendGrid configuration');
            }
            
            const data = await response.json();
            
            // Mask the API key for security
            if (data.apiKey) {
              setApiKey("••••••••••••••••••••••••••");
            }
            setFromEmail(data.fromEmail || "");
          } catch (error) {
            console.error("Error fetching SendGrid config:", error);
            setApiKey("");
            setFromEmail("");
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
  
  // Test SendGrid configuration
  const testSendGridConfiguration = async () => {
    try {
      setIsTesting(true);
      
      // Show loading toast
      toast({
        title: "Testing SendGrid...",
        description: "Please wait while we verify your SendGrid configuration.",
      });
      
      // Get the token to include in headers
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Call the API to test SendGrid configuration with proper headers
      const response = await fetch('/api/global-admin/integrations/sendgrid/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          emailTo: fromEmail // Use the from email as the test recipient
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          // Try to parse as JSON for structured error
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Failed to test SendGrid configuration");
        } catch (e) {
          // If not JSON, use text or status
          throw new Error(errorText || `Server error: ${response.status}`);
        }
      }
      
      // Show success toast
      toast({
        title: "SendGrid is configured correctly",
        description: "SendGrid configuration is working correctly! Your account is ready to send donation notifications.",
        className: "bg-[#d35f5f] text-white",
      });
    } catch (error) {
      console.error("Error testing SendGrid:", error);
      // Show error toast
      toast({
        title: "SendGrid configuration issue",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Save SendGrid configuration
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      // Get the token to include in headers
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Prepare the data
      const data: Record<string, string> = { fromEmail };
      
      // Only include the API key if it's a new value (not masked)
      if (!apiKey.startsWith("••••")) {
        data.apiKey = apiKey;
      } else if (apiKey === "" && fromEmail === "") {
        throw new Error("API key and From Email are required");
      }
      
      // Send the API key and from email to the server with proper headers
      const response = await fetch('/api/global-admin/integrations/sendgrid', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        try {
          // Try to parse as JSON for structured error
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.message || "Failed to save configuration");
        } catch (e) {
          // If not JSON, use text or status
          throw new Error(errorText || `Server error: ${response.status}`);
        }
      }
      
      toast({
        title: "Configuration saved",
        description: "SendGrid configuration has been successfully updated",
      });
      
      // Mask the API key after saving
      if (!apiKey.startsWith("••••")) {
        setApiKey("••••••••••••••••••••••••••");
      }
    } catch (error) {
      console.error("Error saving SendGrid config:", error);
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
          <RotateCw className="h-12 w-12 animate-spin text-[#d35f5f]" />
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
            <Mail className="h-7 w-7 text-[#d35f5f] mr-3" />
            <h2 className="text-2xl font-bold">SendGrid Integration</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#d35f5f] text-[#d35f5f] hover:bg-[#d35f5f]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings?tab=integrations")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>SendGrid Configuration</CardTitle>
            <CardDescription>
              Configure SendGrid to enable email notifications for all churches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="apiKey">SendGrid API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your SendGrid API key"
                />
                <p className="text-sm text-gray-500">
                  The API key is used to authenticate with SendGrid's services. You can get this from your SendGrid account.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email Address</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="donations@yourorganization.com"
                />
                <p className="text-sm text-gray-500">
                  This email address will be used as the sender for all emails sent through PlateSync.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveConfiguration} 
                  className="bg-[#d35f5f] hover:bg-[#5a9740] text-white"
                  disabled={isSaving || !fromEmail}
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
              
              <div className="pt-4 border-t mt-6">
                <h3 className="text-lg font-medium mb-2">Test Email Delivery</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Send a test email to verify your SendGrid configuration is working correctly
                </p>
                
                <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start mb-4">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">Important Note</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Before testing, make sure you have saved your configuration with a valid API key and 
                      from email address. The test will use the values currently saved in the system.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button 
                    className="bg-[#d35f5f] hover:bg-[#5a9740] text-white"
                    onClick={testSendGridConfiguration}
                    disabled={isTesting || !fromEmail}
                  >
                    {isTesting ? (
                      <>
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                        Sending Test Email...
                      </>
                    ) : (
                      "Send Test Email"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}