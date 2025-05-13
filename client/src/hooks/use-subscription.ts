import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

interface SubscriptionStatus {
  isActive: boolean;
  isTrialExpired: boolean;
  status: string;
  daysRemaining: number | null;
  trialEndDate: string | null;
  plan?: string;
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
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch current subscription status
  const { 
    data: subscriptionStatus, 
    isLoading, 
    error 
  } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    retry: false,
  });

  // Start a free trial
  const { 
    mutate: startTrial, 
    isPending: isStartingTrial
  } = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/subscription/start-trial", {});
      const data = await res.json();
      return data as CreateTrialResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Trial Started",
        description: "Your 30-day free trial has been activated!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not start trial",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Initiate upgrade to paid plan
  const { 
    mutate: upgradePlan, 
    isPending: isUpgrading 
  } = useMutation({
    mutationFn: async (plan: string) => {
      const res = await apiRequest("POST", "/api/subscription/init-upgrade", { plan });
      const data = await res.json();
      return data as UpgradeInitResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Payment initiated",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Could not process payment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper to format the remaining days in the trial
  const formatTrialRemaining = () => {
    if (!subscriptionStatus || !subscriptionStatus.trialEndDate) {
      return "Unknown";
    }

    if (subscriptionStatus.isTrialExpired) {
      return "Expired";
    }

    const daysLeft = subscriptionStatus.daysRemaining || 0;
    
    if (daysLeft <= 0) {
      return "Expires today";
    } else if (daysLeft === 1) {
      return "1 day left";
    } else {
      return `${daysLeft} days left`;
    }
  };

  return {
    subscriptionStatus,
    isLoading,
    error,
    startTrial,
    isStartingTrial,
    upgradePlan,
    isUpgrading,
    formatTrialRemaining,
  };
}