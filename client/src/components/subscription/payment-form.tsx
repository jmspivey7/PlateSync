import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2, CreditCard, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  plan: string;
}

export function PaymentForm({ onSuccess, onCancel, plan }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  useEffect(() => {
    if (elements) {
      setIsStripeReady(true);
    }
  }, [elements]);

  // Check for a successful payment return from redirect
  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Extract the payment intent client secret from the URL
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    // If there's no client secret, we're not returning from a redirect
    if (!clientSecret) {
      return;
    }

    // Retrieve payment intent to check status
    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) {
        return;
      }

      switch (paymentIntent.status) {
        case "succeeded":
          // Payment succeeded, call the confirm endpoint
          confirmPayment(paymentIntent.id);
          break;
        case "processing":
          setMessage("Your payment is processing.");
          break;
        case "requires_payment_method":
          setMessage("Your payment was not successful, please try again.");
          break;
        default:
          setMessage("Something went wrong.");
          break;
      }
    });
  }, [stripe]);

  const confirmPayment = async (paymentIntentId: string) => {
    try {
      // Call our manual confirmation endpoint
      const response = await apiRequest(
        "/api/subscription/confirm-payment", 
        "POST", 
        { paymentIntentId, plan }
      );
      
      if (response.ok) {
        setPaymentSucceeded(true);
        toast({
          title: "Subscription Activated",
          description: `Your ${plan.toLowerCase()} subscription has been successfully activated!`,
          variant: "default",
        });
        setTimeout(() => onSuccess(), 2000); // Give user a moment to see success message
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || "Failed to confirm payment on the server.");
      }
    } catch (error: any) {
      setMessage(error.message || "An unexpected error occurred confirming payment.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription?success=true`,
        },
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "An unexpected error occurred.");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // If payment immediately succeeds without redirect
        await confirmPayment(paymentIntent.id);
      }
    } catch (error: any) {
      setMessage(error.message || "An unexpected error occurred.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Success state
  if (paymentSucceeded) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-green-100 p-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your {plan.toLowerCase()} subscription has been activated successfully.
          </p>
          <Button 
            onClick={onSuccess} 
            className="bg-green-600 hover:bg-green-700 w-full md:w-auto"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Payment form state
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Payment Details</h2>
        <p className="text-gray-600">
          Please enter your payment information to subscribe to the {plan.toLowerCase()} plan
        </p>
      </div>

      {message && (
        <Alert variant={message.includes("processing") ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {!isStripeReady ? (
          <div className="h-52 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <PaymentElement />
        )}

        <div className="flex justify-between gap-4 pt-4">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Back
          </Button>
          <Button
            type="submit"
            disabled={!stripe || !elements || isProcessing}
            className="bg-green-600 hover:bg-green-700"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Now
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}