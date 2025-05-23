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
  nextBillingDate?: string;
  canceledAt?: string | null;
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

  // Start a free trial (authenticated version)
  const { 
    mutate: startTrial, 
    isPending: isStartingTrial
  } = useMutation({
    mutationFn: async () => {
      try {
        return await apiRequest<CreateTrialResponse>("/api/subscription/start-trial", { 
          method: "POST",
          body: {} 
        });
      } catch (error) {
        console.error("Error starting trial:", error);
        throw error instanceof Error ? error : new Error("Unknown error starting trial");
      }
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
  
  // Start a free trial during onboarding (no auth required)
  const { 
    mutate: startOnboardingTrial, 
    isPending: isStartingOnboardingTrial
  } = useMutation({
    mutationFn: async (params: { churchId: string, churchName?: string }) => {
      try {
        return await apiRequest<CreateTrialResponse>("/api/subscription/onboarding-trial", { 
          method: "POST",
          body: params
        });
      } catch (error) {
        console.error("Error starting onboarding trial:", error);
        throw error instanceof Error ? error : new Error("Unknown error starting trial");
      }
    },
    onSuccess: () => {
      // Trial started successfully - no toast notification during onboarding
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
      try {
        const response = await fetch("/api/subscription/init-upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan }),
          credentials: "include"
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to upgrade plan");
        }
        
        const data = await response.json();
        return data as UpgradeInitResponse;
      } catch (error) {
        console.error("Error upgrading plan:", error);
        throw error instanceof Error ? error : new Error("Unknown error upgrading plan");
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      toast({
        title: "Payment initiated",
        description: data.message || "Your payment has been initiated",
      });
      
      // If we have a client secret, redirect to the Stripe payment form
      if (data.clientSecret) {
        // Navigate user to Stripe payment form or handle it in-place
        console.log("Payment client secret:", data.clientSecret);
        // We'll need to implement a Stripe payment form with this client secret
      }
      
      return data;
    },
    onError: (error: Error) => {
      toast({
        title: "Could not process payment",
        description: error.message || "An error occurred processing your payment",
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

  // Create async versions of the mutations with enhanced error handling
  const startTrialAsync = async (): Promise<CreateTrialResponse> => {
    try {
      return await new Promise<CreateTrialResponse>((resolve, reject) => {
        startTrial(undefined, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    } catch (error) {
      console.error("Trial start error:", error);
      throw error;
    }
  };
  
  // Start trial during onboarding (no auth)
  const startOnboardingTrialAsync = async (
    params: { churchId: string, churchName?: string }
  ): Promise<CreateTrialResponse> => {
    try {
      return await new Promise<CreateTrialResponse>((resolve, reject) => {
        startOnboardingTrial(params, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    } catch (error) {
      console.error("Onboarding trial start error:", error);
      throw error;
    }
  };

  const upgradePlanAsync = async (plan: string): Promise<UpgradeInitResponse> => {
    try {
      return await new Promise<UpgradeInitResponse>((resolve, reject) => {
        upgradePlan(plan, {
          onSuccess: (data) => resolve(data),
          onError: (error) => reject(error),
        });
      });
    } catch (error) {
      console.error("Plan upgrade error:", error);
      throw error;
    }
  };
  
  // Add a function to check if the subscription is ready to be shown
  const isSubscriptionReady = (): boolean => {
    return !isLoading && subscriptionStatus !== undefined;
  };

  return {
    subscriptionStatus,
    isLoading,
    error,
    startTrial,
    startTrialAsync,
    isStartingTrial,
    startOnboardingTrial,
    startOnboardingTrialAsync,
    isStartingOnboardingTrial,
    upgradePlan,
    upgradePlanAsync,
    isUpgrading,
    formatTrialRemaining,
    isSubscriptionReady,
  };
}