import { storage } from './storage';
import { User, Church, Subscription } from '@shared/schema';

/**
 * Helper function to ensure a church record exists before creating a subscription
 * This addresses the foreign key constraint issue where subscriptions require valid church records
 */
export async function createTrialSubscriptionForOnboarding(
  churchId: string,
  churchName?: string,
): Promise<Subscription> {
  // First, check if the church exists
  let church = await storage.getChurch(churchId);
  
  // If church doesn't exist, create it with minimal information
  if (!church) {
    console.log(`Creating church record for ID ${churchId} before subscription creation`);
    
    // If churchId is a UUID format, it might be a direct church UUID rather than a user ID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidPattern.test(churchId);
    
    if (isUuid) {
      // If it's already a UUID format, we can try to create the church with this ID directly
      console.log(`churchId ${churchId} is in UUID format, using it directly`);
      church = await storage.createChurch({
        id: churchId, // Explicitly use the UUID as church ID
        name: churchName || 'New Church',
        contactEmail: 'admin@example.com', // Required field but will be updated later
        status: 'ACTIVE',
        accountOwnerId: null // We don't know the account owner yet
      });
    } else {
      // Get user information to associate with the church
      const user = await storage.getUser(churchId);
      
      if (!user) {
        throw new Error(`User with ID ${churchId} not found. Cannot create church record.`);
      }
      
      // Create the church record using available information
      church = await storage.createChurch({
        name: churchName || user.churchName || 'New Church',
        contactEmail: user.email || 'admin@example.com', // Required field
        status: 'ACTIVE',
        accountOwnerId: churchId // The user is the account owner
      });
    }
    
    console.log(`Successfully created church record:`, church);
  }
  
  // Check if there's already a subscription (using church.id)
  const existingSubscription = await storage.getSubscription(church.id);
  if (existingSubscription) {
    console.log(`Found existing subscription for church ${church.id}:`, existingSubscription);
    return existingSubscription; // Return existing if already created
  }
  
  // Calculate trial end date (30 days from now)
  const now = new Date();
  const trialEndDate = new Date(now);
  trialEndDate.setDate(trialEndDate.getDate() + 30);
  
  // Create the subscription using church.id (UUID) instead of churchId (user ID)
  const subscription = await storage.createSubscription({
    churchId: church.id, // Use the UUID from the church record
    plan: 'TRIAL',
    status: 'TRIAL',
    trialStartDate: now,
    trialEndDate
  });
  
  console.log(`Successfully created trial subscription:`, subscription);
  return subscription;
}