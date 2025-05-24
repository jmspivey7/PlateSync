import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, CheckCircle2, RotateCw, AlertCircle, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PlanningCenterIntegration() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
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
          
          // Token seems valid, fetch Planning Center configuration
          setIsLoading(false);
          
          // In a real implementation, fetch the actual configuration from the API
          // For now, we'll load placeholder values
          try {
            // Send token in the Authorization header
            const token = localStorage.getItem("globalAdminToken");
            const response = await fetch('/api/global-admin/integrations/planning-center', {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch config: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Mask the client secret for security
            if (data.clientId) {
              setClientId(data.clientId);
              setClientSecret(data.clientSecret ? "••••••••••••••••••••••••••" : "");
              setCallbackUrl(data.callbackUrl || window.location.origin + "/api/planning-center/callback");
              setIsAuthenticated(data.isAuthenticated || false);
            } else {
              // Default callback URL
              setCallbackUrl(window.location.origin + "/api/planning-center/callback");
            }
          } catch (error) {
            console.error("Error fetching Planning Center config:", error);
            setClientId("");
            setClientSecret("");
            setCallbackUrl(window.location.origin + "/api/planning-center/callback");
            setIsAuthenticated(false);
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
  
  // Save Planning Center configuration
  const saveConfiguration = async () => {
    try {
      setIsSaving(true);
      
      // Get the global admin token
      const token = localStorage.getItem("globalAdminToken");
      if (!token) {
        throw new Error("Authentication required. Please log in again.");
      }
      
      // Send the client ID and client secret to the server
      const response = await fetch('/api/global-admin/integrations/planning-center', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId,
          clientSecret: clientSecret.startsWith("••••") ? null : clientSecret, // Only send if it was changed
          callbackUrl
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save configuration: ${response.status} ${errorText}`);
      }
      
      toast({
        title: "Configuration saved",
        description: "Planning Center configuration has been successfully updated",
      });
      
      // Mask the client secret after saving
      if (!clientSecret.startsWith("••••") && clientSecret) {
        setClientSecret("••••••••••••••••••••••••••");
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
  
  // Authenticate with Planning Center
  const authenticateWithPlanningCenter = () => {
    if (!clientId || !clientSecret || !callbackUrl) {
      toast({
        title: "Missing configuration",
        description: "Please save your Planning Center configuration first",
        variant: "destructive",
      });
      return;
    }
    
    // Redirect to Planning Center OAuth flow
    // In a real implementation, this would redirect to Planning Center's OAuth authorization URL
    window.open('https://api.planningcenteronline.com/oauth/authorize?client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(callbackUrl) + '&response_type=code&scope=people', '_blank');
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
            <Users className="h-7 w-7 text-[#69ad4c] mr-3" />
            <h2 className="text-2xl font-bold">Planning Center Integration</h2>
          </div>
          <Button
            variant="outline"
            className="border-[#69ad4c] text-[#69ad4c] hover:bg-[#69ad4c]/10 hover:text-[#5a9440]"
            onClick={() => setLocation("/global-admin/settings?tab=integrations")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Planning Center API Configuration</CardTitle>
            <CardDescription>
              Connect to Planning Center Online to sync member data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
            
              <div className="space-y-2">
                <Label htmlFor="clientId">Client ID</Label>
                <Input
                  id="clientId"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Enter your Planning Center Client ID"
                />
                <p className="text-sm text-gray-500">
                  The Client ID is provided when you create an OAuth application in Planning Center.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="clientSecret">Client Secret</Label>
                <Input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Enter your Planning Center Client Secret"
                />
                <p className="text-sm text-gray-500">
                  The Client Secret is provided when you create an OAuth application in Planning Center.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="callbackUrl">Callback URL</Label>
                <Input
                  id="callbackUrl"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://your-platesync-url.com/api/planning-center/callback"
                />
                <p className="text-sm text-gray-500">
                  This URL must match exactly what you entered in Planning Center. Copy this URL to your Planning Center OAuth application settings.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveConfiguration} 
                  className="bg-[#69ad4c] hover:bg-[#5a9740] text-white"
                  disabled={isSaving || !clientId || !clientSecret || !callbackUrl}
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
            <CardTitle>Connect to Planning Center</CardTitle>
            <CardDescription>
              Authenticate with Planning Center to enable member data synchronization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isAuthenticated ? (
                <div className="bg-green-50 border border-green-100 rounded-md p-4 flex items-start">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-green-800">Connected to Planning Center</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Your PlateSync account is successfully connected to Planning Center.
                      You can now sync member data from Planning Center to PlateSync.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-100 rounded-md p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">Not Connected</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Your PlateSync account is not currently connected to Planning Center.
                      Click the button below to start the authentication process.
                    </p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button 
                  variant={isAuthenticated ? "outline" : "default"}
                  className={isAuthenticated 
                    ? "border-red-500 text-red-500 hover:bg-red-50" 
                    : "bg-[#69ad4c] hover:bg-[#5a9740] text-white"}
                  onClick={isAuthenticated 
                    ? () => console.log("Disconnect from Planning Center") 
                    : authenticateWithPlanningCenter}
                  disabled={!clientId || !clientSecret || !callbackUrl}
                >
                  {isAuthenticated ? "Disconnect from Planning Center" : "Connect to Planning Center"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}