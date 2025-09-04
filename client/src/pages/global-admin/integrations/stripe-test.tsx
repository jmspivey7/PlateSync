import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import GlobalAdminHeader from "@/components/global-admin/GlobalAdminHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CreditCard, CheckCircle2, AlertCircle, RotateCw, ExternalLink } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

// Simplified Stripe integration test page
export default function StripeTestPage() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [testData, setTestData] = useState<any>(null);
  
  // Load data from the server on mount
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
        
        // Basic token validation
        try {
          const parts = token.split('.');
          if (parts.length !== 3) {
            throw new Error('Invalid token format');
          }
          
          const payload = JSON.parse(atob(parts[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          
          if (payload.exp && payload.exp < currentTime) {
            throw new Error('Token has expired');
          }
          
          setIsLoading(false);
          
          // Directly fetch SQL data to see raw results
          try {
            const response = await fetch('/api/global-admin/dev/stripe-test', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              throw new Error(`Failed to fetch test data: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Raw test data from API:", data);
            setTestData(data);
            
          } catch (error) {
            console.error("Error fetching test data:", error);
            toast({
              title: "Error fetching data",
              description: error instanceof Error ? error.message : "An unknown error occurred",
              variant: "destructive",
            });
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
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <RotateCw className="h-12 w-12 animate-spin text-[#d35f5f]" />
          <p className="text-gray-500">Loading test data...</p>
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
            <CreditCard className="h-7 w-7 text-[#d35f5f] mr-3" />
            <h2 className="text-2xl font-bold">Stripe Test Page</h2>
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
            <CardTitle>Raw Database Values</CardTitle>
            <CardDescription>
              Values directly from the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testData ? (
                <pre className="bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(testData, null, 2)}
                </pre>
              ) : (
                <p>No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {testData?.monthlyPriceId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Monthly Price ID Test</CardTitle>
              <CardDescription>
                Just showing the Monthly Price ID
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testMonthlyPriceId">Monthly Price ID from Database</Label>
                  <Input
                    id="testMonthlyPriceId"
                    value={testData.monthlyPriceId}
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}