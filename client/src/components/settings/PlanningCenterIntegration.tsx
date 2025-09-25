import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, Link as LinkIcon, UserPlus, Users, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
// Import the Planning Center logo directly
import planningCenterLogo from "@assets/planning-center-full-color.png";

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
  const [showCsvWarning, setShowCsvWarning] = useState(false);
  
  // Hook to get current user and access church information
  const { user } = useAuth();
  
  // Debug: Log user data on mount and when it changes
  useEffect(() => {
    console.log('PlanningCenterIntegration user data:', user);
    console.log('User churchId:', user?.churchId);
  }, [user]);

  // Query to check CSV import status
  const { data: csvImportStats } = useQuery({
    queryKey: ['/api/csv-import/stats'],
    retry: false,
  });

  // Function to proceed with Planning Center connection (bypassing CSV warning)
  const proceedWithConnection = async () => {
    setShowCsvWarning(false);
    await connectToPlanningCenter();
  };

  // Function to handle Planning Center connection
  const handleConnectPlanningCenter = async () => {
    // Check if there are existing CSV imports
    if (csvImportStats?.lastImportDate) {
      setShowCsvWarning(true);
      return;
    }

    await connectToPlanningCenter();
  };

  // Actual connection function
  const connectToPlanningCenter = async () => {
    console.log('[Planning Center] Starting connection process...');
    console.log('[Planning Center] Current user:', user);
    console.log('[Planning Center] Church ID:', user?.churchId);
    
    if (!user?.churchId) {
      console.error('[Planning Center] No church ID available');
      toast({
        title: "Connection Failed",
        description: "Church information not available. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsConnecting(true);
      
      // SECURITY FIX: Do NOT send churchId in query parameters
      // Backend will only use the authenticated session's churchId
      const authUrl = `/api/planning-center/auth-url`;
      console.log('[Planning Center] Fetching auth URL from:', authUrl);
      console.log('[Planning Center] ChurchId will be derived from session, not query params');
      
      // Get auth URL from our backend (churchId from authenticated session)
      const response = await apiRequest(authUrl, 'GET');
      
      console.log('[Planning Center] Auth URL response:', response);
      
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
            description: "You'll be redirected to authenticate with Planning Center. After authentication, you'll be returned to PlateSYNQ.",
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
      console.error('[Planning Center] Error during connection:', error);
      console.error('[Planning Center] Error type:', typeof error);
      console.error('[Planning Center] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null,
        raw: error
      });
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : (typeof error === 'string' ? error : "Failed to start Planning Center connection. Please check the console for more details.");
      
      toast({
        title: "Connection Failed",
        description: errorMessage,
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
        console.log('Planning Center status response:', response);
        return response;
      } catch (error) {
        // If we get a 403, it means Planning Center is not connected
        console.error('Planning Center status error:', error);
        return { connected: false };
      }
    },
    // Force refetch after successful import
    refetchOnMount: true,
    refetchOnWindowFocus: true,
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
      const importedCount = data?.importedCount || data?.imported || 0;
      toast({
        title: "Members Imported",
        description: `Successfully imported ${importedCount} members from Planning Center.`,
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
        className: "bg-[#d35f5f] text-white",
      });
      
      // Immediately invalidate and refetch the status
      queryClient.invalidateQueries({ queryKey: ['/api/planning-center/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/planning-center/status'] });
      
      // Also invalidate CSV import stats in case they need updating
      queryClient.invalidateQueries({ queryKey: ['/api/csv-import/stats'] });
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
                Your Planning Center account has been successfully connected to PlateSYNQ.
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
              Connect your Planning Center Online account to import your members directly into PlateSYNQ.
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
              style={{ backgroundColor: "#e11d48", borderColor: "#e11d48" }}
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
                  : isImporting ? "Import in progress..." : importMembersMutation.isSuccess 
                      ? "Import completed successfully" 
                      : "No members imported yet"}
              </span>
            </div>
          </div>
          
          {/* Troubleshooting section removed */}
        </div>
      )}

      {/* CSV Import Warning Dialog */}
      <Dialog open={showCsvWarning} onOpenChange={setShowCsvWarning}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Switching to Planning Center
            </DialogTitle>
            <DialogDescription>
              Your church currently has member data imported from a CSV file. 
              Connecting to Planning Center will merge this data and switch to Planning Center as your primary source.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">What will happen:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Planning Center will become your primary member data source</li>
                    <li>Existing CSV member data will be merged with Planning Center data</li>
                    <li>Donation history will be preserved for all members</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">After connecting to Planning Center:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Member data will sync automatically from Planning Center</li>
                    <li>Updates in Planning Center will reflect in PlateSYNQ</li>
                    <li>You can manually refresh member data anytime</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCsvWarning(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={proceedWithConnection}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Yes, Connect to Planning Center
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlanningCenterIntegration;