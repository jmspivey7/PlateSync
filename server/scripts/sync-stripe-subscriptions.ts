import Stripe from 'stripe';
import { db } from '../db';
import { subscriptions, users } from '@shared/schema';
import { eq } from 'drizzle-orm';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

interface SubscriptionSyncResult {
  synced: number;
  errors: string[];
  details: Array<{
    churchId: string;
    email: string;
    action: string;
    stripeSubscriptionId?: string;
    plan?: string;
    status?: string;
  }>;
}

export async function syncStripeSubscriptions(): Promise<SubscriptionSyncResult> {
  const result: SubscriptionSyncResult = {
    synced: 0,
    errors: [],
    details: []
  };

  try {
    console.log('Starting Stripe subscription sync...');

    // Get all users with their email addresses (account owners who could have subscriptions)
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        churchId: users.churchId,
        role: users.role
      })
      .from(users)
      .where(eq(users.role, 'ACCOUNT_OWNER'));

    console.log(`Found ${allUsers.length} account owners to check`);

    // Get all active Stripe subscriptions
    const stripeSubscriptions = await stripe.subscriptions.list({
      status: 'all',
      limit: 100,
    });

    console.log(`Found ${stripeSubscriptions.data.length} Stripe subscriptions`);

    // Create a map of email to Stripe subscriptions
    const emailToStripeSubscription = new Map();
    
    for (const subscription of stripeSubscriptions.data) {
      try {
        const customer = await stripe.customers.retrieve(subscription.customer as string);
        if ('email' in customer && customer.email) {
          emailToStripeSubscription.set(customer.email, subscription);
        }
      } catch (error) {
        console.error(`Error retrieving customer for subscription ${subscription.id}:`, error);
      }
    }

    // Process each account owner
    for (const user of allUsers) {
      try {
        const stripeSubscription = emailToStripeSubscription.get(user.email);
        
        // Get existing database subscription
        const [existingSubscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.churchId, user.churchId || user.id));

        if (stripeSubscription) {
          // User has an active Stripe subscription
          const plan = getSubscriptionPlan(stripeSubscription);
          const status = getSubscriptionStatus(stripeSubscription);
          
          if (existingSubscription) {
            // Update existing subscription with Stripe data
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
              .where(eq(subscriptions.churchId, user.churchId || user.id));

            result.details.push({
              churchId: user.churchId || user.id,
              email: user.email,
              action: 'updated',
              stripeSubscriptionId: stripeSubscription.id,
              plan,
              status
            });
          } else {
            // Create new subscription record
            await db
              .insert(subscriptions)
              .values({
                churchId: user.churchId || user.id,
                plan,
                status,
                stripeSubscriptionId: stripeSubscription.id,
                stripeCustomerId: stripeSubscription.customer as string,
                trialStartDate: new Date(),
                trialEndDate: new Date(),
                startDate: new Date(stripeSubscription.current_period_start * 1000),
                endDate: new Date(stripeSubscription.current_period_end * 1000),
                canceledAt: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000) : null,
              });

            result.details.push({
              churchId: user.churchId || user.id,
              email: user.email,
              action: 'created',
              stripeSubscriptionId: stripeSubscription.id,
              plan,
              status
            });
          }
          
          result.synced++;
        } else {
          // User doesn't have a Stripe subscription
          if (existingSubscription && existingSubscription.stripeSubscriptionId) {
            // They had a Stripe subscription but it's gone - mark as canceled
            await db
              .update(subscriptions)
              .set({
                status: 'CANCELED',
                canceledAt: new Date(),
                updatedAt: new Date()
              })
              .where(eq(subscriptions.churchId, user.churchId || user.id));

            result.details.push({
              churchId: user.churchId || user.id,
              email: user.email,
              action: 'canceled',
              status: 'CANCELED'
            });
            
            result.synced++;
          } else if (existingSubscription && existingSubscription.plan === 'TRIAL') {
            // Keep trial status as-is
            result.details.push({
              churchId: user.churchId || user.id,
              email: user.email,
              action: 'kept_trial',
              plan: 'TRIAL',
              status: 'TRIAL'
            });
          }
        }
      } catch (error) {
        const errorMsg = `Error processing user ${user.email}: ${error}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Sync completed. ${result.synced} subscriptions synced, ${result.errors.length} errors`);
    return result;

  } catch (error) {
    console.error('Fatal error during sync:', error);
    result.errors.push(`Fatal error: ${error}`);
    return result;
  }
}

function getSubscriptionPlan(stripeSubscription: Stripe.Subscription): string {
  const priceId = stripeSubscription.items.data[0]?.price.id;
  
  // Map Stripe price IDs to plan names
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
    return 'MONTHLY';
  } else if (priceId === process.env.STRIPE_ANNUAL_PRICE_ID) {
    return 'ANNUAL';
  }
  
  // Fallback based on interval
  const interval = stripeSubscription.items.data[0]?.price.recurring?.interval;
  if (interval === 'month') {
    return 'MONTHLY';
  } else if (interval === 'year') {
    return 'ANNUAL';
  }
  
  return 'MONTHLY'; // Default fallback
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

// Run the sync immediately when script is executed
syncStripeSubscriptions()
  .then((result) => {
    console.log('Sync result:', JSON.stringify(result, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Sync failed:', error);
    process.exit(1);
  });