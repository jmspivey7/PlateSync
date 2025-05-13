import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  const { 
    subscriptionStatus, 
    isLoading, 
    startTrial,
    startTrialAsync,
    isStartingTrial,
    formatTrialRemaining,
    isSubscriptionReady
  } = useSubscription();
  
  const [showExpiredAlert, setShowExpiredAlert] = useState(false);
  
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
            Experience the full power of PlateSync with our 30-day free trial. 
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
            className="w-full bg-green-600 hover:bg-green-700"
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
            <Badge className="bg-blue-500">
              <Clock className="h-3 w-3 mr-1" />
              {formatTrialRemaining()}
            </Badge>
          </div>
          <CardDescription>
            You're currently on a free trial of PlateSync
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            You have access to all features during your trial period. 
            Upgrade to a paid plan to continue using PlateSync after your trial ends.
          </p>
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan</span>
              <span>Trial</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Ends On</span>
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
            className="w-full bg-green-600 hover:bg-green-700"
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
            <Badge variant="destructive">Expired</Badge>
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
                Your trial has expired. Please upgrade to continue using PlateSync.
              </AlertDescription>
            </Alert>
          )}
          
          <p className="text-gray-600 mb-4">
            Your free trial period has ended. Upgrade now to continue accessing all features
            and your existing data.
          </p>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan</span>
              <span>Trial (Expired)</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status</span>
              <span className="text-red-600 font-medium">Expired</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Expired On</span>
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
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Upgrade Now
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Active paid subscription
  if (subscriptionStatus.status === "ACTIVE") {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-2">
            <CardTitle>Active Subscription</CardTitle>
            <Badge className="bg-green-600">Active</Badge>
          </div>
          <CardDescription>
            Your subscription is active
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Thank you for subscribing to PlateSync! You have full access to all features.
          </p>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Plan</span>
              <span>{subscriptionStatus.plan || 'Standard'}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-medium">Status</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">Billing</span>
              <span>{subscriptionStatus.plan === 'MONTHLY' ? 'Monthly' : 'Annual'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <div className="text-center w-full text-sm text-gray-500">
            Contact support to manage your subscription
          </div>
        </CardFooter>
      </Card>
    );
  }

  // Other states (canceled, expired paid subscription)
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center mb-2">
          <CardTitle>Subscription</CardTitle>
          <Badge variant="outline">
            {subscriptionStatus.status}
          </Badge>
        </div>
        <CardDescription>
          Your subscription status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          {subscriptionStatus.status === "CANCELED" 
            ? "Your subscription has been canceled." 
            : "Your subscription has expired."}
        </p>
        
        <div className="grid gap-2">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-medium">Plan</span>
            <span>{subscriptionStatus.plan || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-medium">Status</span>
            <span className="text-amber-600 font-medium">{subscriptionStatus.status}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={onUpgrade} 
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Reactivate Subscription
        </Button>
      </CardFooter>
    </Card>
  );
}