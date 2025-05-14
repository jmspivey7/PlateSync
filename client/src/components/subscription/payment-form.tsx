import { useState, useEffect } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubscription } from "@/hooks/use-subscription";

// Make sure to call loadStripe outside of a component's render to avoid
// recreating the Stripe object on every render.
import type { Stripe as StripeType } from '@stripe/stripe-js';

let stripePromise: Promise<StripeType | null> | null = null;
try {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  if (!stripeKey) {
    console.error("Missing Stripe public key");
  } else {
    stripePromise = loadStripe(stripeKey);
  }
} catch (error) {
  console.error("Error initializing Stripe:", error);
}

interface PaymentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  plan: string;
}

function PaymentFormContent({ onSuccess, onCancel, plan }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState(false);

  // Wait for Stripe and Elements to be ready
  useEffect(() => {
    if (stripe && elements) {
      setIsStripeReady(true);
    }
  }, [stripe, elements]);

  // Check if the payment has succeeded immediately upon loading
  useEffect(() => {
    if (!stripe) return;

    // Check the URL for payment status
    const clientSecret = new URLSearchParams(window.location.search).get(
      "payment_intent_client_secret"
    );

    if (!clientSecret) return;

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      switch (paymentIntent?.status) {
        case "succeeded":
          setPaymentSucceeded(true);
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

  // Helper function to handle payment confirmation and backend notification
  const confirmPaymentAsync = async (): Promise<boolean> => {
    if (!stripe || !elements) {
      console.error("Stripe or Elements not initialized");
      return false;
    }
    
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/subscription?success=true",
        },
        redirect: "if_required",
      });

      if (error) {
        setMessage(error.message || "An unexpected error occurred.");
        return false;
      } 
      
      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Notify backend about successful payment
        try {
          await apiRequest("/api/subscription/confirm-payment", {
            method: "POST", 
            body: { 
              plan,
              paymentIntentId: paymentIntent.id || 'unknown'
            }
          });
        } catch (err) {
          console.error("Failed to confirm payment with server:", err);
          // Continue with success UI even if server confirmation fails
          // The webhook should handle this case
        }
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Error confirming payment:", err);
      setMessage("An unexpected error occurred while processing payment.");
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      const success = await confirmPaymentAsync();
      
      if (success) {
        setPaymentSucceeded(true);
        onSuccess(); // Inform parent component of success
      }
    } catch (err) {
      setMessage("An unexpected error occurred.");
      console.error(err);
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

export function PaymentForm({ onSuccess, onCancel, plan }: PaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { upgradePlanAsync, isUpgrading } = useSubscription();

  // Check if Stripe is properly configured
  if (!stripePromise) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Not Available</h3>
        <p className="text-muted-foreground mb-4">
          Stripe integration is not properly configured. Please check your Stripe API keys.
        </p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  useEffect(() => {
    // Initiate the payment intent
    const initPayment = async () => {
      try {
        setPaymentError(null); // Clear any previous errors
        
        // Use direct fetch instead of the mutation to avoid CORS issues
        console.log("Initiating payment for plan:", plan);
        const response = await fetch("/api/subscription/init-upgrade", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan }),
          credentials: "include"
        });
        
        // Log the response status to help with debugging
        console.log("Payment upgrade response status:", response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Server error response:", errorText);
          
          // Set a user-friendly error message
          setPaymentError(
            "We couldn't process your payment request. Please try again or contact support."
          );
          throw new Error(errorText || "Failed to initialize payment");
        }
        
        const data = await response.json();
        console.log("Payment intent created:", data);
        
        if (data.clientSecret) {
          // Log the client secret (redacted for security)
          console.log("Payment client secret:", data.clientSecret);
          setClientSecret(data.clientSecret);
        } else {
          setPaymentError("The payment system returned an invalid response. Please try again.");
          throw new Error("No client secret received");
        }
      } catch (error) {
        console.error("Failed to initiate payment:", error);
        // Only set error if we haven't already set a specific error
        if (!error.message.includes("Failed to initialize payment") && 
            !error.message.includes("No client secret received")) {
          setPaymentError(
            "An unexpected error occurred. Please try again later or contact support."
          );
        }
      }
    };

    initPayment();
  }, [plan]);

  // Show an error state if we run into issues
  if (paymentError) {
    return (
      <div className="h-80 flex flex-col items-center justify-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Payment Error</h3>
        <p className="text-gray-600 text-center mb-4 max-w-md">{paymentError}</p>
        <Button variant="outline" onClick={onCancel}>
          Go Back
        </Button>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="h-80 flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-gray-600">Initializing payment...</p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <PaymentFormContent 
        plan={plan} 
        onSuccess={onSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
}