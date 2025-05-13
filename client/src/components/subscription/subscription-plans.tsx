import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import { Check, ChevronLeft } from "lucide-react";
import { PaymentForm } from "./payment-form";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlansProps {
  onCancel: () => void;
}

export function SubscriptionPlans({ onCancel }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const { upgradePlan } = useSubscription();

  const handleSelectPlan = (plan: string) => {
    setSelectedPlan(plan);
  };

  const handlePaymentSuccess = () => {
    onCancel();
  };

  const handlePaymentCancel = () => {
    setSelectedPlan(null);
  };

  if (selectedPlan) {
    return (
      <PaymentForm 
        plan={selectedPlan} 
        onSuccess={handlePaymentSuccess} 
        onCancel={handlePaymentCancel} 
      />
    );
  }

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
        <Card className="relative overflow-hidden border-2 hover:border-green-600 hover:shadow-md transition-all">
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
          <CardContent>
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
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('MONTHLY')} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Select Monthly Plan
            </Button>
          </CardFooter>
        </Card>

        {/* Annual Plan */}
        <Card className="relative overflow-hidden border-2 hover:border-green-600 hover:shadow-md transition-all">
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
          <CardContent>
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
          <CardFooter>
            <Button 
              onClick={() => handleSelectPlan('ANNUAL')} 
              className="w-full bg-green-600 hover:bg-green-700"
            >
              Select Annual Plan
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="text-center text-sm text-gray-500 mt-8">
        <p className="mb-2">
          All plans include a 30-day free trial. No credit card required to start.
        </p>
        <p>
          SSL secured payment through Stripe. Your payment information is encrypted and never stored on our servers.
        </p>
      </div>
    </div>
  );
}