import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon, UserPlus, Users, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface PlanningCenterStatus {
  connected: boolean;
  lastSyncDate?: string;
  peopleCount?: number;
}

const PlanningCenterIntegration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);

  // Check URL parameters for connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('planningCenterConnected')) {
      setConnectionStatus('success');
      
      // Clear the URL parameter after 5 seconds
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setConnectionStatus(null);
      }, 5000);
    } else if (params.has('planningCenterError')) {
      setConnectionStatus('error');
      
      // Clear the URL parameter after 5 seconds
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setConnectionStatus(null);
      }, 5000);
    }
  }, []);

  // Get Planning Center connection status
  const { data: status, isLoading } = useQuery<PlanningCenterStatus>({
    queryKey: ['/api/planning-center/status'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/planning-center/status', 'GET');
        return response;
      } catch (error) {
        // If we get a 403, it means Planning Center is not connected
        return { connected: false };
      }
    },
  });

  // We'll use a dedicated redirect page that's meant to handle Planning Center auth
  // This approach is more reliable in the Replit environment than direct URL or popup
  const planningCenterRedirectUrl = '/planning-center-redirect.html';

  // Handle import members from Planning Center
  const importMembersMutation = useMutation({
    mutationFn: async () => {
      setIsImporting(true);
      const response = await apiRequest('/api/planning-center/import', 'POST');
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Members Imported",
        description: `Successfully imported ${data.importedCount} members from Planning Center.`,
        className: "bg-[#69ad4c] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      setIsImporting(false);
    },
    onError: (error) => {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import members from Planning Center.",
        variant: "destructive",
      });
      setIsImporting(false);
    },
  });

  // Handle disconnect from Planning Center
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/planning-center/disconnect', 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Planning Center.",
        className: "bg-[#69ad4c] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from Planning Center.",
        variant: "destructive",
      });
    },
  });
  
  // Handle clearing of Planning Center tokens (for debugging connection issues)
  const clearTokensMutation = useMutation({
    mutationFn: async () => {
      setIsClearing(true);
      const response = await apiRequest('/api/planning-center/clear-tokens', 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Tokens Cleared",
        description: "Successfully cleared Planning Center tokens. You may need to reconnect.",
        className: "bg-[#69ad4c] text-white",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
      setIsClearing(false);
    },
    onError: (error) => {
      toast({
        title: "Clear Failed",
        description: error instanceof Error ? error.message : "Failed to clear Planning Center tokens.",
        variant: "destructive",
      });
      setIsClearing(false);
    },
  });

  return (
    <div className="w-full">
      <div className="flex justify-end mb-2">
        {status?.connected ? (
          <Badge className="bg-[#69ad4c]">Connected</Badge>
        ) : (
          <Badge variant="outline" className="border-gray-300 text-gray-500">Not Connected</Badge>
        )}
      </div>
      
      {connectionStatus && (
        <div className="mb-4">
          {connectionStatus === 'success' ? (
            <Alert className="bg-[#69ad4c]/10 border-[#69ad4c]">
              <CheckCircle className="h-4 w-4 text-[#69ad4c]" />
              <AlertTitle className="text-[#69ad4c]">Connection Successful</AlertTitle>
              <AlertDescription>
                Your Planning Center account has been successfully connected to PlateSync.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Failed</AlertTitle>
              <AlertDescription>
                There was an error connecting to your Planning Center account. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}
      
      <div className="mb-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin text-[#69ad4c]" />
          </div>
        ) : status?.connected ? (
          <div className="space-y-2">
            <Alert>
              <AlertTitle className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Planning Center Connected
              </AlertTitle>
              <AlertDescription>
                Your Planning Center account is connected and ready to import members.
                {status.lastSyncDate && (
                  <div className="mt-1 text-sm text-gray-500">
                    Last synced: {new Date(status.lastSyncDate).toLocaleDateString()} {new Date(status.lastSyncDate).toLocaleTimeString()}
                  </div>
                )}
                {status.peopleCount !== undefined && (
                  <div className="text-sm text-gray-500">
                    Total people available: {status.peopleCount}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Connect your Planning Center Online account to import your members directly into PlateSync.
              This integration uses OAuth 2.0 to securely connect to your Planning Center account without
              storing your credentials.
            </p>
            <div className="flex justify-center">
              <a
                href="/api/planning-center/authorize"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white h-10 px-4 py-2 w-64"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect to Planning Center
              </a>
            </div>
            
            <div className="border-t mt-4 pt-4">
              <div className="text-sm text-gray-500 mb-2">
                <strong>Troubleshooting:</strong> If you're having connection issues, try clearing any existing tokens.
              </div>
              <Button 
                variant="outline" 
                onClick={() => clearTokensMutation.mutate()}
                disabled={isClearing || clearTokensMutation.isPending}
                className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                {isClearing || clearTokensMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                  </svg>
                )}
                Clear Planning Center Connection (Debug)
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {status?.connected && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="w-64"
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
            <Button 
              className="bg-[#69ad4c] hover:bg-[#69ad4c]/90 text-white w-64"
              onClick={() => importMembersMutation.mutate()}
              disabled={isImporting || importMembersMutation.isPending}
            >
              {isImporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Import Members
            </Button>
          </div>
          
          <div className="border-t pt-4">
            <div className="text-sm text-gray-500 mb-2">
              <strong>Troubleshooting:</strong> If you're having connection issues, try clearing the tokens to force a fresh connection.
            </div>
            <Button 
              variant="outline" 
              onClick={() => clearTokensMutation.mutate()}
              disabled={isClearing || clearTokensMutation.isPending}
              className="w-full border-amber-500 text-amber-700 hover:bg-amber-50"
            >
              {isClearing || clearTokensMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              )}
              Clear Planning Center Connection (Debug)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanningCenterIntegration;