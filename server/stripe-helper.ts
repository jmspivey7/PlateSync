import Stripe from 'stripe';
import { db } from './db';
import { subscriptions, users } from '@shared/schema';
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
/**
 * Update subscription in database based on Stripe subscription data
 */
export async function updateSubscriptionFromStripe(stripeSubscription: Stripe.Subscription, churchId: string): Promise<void> {
  try {
    const plan = getSubscriptionPlan(stripeSubscription);
    const status = getSubscriptionStatus(stripeSubscription);
    
    await db
      .update(subscriptions)
      .set({
        plan,
        status,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer as string,
        startDate: new Date(stripeSubscription.current_period_start * 1000),
        endDate: new Date(stripeSubscription.current_period_end * 1000),
        canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.churchId, churchId));
      
    console.log(`Updated subscription for church ${churchId} with Stripe data`);
  } catch (error) {
    console.error(`Error updating subscription for church ${churchId}:`, error);
    throw error;
  }
}

/**
 * Handle Stripe webhook events to keep database in sync
 */
export async function handleStripeWebhook(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find the church associated with this customer
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          // Find user by email to get church ID
          const [user] = await db
            .select({ churchId: users.churchId, id: users.id })
            .from(users)
            .where(eq(users.email, customer.email))
            .limit(1);
            
          if (user) {
            const churchId = user.churchId || user.id;
            
            if (event.type === 'customer.subscription.deleted') {
              // Mark subscription as canceled
              await db
                .update(subscriptions)
                .set({
                  status: 'CANCELED',
                  canceledAt: new Date(),
                  updatedAt: new Date()
                })
                .where(eq(subscriptions.churchId, churchId));
            } else {
              // Update or create subscription
              await updateSubscriptionFromStripe(subscription, churchId);
            }
            
            console.log(`Processed webhook ${event.type} for church ${churchId}`);
          }
        }
        break;
      }
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error handling Stripe webhook:', error);
    throw error;
  }
}

function getSubscriptionPlan(stripeSubscription: Stripe.Subscription): string {
  const priceId = stripeSubscription.items.data[0]?.price.id;
  
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
    return 'MONTHLY';
  } else if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) {
    return 'ANNUAL';
  }
  
  const interval = stripeSubscription.items.data[0]?.price.recurring?.interval;
  if (interval === 'month') {
    return 'MONTHLY';
  } else if (interval === 'year') {
    return 'ANNUAL';
  }
  
  return 'MONTHLY';
}

function getSubscriptionStatus(stripeSubscription: Stripe.Subscription): string {
  switch (stripeSubscription.status) {
    case 'active':
      return 'ACTIVE';
    case 'canceled':
      return 'CANCELED';
    case 'past_due':
    case 'unpaid':
      return 'EXPIRED';
    case 'trialing':
      return 'TRIAL';
    default:
      return 'ACTIVE';
  }
}

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