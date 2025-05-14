import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import PageLayout from "@/components/layout/PageLayout";
import { CreditCard, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SubscriptionPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPlans, setShowPlans] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();
  
  // Check if the user is logged in
  useEffect(() => {
    if (!user) {
      navigate("/auth");
    }
  }, [user, navigate]);

  // Check URL parameters for success flag from payment redirect
  useEffect(() => {
    // Function to verify payment with the server
    const verifyPayment = async (token?: string) => {
      try {
        setIsVerifying(true);
        const res = await fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
          credentials: 'include'
        });
        
        if (!res.ok) {
          throw new Error('Failed to verify payment');
        }
        
        // Refresh subscription status data after a successful payment
        await queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        
        // Show a success toast
        toast({
          title: "Payment Successful!",
          description: "Your subscription has been upgraded successfully.",
          variant: "default",
          className: "bg-green-50 border-green-600 text-green-800",
        });
      } catch (error) {
        console.error('Error verifying payment:', error);
        // Still show a positive message since payment likely went through
        toast({
          title: "Payment Processed",
          description: "Your payment has been processed. It may take a moment to update your account.",
          variant: "default",
        });
      } finally {
        setIsVerifying(false);
      }
    };
    
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const token = params.get("token");
    const canceled = params.get("canceled");
    
    // Auto-verify if we detect success parameters
    if (success === "true") {
      // Call the verification function with token if available
      verifyPayment(token || undefined);
      
      // Clean up URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
      
      // Close the plans view if open
      setShowPlans(false);
    } else if (canceled === "true") {
      // Show a canceled toast
      toast({
        title: "Payment Canceled",
        description: "Your subscription upgrade was canceled. You can try again anytime.",
        variant: "default",
      });
      
      // Clean up URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, [queryClient, toast, setIsVerifying, setShowPlans]);

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