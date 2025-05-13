import { DatabaseStorage } from './storage';
import { User, Church, Subscription } from '@shared/schema';

/**
 * Helper function to ensure a church record exists before creating a subscription
 * This addresses the foreign key constraint issue where subscriptions require valid church records
 */
export async function createTrialSubscriptionForOnboarding(
  storage: DatabaseStorage,
  churchId: string,
  churchName?: string,
): Promise<Subscription> {
  // First, check if the church exists
  let church = await storage.getChurch(churchId);
  
  // If church doesn't exist, create it with minimal information
  if (!church) {
    console.log(`Creating church record for ID ${churchId} before subscription creation`);
    
    // Get user information to associate with the church
    const user = await storage.getUser(churchId);
    
    if (!user) {
      throw new Error(`User with ID ${churchId} not found. Cannot create church record.`);
    }
    
    // Create the church record using available information
    // Note: We're not setting the id directly because createChurch will handle it
    church = await storage.createChurch({
      name: churchName || user.churchName || 'New Church',
      contactEmail: user.email || 'admin@example.com', // Required field
      status: 'ACTIVE',
      accountOwnerId: churchId // The user is the account owner
    });
    console.log(`Successfully created church record:`, church);
  }
  
  // Check if there's already a subscription
  const existingSubscription = await storage.getSubscription(churchId);
  if (existingSubscription) {
    return existingSubscription; // Return existing if already created
  }
  
  // Calculate trial end date (30 days from now)
  const now = new Date();
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + 30);
  
  // Create the subscription
  const subscription = await storage.createSubscription({
    churchId,
    plan: 'TRIAL',
    status: 'TRIAL',
    trialStartDate: now,
    trialEndDate
  });
  
  console.log(`Successfully created trial subscription:`, subscription);
  return subscription;
}