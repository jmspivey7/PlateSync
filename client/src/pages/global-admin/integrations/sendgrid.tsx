import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, RotateCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
          
          // In a real implementation, fetch the actual configuration from the API
          // For now, we'll load placeholder values
          try {
            const response = await apiRequest('GET', '/api/global-admin/integrations/sendgrid');
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
      
      // Call the API to test SendGrid configuration
      await apiRequest('GET', '/api/test-sendgrid');
      
      // Show success toast
      toast({
        title: "SendGrid is configured correctly",
        description: "SendGrid configuration is working correctly! Your account is ready to send donation notifications.",
        className: "bg-[#69ad4c] text-white",
      });
    } catch (error) {
      // Show error toast
      toast({
        title: "SendGrid configuration issue",
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: "destructive",
        className: "bg-white border-red-600",
      });
    } finally {
      setIsTesting(false);
    }
  };
  
  // Save SendGrid configuration
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      // Send the API key and from email to the server
      await apiRequest('POST', '/api/global-admin/integrations/sendgrid', {
        apiKey: apiKey.startsWith("••••") ? null : apiKey, // Only send if it was changed
        fromEmail
      });
      
      toast({
        title: "Configuration saved",
        description: "SendGrid configuration has been successfully updated",
      });
      
      // Mask the API key after saving
      if (!apiKey.startsWith("••••")) {
        setApiKey("••••••••••••••••••••••••••");
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
            <Mail className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">SendGrid Integration</h2>
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
              
              <div className="flex justify-between items-center">
                <Button 
                  variant="outline" 
                  onClick={testSendGridConfiguration} 
                  disabled={isTesting || !fromEmail}
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
                      Test Configuration
                    </>
                  )}
                </Button>
                
                <Button 
                  onClick={saveConfiguration} 
                  className="bg-[#69ad4c] hover:bg-[#5a9740]"
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
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Email Delivery</CardTitle>
            <CardDescription>
              Send a test email to verify your SendGrid configuration is working correctly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm">
                Testing your email delivery ensures that your SendGrid integration is properly configured. 
                This will send a test email using your current configuration.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-start">
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
                  variant="outline" 
                  className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}