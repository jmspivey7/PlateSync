import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import PageLayout from "@/components/layout/PageLayout";
import { CreditCard } from "lucide-react";

export default function SubscriptionPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPlans, setShowPlans] = useState(false);
  
  // Check if the user is logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Check URL parameters for success flag from payment redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const paymentIntent = params.get("payment_intent");
    
    if (success === "true" || paymentIntent) {
      // Refresh subscription status data
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
      
      // Clean up URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
      
      // Close the plans view if open
      setShowPlans(false);
    }
  }, [queryClient]);

  const handleUpgradeClick = () => {
    setShowPlans(true);
  };

  const handleCancelUpgrade = () => {
    setShowPlans(false);
  };

  return (
    <PageLayout
      title="Subscription Management"
      subtitle="Manage your PlateSync subscription"
      icon={<CreditCard className="h-6 w-6 text-[#69ad4c]" />}
    >
      <div className="space-y-6">
        <div className="max-w-2xl mx-auto">
          {showPlans ? (
            <SubscriptionPlans onCancel={handleCancelUpgrade} />
          ) : (
            <SubscriptionStatus onUpgrade={handleUpgradeClick} />
          )}
        </div>
        
        <div className="border-t pt-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-medium mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            If you have any questions about your subscription or need assistance,
            please don't hesitate to <a href="mailto:support@platesync.com" className="text-green-600 hover:text-green-700 font-medium">contact our support team</a>.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}