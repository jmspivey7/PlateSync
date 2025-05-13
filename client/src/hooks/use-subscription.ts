import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Types for subscription data
interface SubscriptionStatus {
  isActive: boolean;
  isTrialExpired: boolean;
  status: string;
  daysRemaining: number | null;
  trialEndDate: string | null;
}

interface CreateTrialResponse {
  id: number;
  churchId: string;
  plan: string;
  status: string;
  trialStartDate: string;
  trialEndDate: string;
}

interface UpgradeInitResponse {
  status: string;
  message: string;
  plan: string;
  clientSecret?: string;
}

export function useSubscription() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get subscription status
  const {
    data: subscriptionStatus,
    isLoading,
    error,
    refetch
  } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    // The error is suppressed and null is returned when the user is not authenticated
    retry: false,
  });

  // Start a trial subscription
  const startTrialMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/subscription/trial");
      return response.json() as Promise<CreateTrialResponse>;
    },
    onSuccess: () => {
      toast({
        title: "Trial Started!",
        description: "Your 30-day free trial has been started successfully.",
      });
      // Invalidate subscription status to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Starting Trial",
        description: error.message || "There was an error starting your trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Initialize subscription upgrade
  const initiateUpgradeMutation = useMutation({
    mutationFn: async (plan: "MONTHLY" | "ANNUAL") => {
      const response = await apiRequest("POST", "/api/subscription/upgrade/init", { plan });
      return response.json() as Promise<UpgradeInitResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Upgrade Initialized",
        description: data.message || "Your subscription upgrade has been initialized.",
      });
      // Don't invalidate queries here since we want to keep the upgrade flow state
    },
    onError: (error: Error) => {
      toast({
        title: "Error Initializing Upgrade",
        description: error.message || "There was an error initializing your upgrade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Format trial remaining time in friendly way
  const formatTrialRemaining = () => {
    if (!subscriptionStatus?.daysRemaining) return null;

    if (subscriptionStatus.daysRemaining <= 0) {
      return "Trial expired";
    } else if (subscriptionStatus.daysRemaining === 1) {
      return "1 day remaining";
    } else {
      return `${subscriptionStatus.daysRemaining} days remaining`;
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    error,
    startTrial: startTrialMutation.mutate,
    isStartingTrial: startTrialMutation.isPending,
    initiateUpgrade: initiateUpgradeMutation.mutate,
    isInitiatingUpgrade: initiateUpgradeMutation.isPending,
    formatTrialRemaining,
    refetchStatus: refetch
  };
}