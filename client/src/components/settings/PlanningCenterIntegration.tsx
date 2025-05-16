import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon, UserPlus, Users, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
// Reference the Planning Center logo from the public directory
const planningCenterLogo = "/assets/planning-center-full-color.png";

// Planning Center brand color
const PLANNING_CENTER_BLUE = "#2176FF";

interface PlanningCenterStatus {
  connected: boolean;
  lastSyncDate?: string;
  peopleCount?: number;
}

const PlanningCenterIntegration = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  // Removed unused state variables for troubleshooting features
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  
  // Hook to get current user and access church information
  const { user } = useAuth();

  // Function to handle Planning Center connection
  const handleConnectPlanningCenter = async () => {
    try {
      setIsConnecting(true);
      
      // Get auth URL from our backend with churchId parameter
      const response = await apiRequest('/api/planning-center/auth-url', 'GET');
      
      if (response?.url) {
        console.log('Got Planning Center auth URL with churchId:', response.churchId);
        
        // Store churchId in both localStorage and sessionStorage for redundancy
        if (response.churchId) {
          localStorage.setItem('planningCenterChurchId', response.churchId);
          sessionStorage.setItem('planningCenterChurchId', response.churchId);
          console.log('Stored churchId in storage mechanisms:', response.churchId);
        }
        
        // Detect if we're on a mobile device (client-side)
        const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        // Use server-provided device detection as a backup/verification
        const serverDetectedMobile = response.deviceType === 'mobile';
        
        // Log both device detections for troubleshooting
        console.log('Device detection:', {
          clientSide: isMobileDevice ? 'mobile' : 'desktop',
          serverSide: response.deviceType || 'unknown'
        });
        
        // Final determination - use client detection primarily, but consider server detection
        const finalIsMobile = isMobileDevice || serverDetectedMobile;
        
        // Store device type in session storage for use later in the flow
        sessionStorage.setItem('planningCenterDeviceType', finalIsMobile ? 'mobile' : 'desktop');
        console.log('Final device determination:', finalIsMobile ? 'mobile' : 'desktop');
        
        // Add a timestamp to help with cache-busting (use server timestamp if available)
        const timeStamp = response.timestamp || Date.now();
        localStorage.setItem('planningCenterAuthTimestamp', timeStamp.toString());
        
        if (finalIsMobile) {
          console.log('Mobile device detected, using direct navigation approach');
          
          // On mobile, we need to use a different approach
          // First, show the user a toast to indicate we're proceeding
          toast({
            title: "Connecting to Planning Center",
            description: "You'll be redirected to authenticate with Planning Center. After authentication, you'll be returned to PlateSync.",
            duration: 5000,
          });
          
          // Create the auth URL with device type parameter for better handling
          let authUrl = response.url;
          // Append deviceType=mobile to the auth URL if it doesn't already have query params
          if (authUrl.includes('?')) {
            authUrl += '&deviceType=mobile';
          } else {
            authUrl += '?deviceType=mobile';
          }
          
          // Add a short delay to ensure the toast is shown before redirect
          setTimeout(() => {
            // On mobile, directly navigate to the auth URL
            // This works better than popups on mobile devices
            window.location.href = authUrl;
            // Note: We won't reset isConnecting here since we're leaving the page
          }, 1000);
        } else {
          // On desktop, open in a new tab with deviceType parameter
          console.log('Desktop device detected, opening in new tab');
          
          // Create the auth URL with device type parameter
          let authUrl = response.url;
          if (authUrl.includes('?')) {
            authUrl += '&deviceType=desktop';
          } else {
            authUrl += '?deviceType=desktop';
          }
          
          const newTab = window.open(authUrl, '_blank');
          
          // If popup was blocked, fall back to informing the user
          if (!newTab) {
            toast({
              title: "Popup Blocked",
              description: "Please allow popups for this site to connect with Planning Center.",
              variant: "destructive",
            });
          }
          
          // Reset the connecting state since we're not actually leaving the page on desktop
          setIsConnecting(false);
        }
      } else {
        throw new Error('Failed to get Planning Center authorization URL');
      }
    } catch (error) {
      console.error('Error connecting to Planning Center:', error);
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to start Planning Center connection.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  // Check URL parameters for connection status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Check if the request is coming from a mobile device
    const isMobileParam = params.has('mobile') && params.get('mobile') === 'true';
    
    // Also detect mobile device directly using user agent as fallback
    const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Log device detection for debugging
    console.log('Device detection:', {
      fromUrlParam: isMobileParam ? 'mobile' : 'desktop', 
      fromUserAgent: isMobileUserAgent ? 'mobile' : 'desktop'
    });
    
    // Process connection status
    if (params.has('planningCenterConnected')) {
      setConnectionStatus('success');
      
      // Refresh connection status to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
      
      // Clear the URL parameter after 5 seconds
      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        setConnectionStatus(null);
      }, 5000);
    } else if (params.has('planningCenterError')) {
      setConnectionStatus('error');
      
      // Get error details if available
      const errorType = params.get('planningCenterError');
      const errorDescription = params.get('error_description');
      
      if (errorType || errorDescription) {
        console.error('Planning Center connection error:', { 
          type: errorType, 
          description: errorDescription 
        });
      }
      
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
        className: "text-white",
        style: { backgroundColor: PLANNING_CENTER_BLUE },
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
      // Clear any stored connectionIds from previous sessions
      try {
        localStorage.removeItem('planningCenterChurchId');
        sessionStorage.removeItem('planningCenterChurchId');
        console.log('Cleared Planning Center storage');
      } catch (e) {
        console.error('Error clearing local storage:', e);
      }
      
      // Send the disconnect request
      const response = await apiRequest('/api/planning-center/disconnect', 'POST');
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Successfully disconnected from Planning Center.",
        className: "bg-[#69ad4c] text-white",
      });
      
      // Force a delay before allowing reconnection to ensure token revocation completes
      setIsConnecting(true);
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
        setIsConnecting(false);
      }, 2000);
    },
    onError: (error) => {
      toast({
        title: "Disconnect Failed",
        description: error instanceof Error ? error.message : "Failed to disconnect from Planning Center.",
        variant: "destructive",
      });
    },
  });
  
  // Removed unused mutations for troubleshooting features

  return (
    <div className="w-full">
      {/* Planning Center Logo Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <img 
            src={planningCenterLogo} 
            alt="Planning Center Logo" 
            className="h-8 mr-2" 
          />
        </div>
        {status?.connected && (
          <Badge style={{ backgroundColor: PLANNING_CENTER_BLUE, color: "white" }}>Connected</Badge>
        )}
      </div>
      
      {connectionStatus && (
        <div className="mb-4">
          {connectionStatus === 'success' ? (
            <Alert style={{ backgroundColor: `${PLANNING_CENTER_BLUE}10`, borderColor: PLANNING_CENTER_BLUE }}>
              <CheckCircle className="h-4 w-4" style={{ color: PLANNING_CENTER_BLUE }} />
              <AlertTitle style={{ color: PLANNING_CENTER_BLUE }}>Connection Successful</AlertTitle>
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
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: PLANNING_CENTER_BLUE }} />
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
              <Button
                onClick={handleConnectPlanningCenter}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-white h-10 px-4 py-2 w-full md:w-64 hover:opacity-90"
                style={{ backgroundColor: PLANNING_CENTER_BLUE }}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <LinkIcon className="mr-2 h-4 w-4" />
                    Connect to Planning Center
                  </>
                )}
              </Button>
            </div>
            
            {/* Troubleshooting section removed */}
          </div>
        )}
      </div>
      
      {status?.connected && (
        <div className="space-y-4 pt-4 border-t">
          <div className="flex flex-col md:flex-row md:justify-between space-y-4 md:space-y-0">
            <Button 
              variant="outline" 
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="w-full md:w-64 text-white hover:opacity-90"
              style={{ backgroundColor: `${PLANNING_CENTER_BLUE}80`, borderColor: PLANNING_CENTER_BLUE }}
            >
              {disconnectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LinkIcon className="mr-2 h-4 w-4" />
              )}
              Disconnect
            </Button>
            <div className="flex flex-col">
              <Button 
                onClick={() => importMembersMutation.mutate()}
                disabled={isImporting || importMembersMutation.isPending}
                className="text-white w-full md:w-64"
                style={{ backgroundColor: PLANNING_CENTER_BLUE }}
              >
                {isImporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Import All Members
              </Button>
              <span className="text-xs text-gray-500 mt-1 text-center">
                {status.lastSyncDate 
                  ? `Last import: ${new Date(status.lastSyncDate).toLocaleDateString()} at ${new Date(status.lastSyncDate).toLocaleTimeString()}`
                  : "No members imported yet"}
              </span>
            </div>
          </div>
          
          {/* Troubleshooting section removed */}
        </div>
      )}
    </div>
  );
};

export default PlanningCenterIntegration;