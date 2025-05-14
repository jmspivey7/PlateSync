import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { Check, ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionPlansProps {
  onCancel: () => void;
}

export function SubscriptionPlans({ onCancel }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { upgradePlanAsync, isUpgrading } = useSubscription();

  const handleSelectPlan = async (plan: string) => {
    try {
      // Set loading state
      setSelectedPlan(plan);
      
      // Get the checkout URL from the server
      const response = await fetch("/api/subscription/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
        credentials: "include"
      });
      
      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }
      
      const { url } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      // Reset selected plan on error
      setSelectedPlan(null);
    }
  };
  
  // No need for the custom payment form since we're redirecting to Stripe

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Choose a Plan</h2>
        <Button variant="ghost" onClick={onCancel} size="sm">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Plan */}
        <Card className="relative overflow-hidden border-2 hover:border-green-600 hover:shadow-md transition-all flex flex-col">
          <div className="absolute top-0 right-0 px-3 py-1 bg-blue-600 text-white text-xs font-medium">
            Most Popular
          </div>
          <CardHeader>
            <CardTitle>Monthly Plan</CardTitle>
            <CardDescription>Perfect for churches trying PlateSync</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$2.99</span>
              <span className="text-gray-500 ml-1">/month</span>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Unlimited members</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Unlimited donation tracking</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Email notifications</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Planning Center integration</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Full access to all features</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button 
              onClick={() => handleSelectPlan('MONTHLY')} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={selectedPlan === 'MONTHLY'}
            >
              {selectedPlan === 'MONTHLY' ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                'Select Monthly Plan'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Annual Plan */}
        <Card className="relative overflow-hidden border-2 hover:border-green-600 hover:shadow-md transition-all flex flex-col">
          <div className="absolute top-0 right-0 px-3 py-1 bg-green-600 text-white text-xs font-medium">
            Best Value
          </div>
          <CardHeader>
            <CardTitle>Annual Plan</CardTitle>
            <CardDescription>Save over 30% with yearly billing</CardDescription>
            <div className="mt-4">
              <span className="text-3xl font-bold">$25.00</span>
              <span className="text-gray-500 ml-1">/year</span>
              <Badge variant="outline" className="ml-2 bg-green-50">
                Save $10.88
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-2">
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Unlimited members</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Unlimited donation tracking</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Email notifications</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Planning Center integration</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Full access to all features</span>
              </li>
              <li className="flex items-start">
                <Check className="mr-2 h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>Priority support</span>
              </li>
            </ul>
          </CardContent>
          <CardFooter className="mt-auto">
            <Button 
              onClick={() => handleSelectPlan('ANNUAL')} 
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={selectedPlan === 'ANNUAL'}
            >
              {selectedPlan === 'ANNUAL' ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Processing...
                </>
              ) : (
                'Select Annual Plan'
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-500 mt-8">
        <p>
          SSL secured payment through Stripe. Your payment information is encrypted and never stored on our servers.
        </p>
      </div>
    </div>
  );
}