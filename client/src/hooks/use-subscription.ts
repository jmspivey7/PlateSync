import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  
  // Query to get subscription status
  const { 
    data: subscriptionStatus,
    isLoading,
    error,
    refetch
  } = useQuery<SubscriptionStatus>({
    queryKey: ["/api/subscription/status"],
    retry: 1
  });

  // Mutation to start a trial
  const { 
    mutate: startTrial,
    isPending: isStartingTrial 
  } = useMutation<CreateTrialResponse>({
    mutationFn: async () => {
      const response = await apiRequest("/api/subscription/trial", "POST");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trial Started",
        description: "Your 30-day free trial has been started successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Starting Trial",
        description: error.message || "Failed to start your trial. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation to initiate upgrade process
  const { 
    mutate: initiateUpgrade,
    isPending: isInitiatingUpgrade 
  } = useMutation<UpgradeInitResponse, Error, string>({
    mutationFn: async (plan: string) => {
      const response = await apiRequest("/api/subscription/upgrade/init", "POST", { plan });
      return await response.json();
    },
    onSuccess: (data: UpgradeInitResponse) => {
      toast({
        title: "Payment Processing",
        description: "Please complete the payment process to upgrade your subscription.",
      });

      // Return the client secret if available for Stripe
      if (data.clientSecret) {
        // Will eventually use this with Stripe Elements
        console.log("Client secret received:", data.clientSecret);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "Failed to initiate upgrade. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Helper function to format the remaining trial days
  const formatTrialRemaining = () => {
    if (!subscriptionStatus || subscriptionStatus.daysRemaining === null) {
      return "Unknown";
    }
    
    if (subscriptionStatus.daysRemaining <= 0) {
      return "Expired";
    }
    
    if (subscriptionStatus.daysRemaining === 1) {
      return "1 day left";
    }
    
    return `${subscriptionStatus.daysRemaining} days left`;
  };

  return {
    subscriptionStatus,
    isLoading,
    error,
    refetch,
    // Trial functions
    startTrial,
    isStartingTrial,
    formatTrialRemaining,
    // Upgrade functions
    initiateUpgrade,
    isInitiatingUpgrade
  };
}