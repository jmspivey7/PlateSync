import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  // Subscription data
  const { 
    subscriptionStatus, 
    isLoading, 
    startTrial,
    startTrialAsync,
    isStartingTrial,
    formatTrialRemaining,
    isSubscriptionReady
  } = useSubscription();
  
  // UI state
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  
  // Utilities
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Function to verify payment manually (for testing)
  const verifyPayment = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/subscription/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!res.ok) {
        throw new Error('Failed to verify payment');
      }
      
      // Refresh subscription data
      await queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      
      toast({
        title: "Payment Verified",
        description: "Your subscription has been manually verified.",
        variant: "default",
        className: "bg-green-50 border-green-600 text-green-800",
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Function to handle subscription cancellation
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel subscription');
      }
      
      // Refresh subscription data
      await queryClient.invalidateQueries({ queryKey: ['/api/subscription/status'] });
      
      toast({
        title: "Subscription Canceled",
        description: "Your subscription has been canceled. You'll still have access until the end of the billing period.",
        variant: "default",
      });
      
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Cancellation Failed",
        description: error instanceof Error ? error.message : "An error occurred during cancellation",
        variant: "destructive",
      });
    } finally {
      setIsCanceling(false);
    }
  };
  
  // Show expired trial alert if trial is expired
  useEffect(() => {
    if (subscriptionStatus?.status === "TRIAL" && subscriptionStatus.isTrialExpired) {
      setShowExpiredAlert(true);
    } else {
      setShowExpiredAlert(false);
    }
  }, [subscriptionStatus]);

  if (!isSubscriptionReady()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 flex items-center justify-center">
            <p className="text-gray-500">Loading subscription information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No subscription exists yet
  if (subscriptionStatus?.status === "NO_SUBSCRIPTION") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Start Your Free Trial</CardTitle>
          <CardDescription>
            Enjoy 30 days of full access to all features at no cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Experience the full power of PlateSYNQ with our 30-day free trial. 
            No payment information required to get started.
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited members</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Unlimited donation tracking</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Email notifications</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Planning Center integration</span>
            </li>
          </ul>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={async () => {
              try {
                await startTrialAsync();
              } catch (error) {
                console.error("Failed to start trial:", error);
              }
            }} 
            disabled={isStartingTrial}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
          >
            {isStartingTrial && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Start 30-Day Free Trial
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Active trial
  if (subscriptionStatus?.status === "TRIAL" && !subscriptionStatus?.isTrialExpired) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Trial Subscription</CardTitle>
            <Badge className="bg-yellow-500 text-white">
              <Clock className="h-3 w-3 mr-1" />
              {formatTrialRemaining()}
            </Badge>
          </div>
          <CardDescription>
            You're currently on a free trial of PlateSYNQ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You have access to all features during your trial period. 
            Upgrade to a paid plan to continue using PlateSYNQ after your trial ends.
          </p>
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan:</span>
              <span>Trial</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status:</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Ends On:</span>
              <span>
                {subscriptionStatus.trialEndDate ? 
                  new Date(subscriptionStatus.trialEndDate).toLocaleDateString() : 
                  'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onUpgrade} 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Upgrade to Paid Plan
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Expired trial
  if (subscriptionStatus?.status === "TRIAL" && subscriptionStatus?.isTrialExpired) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Trial Expired</CardTitle>
            <Badge className="bg-red-600 text-white">Expired</Badge>
          </div>
          <CardDescription>
            Your free trial has ended
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showExpiredAlert && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your trial has expired. Please upgrade to continue using PlateSYNQ.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-gray-600 mb-4">
            Your free trial period has ended. Upgrade now to continue accessing all features
            and your existing data.
          </p>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan:</span>
              <span>Trial (Expired)</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status:</span>
              <span className="text-red-600 font-medium">Expired</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Expired On:</span>
              <span>
                {subscriptionStatus.trialEndDate ? 
                  new Date(subscriptionStatus.trialEndDate).toLocaleDateString() : 
                  'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onUpgrade} 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Upgrade Now
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  // Active paid subscription
  if (subscriptionStatus?.status === "ACTIVE") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Active Subscription</CardTitle>
            <Badge className="bg-green-600 text-white">Active</Badge>
          </div>
          <CardDescription>
            Your subscription is active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Thank you for subscribing to PlateSYNQ! You have full access to all features.
          </p>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan:</span>
              <span>{subscriptionStatus?.plan || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status:</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Renewal Date:</span>
              <span>
                {subscriptionStatus?.nextBillingDate 
                  ? new Date(subscriptionStatus.nextBillingDate).toLocaleDateString() 
                  : 'Unknown'}
              </span>
            </div>
          </div>
          
          {showCancelConfirm && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-4">
                <p>Are you sure you want to cancel your subscription?</p>
                <p className="text-sm">You'll still have access until the current billing period ends.</p>
                <div className="flex gap-2 justify-end mt-2">
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm" 
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={isCanceling}
                  >
                    No, Keep My Plan
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-700 text-white"
                    size="sm" 
                    onClick={handleCancelSubscription}
                    disabled={isCanceling}
                  >
                    {isCanceling ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Canceling...
                      </>
                    ) : (
                      "Yes, Cancel"
                    )}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          {!showCancelConfirm ? (
            <Button 
              onClick={() => setShowCancelConfirm(true)} 
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              Cancel My Plan
            </Button>
          ) : (
            <Button 
              onClick={() => setShowCancelConfirm(false)} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Back to Subscription Details
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  // Canceled subscription state
  if (subscriptionStatus?.status === "CANCELED") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Subscription Canceled</CardTitle>
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
              Canceled
            </Badge>
          </div>
          <CardDescription>
            Your subscription has been canceled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Your subscription has been canceled. You'll still have access until the end of your current billing period.
          </p>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan:</span>
              <span>{subscriptionStatus?.plan || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status:</span>
              <span className="text-amber-600 font-medium">Canceled</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Canceled On:</span>
              <span>
                {subscriptionStatus?.canceledAt 
                  ? new Date(subscriptionStatus.canceledAt).toLocaleDateString() 
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Access Until:</span>
              <span>
                {subscriptionStatus?.nextBillingDate 
                  ? new Date(subscriptionStatus.nextBillingDate).toLocaleDateString() 
                  : 'Unknown'}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={onUpgrade} 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            Create a New Plan
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Default fallback
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Status</CardTitle>
        <CardDescription>
          Your subscription status could not be determined
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          There was an issue determining your subscription status. Please try refreshing the page
          or contact support if the problem persists.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="w-full"
        >
          Refresh Page
        </Button>
        {process.env.NODE_ENV === 'development' && (
          <Button
            onClick={verifyPayment}
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify Payment (Dev Only)"
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}