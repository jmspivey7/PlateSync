import { useState } from "react";
import { useSubscription } from "@/hooks/use-subscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, CreditCard } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SubscriptionPlansProps {
  onCancel: () => void;
}

export function SubscriptionPlans({ onCancel }: SubscriptionPlansProps) {
  const [selectedPlan, setSelectedPlan] = useState<string>("MONTHLY");
  const { initiateUpgrade, isInitiatingUpgrade } = useSubscription();

  const handleUpgrade = () => {
    if (selectedPlan === "MONTHLY" || selectedPlan === "ANNUAL") {
      initiateUpgrade(selectedPlan);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
        <p className="text-gray-600">
          Select the plan that works best for your church
        </p>
      </div>

      <RadioGroup 
        value={selectedPlan} 
        onValueChange={setSelectedPlan}
        className="grid gap-4 md:grid-cols-2"
      >
        {/* Monthly Plan */}
        <div className="relative">
          <RadioGroupItem 
            value="MONTHLY" 
            id="monthly" 
            className="absolute right-4 top-4 h-4 w-4"
          />
          <Label htmlFor="monthly" className="sr-only">Monthly Plan</Label>
          <Card className={`h-full cursor-pointer hover:border-primary transition-colors ${
            selectedPlan === "MONTHLY" ? "border-primary ring-2 ring-primary ring-opacity-50" : ""
          }`}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Monthly Plan</span>
                <span className="text-2xl font-bold text-green-600">$2.99</span>
              </CardTitle>
              <p className="text-gray-500 text-sm">Billed monthly</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Flexible monthly payment with all features included.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited donations</span>
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
          </Card>
        </div>

        {/* Annual Plan */}
        <div className="relative">
          <RadioGroupItem 
            value="ANNUAL" 
            id="annual" 
            className="absolute right-4 top-4 h-4 w-4"
          />
          <Label htmlFor="annual" className="sr-only">Annual Plan</Label>
          <Card className={`h-full cursor-pointer hover:border-primary transition-colors ${
            selectedPlan === "ANNUAL" ? "border-primary ring-2 ring-primary ring-opacity-50" : ""
          }`}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Annual Plan</CardTitle>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">$25.00</div>
                  <div className="text-sm text-gray-500 line-through">$35.88</div>
                </div>
              </div>
              <div className="flex items-center mt-1">
                <span className="text-sm text-gray-500">Billed annually</span>
                <span className="ml-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded">
                  SAVE 30%
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Our best value plan with a significant discount.
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Unlimited donations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Email notifications</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Planning Center integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Priority support</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </RadioGroup>

      <Alert>
        <AlertDescription>
          You won't be charged until after you enter your payment information in the next step.
        </AlertDescription>
      </Alert>

      <div className="flex justify-between gap-4">
        <Button variant="outline" onClick={onCancel} className="w-full">
          Cancel
        </Button>
        <Button 
          onClick={handleUpgrade} 
          disabled={isInitiatingUpgrade}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          {isInitiatingUpgrade ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Continue to Payment
            </>
          )}
        </Button>
      </div>
    </div>
  );
}