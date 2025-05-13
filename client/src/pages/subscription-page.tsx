import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { SubscriptionStatus } from "@/components/subscription/subscription-status";
import { SubscriptionPlans } from "@/components/subscription/subscription-plans";
import { Button } from "@/components/ui/button";

export default function SubscriptionPage() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
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
    
    if (success === "true") {
      // Clean up URL params
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleUpgradeClick = () => {
    setShowPlans(true);
  };

  const handleCancelUpgrade = () => {
    setShowPlans(false);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">Manage your PlateSync subscription</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Dashboard
        </Button>
      </div>
      
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
          please don't hesitate to contact our support team.
        </p>
        <Button variant="outline" asChild>
          <a href="mailto:support@platesync.com">Contact Support</a>
        </Button>
      </div>
    </div>
  );
}