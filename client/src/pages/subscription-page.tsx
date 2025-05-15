import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/use-subscription";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { StripeVerificationTest } from "@/components/subscription/StripeVerificationTest";
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
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const token = params.get("token");
    const canceled = params.get("canceled");
    const error = params.get("error");
    
    // Handle success case
    if (success === "true") {
      setIsVerifying(true);
      
      // Show initial processing message
      toast({
        title: "Payment Successful!",
        description: "Finalizing your subscription...",
        variant: "default",
        className: "bg-green-50 border-green-600 text-green-800",
      });
      
      // If we have a verification token, call the API to verify the payment
      if (token) {
        console.log(`Verifying payment with token: ${token.substring(0, 8)}...`);
        
        // Call the verification endpoint with the token
        fetch('/api/subscription/verify-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
          credentials: 'include'
        })
        .then(response => {
          if (!response.ok) {
            throw new Error('Payment verification failed');
          }
          return response.json();
        })
        .then(data => {
          console.log('Payment verification successful:', data);
          
          // Now refresh the subscription data
          return queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        })
        .then(() => {
          // Show completion toast
          toast({
            title: "Subscription Activated!",
            description: "Your account has been successfully upgraded.",
            variant: "default",
            className: "bg-green-50 border-green-600 text-green-800",
          });
          
          setIsVerifying(false);
        })
        .catch(error => {
          console.error("Error verifying payment:", error);
          
          // Still try to refresh subscription data as a fallback
          queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
          
          toast({
            title: "Verification Issue",
            description: "We'll check your subscription status and update it shortly.",
            variant: "default",
          });
          
          setIsVerifying(false);
        });
      } else {
        // No token, just refresh subscription data
        queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] })
        .then(() => {
          // Show completion toast
          toast({
            title: "Subscription Activated!",
            description: "Your account has been successfully upgraded.",
            variant: "default",
            className: "bg-green-50 border-green-600 text-green-800",
          });
          
          setIsVerifying(false);
        })
        .catch(error => {
          console.error("Error refreshing subscription data:", error);
          setIsVerifying(false);
        });
      }
      
      // Clean up URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
      
      // Close the plans view if open
      setShowPlans(false);
    } 
    // Handle canceled case
    else if (canceled === "true") {
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
    // Handle error case
    else if (error) {
      let errorMessage = "An unexpected error occurred.";
      
      // Map error codes to user-friendly messages
      switch(error) {
        case "invalid_token":
          errorMessage = "Invalid verification token. Please try again.";
          break;
        case "church_not_found":
          errorMessage = "Your church account couldn't be found.";
          break;
        case "invalid_plan":
          errorMessage = "Invalid subscription plan selected.";
          break;
        default:
          errorMessage = "There was a problem processing your payment.";
      }
      
      // Show error toast
      toast({
        title: "Payment Verification Failed",
        description: errorMessage,
        variant: "destructive",
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