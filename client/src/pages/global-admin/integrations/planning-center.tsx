import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ExternalLink, CheckCircle2, RotateCw, AlertCircle, Users, TestTube, Building2, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

interface PlanningCenterConnection {
  id: string;
  name: string;
  connectedAt: string;
}

function ActiveConnectionsList() {
  const { data: connections, isLoading, error } = useQuery<PlanningCenterConnection[]>({
    queryKey: ["/api/global-admin/integrations/planning-center/active-connections"],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RotateCw className="h-6 w-6 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600">Loading connections...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <AlertCircle className="h-6 w-6 text-red-500" />
        <span className="ml-2 text-sm text-red-600">Failed to load connections</span>
      </div>
    );
  }

  if (!connections || !Array.isArray(connections) || connections.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">
          No churches have connected to Planning Center yet. Once churches link their Planning Center accounts, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Church Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Connected On
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {connections.map((connection) => (
            <tr key={connection.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {connection.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(connection.connectedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanningCenterIntegration() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("");
  const [registrationCallbackUrl, setRegistrationCallbackUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConfig, setIsTestingConfig] = useState(false);
  const [configTestResult, setConfigTestResult] = useState<{
    success: boolean;
    message: string;
    activeConnections?: number;
  } | null>(null);
  
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
              setRegistrationCallbackUrl(data.registrationCallbackUrl || window.location.origin + "/api/planning-center/callback-registration");
            } else {
              // Default callback URLs
              setCallbackUrl(window.location.origin + "/api/planning-center/callback");
              setRegistrationCallbackUrl(window.location.origin + "/api/planning-center/callback-registration");
            }
          } catch (error) {
            console.error("Error fetching Planning Center config:", error);
            setClientId("");
            setClientSecret("");
            setCallbackUrl(window.location.origin + "/api/planning-center/callback");
            setRegistrationCallbackUrl(window.location.origin + "/api/planning-center/callback-registration");
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
          callbackUrl,
          registrationCallbackUrl
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
  const testPlanningCenterConfiguration = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: "Missing configuration",
        description: "Please save your Planning Center configuration first",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingConfig(true);
    setConfigTestResult(null);
    
    try {
      const response = await fetch("/api/global-admin/integrations/planning-center/test", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("globalAdminToken")}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setConfigTestResult({
          success: true,
          message: result.message || "Planning Center API connection successful"
        });
        toast({
          title: "Configuration Test Successful",
          description: result.message || "Planning Center API connection successful",
        });
      } else {
        throw new Error(result.message || "Test failed");
      }
    } catch (error) {
      setConfigTestResult({
        success: false,
        message: error.message || "Failed to connect to Planning Center API"
      });
      toast({
        title: "Configuration Test Failed",
        description: "Please check your Planning Center credentials",
        variant: "destructive",
      });
    } finally {
      setIsTestingConfig(false);
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
            <Users className="h-7 w-7 text-[#d35f5f] mr-3" />
            <h2 className="text-2xl font-bold">Planning Center Integration</h2>
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
                <Label htmlFor="callbackUrl">Main Callback URL</Label>
                <Input
                  id="callbackUrl"
                  value={callbackUrl}
                  onChange={(e) => setCallbackUrl(e.target.value)}
                  placeholder="https://your-platesync-url.com/api/planning-center/callback"
                />
                <p className="text-sm text-gray-500">
                  Used for regular Planning Center authentication. This URL must match exactly what you entered in Planning Center OAuth application settings.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registrationCallbackUrl">Registration Callback URL</Label>
                <Input
                  id="registrationCallbackUrl"
                  value={registrationCallbackUrl}
                  onChange={(e) => setRegistrationCallbackUrl(e.target.value)}
                  placeholder="https://your-platesync-url.com/api/planning-center/callback-registration"
                />
                <p className="text-sm text-gray-500">
                  Used during new user registration flow. Add this as an additional redirect URI in your Planning Center OAuth application settings.
                </p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={saveConfiguration} 
                  className="bg-[#d35f5f] hover:bg-[#5a9740] text-white"
                  disabled={isSaving || !clientId || !clientSecret || !callbackUrl || !registrationCallbackUrl}
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
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Active Connections</CardTitle>
            <CardDescription>
              Churches currently connected to Planning Center Online
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveConnectionsList />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Test Configuration</CardTitle>
            <CardDescription>
              Test the Planning Center API configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium">Configuration Status</h4>
                  <p className="text-sm text-gray-600">
                    Test API connectivity and view active Planning Center connections
                  </p>
                </div>
                <Button
                  onClick={testPlanningCenterConfiguration}
                  disabled={!clientId || !clientSecret || isTestingConfig}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isTestingConfig ? (
                    <>
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4 mr-2" />
                      Test Configuration
                    </>
                  )}
                </Button>
              </div>
              
              {configTestResult && (
                <div className={`rounded-md p-4 ${
                  configTestResult.success 
                    ? "bg-red-50 border border-red-100" 
                    : "bg-red-50 border border-red-100"
                }`}>
                  <div className="flex items-start">
                    {configTestResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    )}
                    <div>
                      <h4 className={`text-sm font-medium ${
                        configTestResult.success ? "text-red-800" : "text-red-800"
                      }`}>
                        {configTestResult.success ? "Configuration Valid" : "Configuration Error"}
                      </h4>
                      <p className={`text-sm mt-1 ${
                        configTestResult.success ? "text-red-700" : "text-red-700"
                      }`}>
                        {configTestResult.message}
                      </p>
                      {configTestResult.activeConnections && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-red-800">
                            Active Connections: {configTestResult.activeConnections}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}