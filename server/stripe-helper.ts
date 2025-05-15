import Stripe from 'stripe';
import { db } from './db';
import { subscriptions } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize Stripe with the API key
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

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
      // For other Stripe errors, rethrow
      throw stripeError;
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