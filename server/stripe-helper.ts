import Stripe from 'stripe';
import { db } from './db';
import { subscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe with the API key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY environment variable');
} else {
  const keyType = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_') ? 'TEST' : 
                  process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
  console.log(`Initializing Stripe with ${keyType} mode API key: ${process.env.STRIPE_SECRET_KEY.substring(0, 8)}...`);
}

// Initialize Stripe with configuration options
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any, // Set specific API version
  maxNetworkRetries: 2,             // Retry API calls on network failure
  timeout: 30000,                   // Timeout in ms (30 sec)
});

// Stripe subscription type with the fields we need
interface StripeSubscription {
  id: string;
  status: string;
  current_period_end: number;
  canceled_at: number | null;
  items: {
    data: Array<{
      price: {
        id: string;
      };
    }>;
  };
}

interface SubscriptionStatusResult {
  isActive: boolean;
  status: string;
  plan: string;
  currentPeriodEnd?: Date;
  canceledAt?: Date | null;
}

/**
 * Verify a subscription with Stripe and update our database
 */
export async function verifyStripeSubscription(stripeSubscriptionId: string): Promise<SubscriptionStatusResult | null> {
  try {
    console.log(`Verifying Stripe subscription: ${stripeSubscriptionId}`);
    
    // Fetch the subscription from Stripe
    let stripeResponse;
    try {
      stripeResponse = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    } catch (stripeError: any) {
      // Log the full error details for debugging
      console.log('Stripe API error details:', {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        apiKey: process.env.STRIPE_SECRET_KEY?.substring(0, 8) + '...',
        requestParams: { subscriptionId: stripeSubscriptionId }
      });
      
      // If the subscription doesn't exist in Stripe
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.code === 'resource_missing') {
        console.log(`Subscription not found in Stripe: ${stripeSubscriptionId}`);
        return {
          isActive: false,
          status: 'INVALID',
          plan: 'NONE',
          currentPeriodEnd: undefined,
          canceledAt: new Date()
        };
      }
      
      // Check for authentication errors
      if (stripeError.type === 'StripeAuthenticationError') {
        console.error('Stripe authentication error - check API key');
        return {
          isActive: false,
          status: 'API_ERROR',
          plan: 'NONE',
          currentPeriodEnd: undefined,
          canceledAt: null
        };
      }
      
      // For other Stripe errors, return an error result instead of throwing
      console.error('Stripe API error:', stripeError.message);
      return {
        isActive: false,
        status: 'API_ERROR',
        plan: 'NONE',
        currentPeriodEnd: undefined,
        canceledAt: null
      };
    }
    
    // Cast to our known type
    const subscription = stripeResponse as unknown as StripeSubscription;
    
    console.log(`Found subscription: ${subscription.id}, status: ${subscription.status}`);
    
    // Map Stripe subscription status to our status
    let status = 'INACTIVE';
    let isActive = false;
    
    // Check if the subscription is active
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      status = 'ACTIVE';
      isActive = true;
    } else if (subscription.status === 'past_due') {
      status = 'PAST_DUE';
      isActive = true; // Still consider active but past due
    } else if (subscription.status === 'canceled') {
      status = 'CANCELED';
      isActive = false;
    } else if (subscription.status === 'unpaid') {
      status = 'UNPAID';
      isActive = false;
    }
    
    // Determine the plan (MONTHLY or ANNUAL)
    // This assumes you're using Stripe price IDs to determine the plan
    let plan = 'MONTHLY'; // Default to monthly
    
    // If you have specific price IDs for annual plans, check them here
    const annualPriceId = process.env.STRIPE_ANNUAL_PRICE_ID;
    if (annualPriceId && subscription.items.data.some(item => item.price.id === annualPriceId)) {
      plan = 'ANNUAL';
    }
    
    // Get end of current period and canceled date (if any)
    const currentPeriodEnd = subscription.current_period_end 
      ? new Date(subscription.current_period_end * 1000) 
      : undefined;
      
    const canceledAt = subscription.canceled_at 
      ? new Date(subscription.canceled_at * 1000) 
      : null;
    
    return {
      isActive,
      status,
      plan,
      currentPeriodEnd,
      canceledAt,
    };
  } catch (error) {
    console.error('Error verifying Stripe subscription:', error);
    return null;
  }
}

/**
 * Update a church's subscription based on Stripe data
 */
export async function updateSubscriptionFromStripe(churchId: string, stripeSubscriptionId: string): Promise<boolean> {
  try {
    const status = await verifyStripeSubscription(stripeSubscriptionId);
    
    if (!status) {
      console.log(`No valid status returned for subscription: ${stripeSubscriptionId}`);
      return false;
    }
    
    // Update the subscription in our database
    await db
      .update(subscriptions)
      .set({
        status: status.status,
        plan: status.plan,
        startDate: new Date(),
        endDate: status.currentPeriodEnd,
        canceledAt: status.canceledAt,
        stripeSubscriptionId,
      })
      .where(eq(subscriptions.churchId, churchId));
    
    console.log(`Updated subscription for church ${churchId} with Stripe data`);
    return true;
  } catch (error) {
    console.error('Error updating subscription from Stripe:', error);
    return false;
  }
}

/**
 * Cancel a subscription in Stripe and update the database
 */
export async function cancelStripeSubscription(stripeSubscriptionId: string, churchId: string): Promise<boolean> {
  try {
    console.log(`Canceling Stripe subscription: ${stripeSubscriptionId}`);
    
    // Cancel the subscription in Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubscriptionId);
    
    if (!canceledSubscription) {
      console.error('Failed to cancel subscription in Stripe');
      return false;
    }
    
    // Get the canceled date from Stripe
    const canceledAt = canceledSubscription.canceled_at 
      ? new Date(canceledSubscription.canceled_at * 1000) 
      : new Date();
    
    // Update our database with cancellation info
    await db
      .update(subscriptions)
      .set({
        status: 'CANCELED',
        canceledAt,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.churchId, churchId));
    
    console.log(`Successfully canceled subscription for church ${churchId}`);
    return true;
  } catch (error) {
    console.error('Error canceling Stripe subscription:', error);
    return false;
  }
}

/**
 * Get customer ID for a user, or create one if needed
 */
export async function getOrCreateStripeCustomer(email: string, name?: string): Promise<string | null> {
  try {
    // Search for existing customer
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    });
    
    // If customer exists, return the ID
    if (customers.data.length > 0) {
      return customers.data[0].id;
    }
    
    // If no customer, create one
    const customer = await stripe.customers.create({
      email,
      name,
    });
    
    return customer.id;
  } catch (error) {
    console.error('Error getting or creating Stripe customer:', error);
    return null;
  }
}