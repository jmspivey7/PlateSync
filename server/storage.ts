import * as crypto from 'crypto';
import { eq, desc, and, or, asc, isNull, not, inArray, gte, sql, sum, count, ne } from 'drizzle-orm';
import {
  users,
  members,
  donations,
  batches,
  serviceOptions,
  reportRecipients,
  emailTemplates,
  planningCenterTokens,
  csvImportStats,
  churches,
  subscriptions,
  systemConfig,
  type User,
  type UpsertUser,
  type Member,
  type InsertMember,
  type Batch,
  type InsertBatch,
  type Donation,
  type InsertDonation,
  type MemberWithDonations,
  type DonationWithMember,
  type BatchWithDonations,
  type ServiceOption,
  type InsertServiceOption,
  type ReportRecipient,
  type InsertReportRecipient,
  type EmailTemplate,
  type InsertEmailTemplate,
  type PlanningCenterTokens,
  type InsertPlanningCenterTokens,
  type CsvImportStats,
  type InsertCsvImportStats,
  type Church,
  type InsertChurch,
  type Subscription,
  type InsertSubscription,
  type SystemConfig,
  type InsertSystemConfig
} from "@shared/schema";
import { db } from "./db";
import { format } from "date-fns";

// Interface for storage operations
// Utility function to sync church information between all members
export async function syncChurchInfoToMembers(db: any, churchId: string) {
  try {
    console.log(`Syncing church information for all members of church ${churchId}`);
    
    // Get church owner/admin information (source of truth for church details)
    const [churchAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.id, churchId));
      
    if (!churchAdmin) {
      console.log(`No church admin found with ID ${churchId}`);
      return false;
    }
    
    // Check if we have church information to sync
    if (!churchAdmin.churchName && !churchAdmin.churchLogoUrl) {
      console.log(`No church details to sync for church ${churchId}`);
      return false;
    }
    
    console.log(`Found church details to sync: Name=${churchAdmin.churchName}, Logo=${churchAdmin.churchLogoUrl || 'None'}`);
    
    // Update all church members with this information
    const updates: any = {
      updatedAt: new Date()
    };
    
    if (churchAdmin.churchName) {
      updates.churchName = churchAdmin.churchName;
    }
    
    if (churchAdmin.churchLogoUrl) {
      updates.churchLogoUrl = churchAdmin.churchLogoUrl;
    }
    
    // Update all users with this churchId
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.churchId, churchId));
      
    console.log(`Updated ${result.count || 'unknown number of'} users with synced church information`);
    return true;
  } catch (error) {
    console.error(`Error syncing church information: ${error}`);
    return false;
  }
}

// Function to apply church details to a specific user
export async function applyChurchDetailsToUser(db: any, userId: string, churchId: string) {
  try {
    console.log(`User ${userId} missing church details, checking church ID: ${churchId}`);
    
    // Get church owner/admin information (source of truth)
    const [churchAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.id, churchId));
      
    if (!churchAdmin) {
      console.log(`No church admin found with ID ${churchId}`);
      return false;
    }
    
    // Extract church details
    const updates: any = {
      updatedAt: new Date()
    };
    
    if (churchAdmin.churchName) {
      updates.churchName = churchAdmin.churchName;
    }
    
    if (churchAdmin.churchLogoUrl) {
      updates.churchLogoUrl = churchAdmin.churchLogoUrl;
      console.log(`Found church logo: ${churchAdmin.churchLogoUrl} for church ${churchId}`);
    }
    
    // Update the specific user
    await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId));
      
    console.log(`Updated user ${userId} with church logo information`);
    return true;
  } catch (error) {
    console.error(`Error applying church details to user ${userId}: ${error}`);
    return false;
  }
}

export interface IStorage {
  // System Configuration operations
  getSystemConfig(key: string): Promise<string | null>;
  setSystemConfig(key: string, value: string): Promise<void>;
  updateSystemConfig(configData: { key: string; value: string }[]): Promise<void>;
  
  // User operations (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>; // Alias for getUser for clarity
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsers(churchId: string): Promise<User[]>;
  getUserRole(userId: string): Promise<string | null>;
  getChurchIdForUser(userId: string): Promise<string>;
  getAdminIdForChurch(churchId: string): Promise<string | null>;
  getChurchByAdminId(adminId: string): Promise<{ id: string; name: string } | null>;
  getUsersByChurchId(churchId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(id: string, data: Partial<User>): Promise<User>;
  updateUserEmailNotificationSetting(userId: string, enabled: boolean): Promise<boolean>;
  updateUserRole(id: string, role: string): Promise<User>;
  createUser(userData: Partial<UpsertUser> & { churchId?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Account Owner functions
  getAccountOwnerForChurch(churchId: string): Promise<User | undefined>;
  getMasterAdminForChurch(churchId: string): Promise<User | undefined>; // Backward compatibility
  setUserAsAccountOwner(userId: string, churchId: string): Promise<User | undefined>;
  setUserAsMasterAdmin(userId: string, churchId: string): Promise<User | undefined>; // Backward compatibility
  transferAccountOwnership(fromUserId: string, toUserId: string, churchId: string): Promise<boolean>;
  transferMasterAdmin(fromUserId: string, toUserId: string, churchId: string): Promise<boolean>; // Backward compatibility
  
  // Global Admin operations
  getAllChurches(): Promise<Church[]>;
  getChurch(id: string): Promise<Church | undefined>;
  getChurchesByAccountOwner(accountOwnerId: string): Promise<Church[]>;
  getChurchWithStats(id: string): Promise<Church & { 
    totalMembers: number; 
    totalDonations: string;
    userCount: number;
    lastActivity: Date | null;
  } | undefined>;
  createChurch(churchData: InsertChurch, customId?: string): Promise<Church>;
  updateChurch(id: string, data: Partial<Church>): Promise<Church | undefined>;
  suspendChurch(id: string): Promise<Church | undefined>;
  activateChurch(id: string): Promise<Church | undefined>;
  deleteChurch(id: string): Promise<{ archiveUrl: string | null }>;
  migrateDataToNewChurchTable(): Promise<number>; // To help migrate existing data
  
  // Member operations
  getMembers(churchId: string): Promise<Member[]>;
  getMember(id: number, churchId: string): Promise<Member | undefined>;
  getMemberWithDonations(id: number, churchId: string): Promise<MemberWithDonations | undefined>;
  createMember(member: InsertMember): Promise<Member>;
  updateMember(id: number, data: Partial<InsertMember>, churchId: string): Promise<Member | undefined>;
  
  // Batch operations
  getBatches(churchId: string): Promise<Batch[]>;
  getBatch(id: number, churchId: string): Promise<Batch | undefined>;
  getBatchWithDonations(id: number, churchId: string): Promise<BatchWithDonations | undefined>;
  createBatch(batch: InsertBatch): Promise<Batch>;
  updateBatch(id: number, data: Partial<InsertBatch>, churchId: string): Promise<Batch | undefined>;
  addPrimaryAttestation(id: number, attestorId: string, attestorName: string, churchId: string): Promise<Batch | undefined>;
  addSecondaryAttestation(id: number, attestorId: string, attestorName: string, churchId: string): Promise<Batch | undefined>;
  confirmAttestation(id: number, confirmerId: string, churchId: string): Promise<Batch | undefined>;
  deleteBatch(id: number, churchId: string): Promise<void>;
  getCurrentBatch(churchId: string): Promise<Batch | undefined>;
  getLatestFinalizedBatch(churchId: string): Promise<Batch | undefined>;
  
  // Donation operations
  getDonations(churchId: string): Promise<Donation[]>;
  getDonationsWithMembers(churchId: string): Promise<DonationWithMember[]>;
  getDonationsByBatch(batchId: number, churchId: string): Promise<DonationWithMember[]>;
  getDonation(id: number, churchId: string): Promise<Donation | undefined>;
  getDonationWithMember(id: number, churchId: string): Promise<DonationWithMember | undefined>;
  createDonation(donation: InsertDonation): Promise<Donation>;
  updateDonation(id: number, data: Partial<InsertDonation>, churchId: string): Promise<Donation | undefined>;
  deleteDonation(id: number, churchId: string): Promise<Donation | undefined>;
  updateDonationNotificationStatus(id: number, status: string): Promise<void>;
  
  // Service options operations
  getServiceOptions(churchId: string): Promise<ServiceOption[]>;
  getServiceOption(id: number, churchId: string): Promise<ServiceOption | undefined>;
  createServiceOption(option: InsertServiceOption): Promise<ServiceOption>;
  updateServiceOption(id: number, data: Partial<InsertServiceOption>, churchId: string): Promise<ServiceOption | undefined>;
  deleteServiceOption(id: number, churchId: string): Promise<void>;
  
  // Report Recipients operations
  getReportRecipients(churchId: string): Promise<ReportRecipient[]>;
  getReportRecipient(id: number, churchId: string): Promise<ReportRecipient | undefined>;
  createReportRecipient(recipient: InsertReportRecipient): Promise<ReportRecipient>;
  updateReportRecipient(id: number, data: Partial<InsertReportRecipient>, churchId: string): Promise<ReportRecipient | undefined>;
  deleteReportRecipient(id: number, churchId: string): Promise<void>;
  
  // Dashboard statistics
  getTodaysDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getWeeklyDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getMonthlyDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getActiveDonorCount(churchId: string): Promise<{ count: number, newCount: number }>;
  
  // Email Templates operations
  getEmailTemplates(churchId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number, churchId: string): Promise<EmailTemplate | undefined>;
  getEmailTemplateById(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplateByType(templateType: string, churchId: string): Promise<EmailTemplate | undefined>;
  getAllEmailTemplatesByType(templateType: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>, churchId: string): Promise<EmailTemplate | undefined>;
  resetEmailTemplateToDefault(id: number, churchId: string): Promise<EmailTemplate | undefined>;
  
  // Planning Center operations
  getPlanningCenterTokens(userId: string, churchId: string): Promise<PlanningCenterTokens | undefined>;
  getPlanningCenterTokensByChurchId(churchId: string): Promise<PlanningCenterTokens | undefined>;
  savePlanningCenterTokens(data: InsertPlanningCenterTokens): Promise<PlanningCenterTokens>;
  deletePlanningCenterTokens(userId: string, churchId: string): Promise<void>;
  updatePlanningCenterLastSync(userId: string, churchId: string): Promise<void>;
  bulkImportMembers(members: Array<Partial<InsertMember>>, churchId: string): Promise<number>;
  removeDuplicateMembers(churchId: string): Promise<number>;
  
  // Subscription operations
  getSubscription(churchId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(churchId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  updateSubscriptionStatus(churchId: string, data: Partial<Subscription>): Promise<Subscription | undefined>;
  checkSubscriptionStatus(churchId: string): Promise<{
    isActive: boolean;
    isTrialExpired: boolean;
    status: string;
    daysRemaining: number | null;
    trialEndDate: Date | null;
  }>;
  upgradeSubscription(churchId: string, plan: string, stripeData?: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<Subscription | undefined>;
  cancelSubscription(churchId: string): Promise<Subscription | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: string): Promise<User | undefined> {
    // This is an alias for getUser for clarity
    return this.getUser(id);
  }
  
  async getUser(id: string): Promise<User | undefined> {
    try {
      // Use a raw SQL query with basic columns to avoid schema issues
      const userResult = await db.execute(
        sql`SELECT 
            id, username, email, first_name, last_name, bio, profile_image_url, 
            role, password, is_verified, password_reset_token, 
            password_reset_expires, created_at, updated_at, 
            church_name, church_logo_url, email_notifications_enabled, church_id
          FROM users 
          WHERE id = ${id}
          LIMIT 1`
      );
      
      if (!userResult.rows.length) {
        return undefined;
      }
      
      // Convert from snake_case to camelCase
      const row = userResult.rows[0];
      const userBaseData = {
        id: row.id,
        username: row.username,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        bio: row.bio,
        profileImageUrl: row.profile_image_url,
        role: row.role,
        password: row.password,
        isVerified: row.is_verified,
        passwordResetToken: row.password_reset_token,
        passwordResetExpires: row.password_reset_expires,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        churchName: row.church_name,
        churchLogoUrl: row.church_logo_url,
        emailNotificationsEnabled: row.email_notifications_enabled,
        churchId: row.church_id
      };
      
      // Virtual properties
      const isActive = !row.email?.startsWith('INACTIVE_');
      let isAccountOwner = false;
      
      // Calculate virtual isAccountOwner status
      if (row.role === 'ACCOUNT_OWNER' || row.role === 'ADMIN') {
        try {
          // Check if this is the first/original admin of the church
          // If their ID is used as the churchId for other users, they're the Account Owner
          const otherUsers = await db.execute(
            sql`SELECT count(*) as count 
                FROM users 
                WHERE church_id = ${id} AND id != ${id}`
          );
            
          if (otherUsers.rows.length > 0 && parseInt(otherUsers.rows[0].count) > 0) {
            isAccountOwner = true;
          } else {
            // If no other users point to this user's ID, check if this is the first admin
            const firstAdmin = await db.execute(
              sql`SELECT id 
                  FROM users 
                  WHERE role IN ('ACCOUNT_OWNER', 'ADMIN')
                  ORDER BY created_at ASC 
                  LIMIT 1`
            );
              
            if (firstAdmin.rows.length > 0 && firstAdmin.rows[0].id === id) {
              isAccountOwner = true;
            }
          }
        } catch (innerError) {
          console.error("Error determining Account Owner status:", innerError);
          // Default to false for safety
          isAccountOwner = false;
        }
      }
      
      // Create the full user object with virtual properties
      const user: User = {
        ...userBaseData,
        isActive,
        isAccountOwner
      };
      
      return user;
    } catch (error) {
      console.error("Error in getUser:", error);
      return undefined;
    }
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Looking up user by email: ${email}`);
      
      // Use a raw SQL query with basic columns to avoid schema issues
      const userResult = await db.execute(
        sql`SELECT 
            id, username, email, first_name, last_name, bio, profile_image_url, 
            role, password, is_verified, password_reset_token, 
            password_reset_expires, created_at, updated_at, 
            church_name, church_logo_url, email_notifications_enabled, church_id
          FROM users 
          WHERE email = ${email}
          LIMIT 1`
      );
      
      if (!userResult.rows.length) {
        console.log(`No user found with email: ${email}`);
        return undefined;
      }
      
      console.log(`Found user with email: ${email}`);
      
      // Convert from snake_case to camelCase
      const row = userResult.rows[0];
      const userBaseData = {
        id: row.id,
        username: row.username,
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        bio: row.bio,
        profileImageUrl: row.profile_image_url,
        role: row.role,
        password: row.password,
        isVerified: row.is_verified,
        passwordResetToken: row.password_reset_token,
        passwordResetExpires: row.password_reset_expires,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        churchName: row.church_name,
        churchLogoUrl: row.church_logo_url,
        emailNotificationsEnabled: row.email_notifications_enabled,
        churchId: row.church_id
      };
      
      // Virtual properties
      const isActive = !row.email?.startsWith('INACTIVE_');
      let isAccountOwner = false;
      
      // Calculate virtual isAccountOwner status
      if (row.role === 'ACCOUNT_OWNER' || row.role === 'ADMIN') {
        try {
          // Check if this is the first/original admin of the church
          // If their ID is used as the churchId for other users, they're the Account Owner
          const otherUsers = await db.execute(
            sql`SELECT count(*) as count 
                FROM users 
                WHERE church_id = ${row.id} AND id != ${row.id}`
          );
            
          if (otherUsers.rows.length > 0 && parseInt(otherUsers.rows[0].count) > 0) {
            isAccountOwner = true;
          } else {
            // If no other users point to this user's ID, check if this is the first admin
            const firstAdmin = await db.execute(
              sql`SELECT id 
                  FROM users 
                  WHERE role IN ('ACCOUNT_OWNER', 'ADMIN') 
                  ORDER BY created_at ASC 
                  LIMIT 1`
            );
              
            if (firstAdmin.rows.length > 0 && firstAdmin.rows[0].id === row.id) {
              isAccountOwner = true;
            }
          }
        } catch (innerError) {
          console.error("Error determining Account Owner status:", innerError);
          // Default to false for safety
          isAccountOwner = false;
        }
      }
      
      // Create the full user object with virtual properties
      const user: User = {
        ...userBaseData,
        isActive,
        isAccountOwner
      };
      
      return user;
    } catch (error) {
      console.error("Error in getUserByEmail:", error);
      return undefined;
    }
  }
  
  // Get the church ID for a user - for ADMIN users, it's their own ID
  // For STANDARD_USER users, we need to find which church they belong to
  async getChurchIdForUser(userId: string): Promise<string> {
    try {
      // Get user details from the database
      const userQuery = await db
        .select({
          id: users.id,
          role: users.role,
          churchId: users.churchId
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (userQuery.length === 0) {
        throw new Error("User not found");
      }
      
      const user = userQuery[0];
      
      // If user has a churchId explicitly set, use that (should be true for all users now)
      if (user.churchId) {
        console.log(`User ${userId} has churchId ${user.churchId} directly assigned`);
        return user.churchId;
      }
      
      // If user is an ADMIN and doesn't have a churchId, find or create a church ID
      if (user.role === "ADMIN") {
        console.log(`User ${userId} is an ADMIN without a churchId - finding a church for them`);
        
        // Instead of making the user their own church, look for an existing church ID
        // or generate a more appropriate church identifier
        
        // First, check if this admin has created any batches with a different churchId
        const [adminBatch] = await db
          .select({
            churchId: batches.churchId
          })
          .from(batches)
          .where(eq(batches.churchId, userId))
          .limit(1);
          
        if (adminBatch?.churchId) {
          console.log(`Found existing churchId ${adminBatch.churchId} from batches`);
          
          // Update the admin to use this churchId
          await db
            .update(users)
            .set({ churchId: adminBatch.churchId })
            .where(eq(users.id, userId));
            
          return adminBatch.churchId;
        }
        
        // If no existing churchId found, use the admin's own ID (legacy behavior)
        // but flag this in the logs
        console.log(`No existing churchId found - using legacy behavior with admin's ID ${userId}`);
        
        await db
          .update(users)
          .set({ churchId: userId })
          .where(eq(users.id, userId));
        
        return userId;
      }
      
      // For STANDARD_USER users without a churchId, we need to find the ADMIN they're associated with
      
      // First check if they've participated in any batches
      const [batch] = await db
        .select()
        .from(batches)
        .where(sql`
          ${batches.primaryAttestorId} = ${userId} OR 
          ${batches.secondaryAttestorId} = ${userId} OR
          ${batches.attestationConfirmedBy} = ${userId}
        `)
        .limit(1);
        
      if (batch?.churchId) {
        console.log(`Found churchId ${batch.churchId} from batch for STANDARD_USER ${userId}`);
        
        // Update the user with this churchId for future reference
        await db
          .update(users)
          .set({ churchId: batch.churchId })
          .where(eq(users.id, userId));
          
        return batch.churchId;
      }
      
      // If we can't determine the church from batches, find the Account Owner
      const [accountOwner] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.role, 'ADMIN'),
          eq(users.isAccountOwner, true)
        ))
        .limit(1);
      
      if (accountOwner) {
        console.log(`Found Account Owner ${accountOwner.id} as churchId for Standard User ${userId}`);
        
        // Update the user with this churchId for future reference
        await db
          .update(users)
          .set({ churchId: accountOwner.id })
          .where(eq(users.id, userId));
          
        return accountOwner.id;
      }
      
      // If no Master Admin is found, find any ADMIN user
      const [anyAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ADMIN'))
        .limit(1);
      
      if (anyAdmin) {
        console.log(`Found admin user ${anyAdmin.id} as churchId for STANDARD_USER ${userId}`);
        
        // Update the user with this churchId for future reference
        await db
          .update(users)
          .set({ churchId: anyAdmin.id })
          .where(eq(users.id, userId));
          
        return anyAdmin.id;
      }
      
      // If all else fails, use the user's own ID
      console.log(`No churchId found for STANDARD_USER ${userId}, using userId as fallback`);
      return userId;
    } catch (error) {
      console.error(`Error in getChurchIdForUser: ${error}`);
      return userId; // Return the userId as a fallback
    }
  }
  
  async getAdminIdForChurch(churchId: string): Promise<string | null> {
    // For this application, the churchId is the admin's user ID in most cases
    // But we'll double-check by querying for users with ADMIN role for this church
    
    // First, check if the churchId itself is an ADMIN user
    const adminUser = await this.getUser(churchId);
    if (adminUser && adminUser.role === 'ADMIN') {
      console.log(`ChurchId ${churchId} is the admin's ID`);
      return churchId;
    }
    
    // Otherwise, look for an ADMIN user associated with this church
    const [admin] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.role, 'ADMIN'),
        // Users don't have a direct churchId field, but in our case the ADMIN's ID is the churchId
        // For a multi-tenant system, we'd need to join with other tables
        sql`${users.id} = ${churchId}`
      ))
      .limit(1);
    
    if (admin) {
      console.log(`Found admin user ${admin.id} for church ${churchId}`);
      return admin.id;
    }
    
    // If we can't find a specific admin, try to find any admin in the system
    // This is a fallback for when the church structure is not properly set up
    const [anyAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'ADMIN'))
      .limit(1);
      
    if (anyAdmin) {
      console.log(`Found fallback admin user ${anyAdmin.id} for church ${churchId}`);
      return anyAdmin.id;
    }
    
    console.log(`No admin found for church ${churchId}`);
    return null;
  }
  
  async getUsers(churchId: string): Promise<User[]> {
    try {
      // First find all users who have participated in batches for this church
      const usersFromBatches = await db
        .select({ userId: sql<string>`DISTINCT 
          CASE 
            WHEN ${batches.primaryAttestorId} IS NOT NULL THEN ${batches.primaryAttestorId}
            WHEN ${batches.secondaryAttestorId} IS NOT NULL THEN ${batches.secondaryAttestorId}
            WHEN ${batches.attestationConfirmedBy} IS NOT NULL THEN ${batches.attestationConfirmedBy}
          END` })
        .from(batches)
        .where(eq(batches.churchId, churchId));
      
      const userIds = usersFromBatches
        .map(u => u.userId)
        .filter(id => id !== null && id !== undefined) as string[];
      
      let userList: User[] = [];
      
      if (userIds.length === 0) {
        // If no users found from batches, get all users
        userList = await db
          .select()
          .from(users)
          .orderBy(desc(users.username));
      } else {
        // Get user details
        userList = await db
          .select()
          .from(users)
          .where(sql`${users.id} IN (${userIds.join(',')})`)
          .orderBy(desc(users.username));
      }
      
      // Apply our temporary soft deletion filter based on email prefix
      // This replaces the isActive column until migration is run
      return userList.map(user => ({
        ...user,
        isActive: !user.email?.startsWith('INACTIVE_')
      })).filter(user => !user.email?.startsWith('INACTIVE_'));
      
    } catch (error) {
      console.error("Error in getUsers:", error);
      return [];
    }
  }
  
  async getUserRole(userId: string): Promise<string | null> {
    try {
      const user = await this.getUser(userId);
      return user?.role || null;
    } catch (error) {
      console.error("Error getting user role:", error);
      return null;
    }
  }
  
  async getChurchByAdminId(adminId: string): Promise<{ id: string; name: string } | null> {
    try {
      const admin = await this.getUser(adminId);
      
      if (!admin || admin.role !== 'ADMIN') {
        return null;
      }
      
      return {
        id: admin.id,
        name: admin.churchName || 'Unnamed Church'
      };
    } catch (error) {
      console.error("Error getting church by admin ID:", error);
      return null;
    }
  }
  
  async getUsersByChurchId(churchId: string): Promise<User[]> {
    try {
      // Get both ADMIN and STANDARD_USER users associated with this church
      // First, get the ADMIN user (church owner)
      const adminId = await this.getAdminIdForChurch(churchId);
      
      // Get all users who have participated in batches for this church
      const usersFromBatches = await db
        .select({ userId: sql<string>`DISTINCT 
          CASE 
            WHEN ${batches.primaryAttestorId} IS NOT NULL THEN ${batches.primaryAttestorId}
            WHEN ${batches.secondaryAttestorId} IS NOT NULL THEN ${batches.secondaryAttestorId}
            WHEN ${batches.attestationConfirmedBy} IS NOT NULL THEN ${batches.attestationConfirmedBy}
          END` })
        .from(batches)
        .where(eq(batches.churchId, churchId));
      
      const userIds = usersFromBatches
        .map(u => u.userId)
        .filter(id => id !== null && id !== undefined) as string[];
      
      // Make sure to include the admin ID if it exists
      if (adminId && !userIds.includes(adminId)) {
        userIds.push(adminId);
      }
      
      let userList: User[] = [];
      
      if (userIds.length === 0) {
        // If no users found, find all ADMIN users as a fallback
        userList = await db
          .select()
          .from(users)
          .where(eq(users.role, 'ADMIN'));
      } else {
        // Get user details
        userList = await db
          .select()
          .from(users)
          .where(sql`${users.id} IN (${userIds.join(',')})`)
          .orderBy(desc(users.username));
      }
      
      // Apply our temporary soft deletion filter based on email prefix
      // This replaces the isActive column until migration is run
      return userList.map(user => ({
        ...user,
        isActive: !user.email?.startsWith('INACTIVE_')
      })).filter(user => !user.email?.startsWith('INACTIVE_'));
      
    } catch (error) {
      console.error("Error in getUsersByChurchId:", error);
      return [];
    }
  }
  
  // New Master Admin functions
  
  // Get the Account Owner for a church
  async getAccountOwnerForChurch(churchId: string): Promise<User | undefined> {
    try {
      // First look for a user with ACCOUNT_OWNER role directly
      const [accountOwner] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.churchId, churchId),
          eq(users.role, 'ACCOUNT_OWNER')
        ))
        .limit(1);
        
      if (accountOwner) {
        console.log(`Found Account Owner ${accountOwner.id} with role ACCOUNT_OWNER for church ${churchId}`);
        return accountOwner;
      }
      
      // Next, look for an admin with isAccountOwner flag
      const [adminOwner] = await db
        .select()
        .from(users)
        .where(and(
          eq(users.churchId, churchId),
          eq(users.role, 'ADMIN'),
          eq(users.isAccountOwner, true)
        ))
        .limit(1);
        
      if (adminOwner) {
        console.log(`Found Account Owner ${adminOwner.id} with isAccountOwner flag for church ${churchId}`);
        return adminOwner;
      }
      
      // Then check if there's an Admin that matches the churchId - the church creator
      const originalAdmin = await this.getUser(churchId);
      if (originalAdmin && (originalAdmin.role === 'ADMIN' || originalAdmin.role === 'ACCOUNT_OWNER')) {
        console.log(`Using original Admin ${originalAdmin.id} as Account Owner for church ${churchId}`);
        return originalAdmin;
      }
      
      // If we couldn't find the original admin, find the first admin associated with this church
      const churchUsers = await this.getUsersByChurchId(churchId);
      const adminUsers = churchUsers.filter(user => user.role === 'ADMIN' || user.role === 'ACCOUNT_OWNER');
      
      if (adminUsers.length > 0) {
        console.log(`Using Admin ${adminUsers[0].id} as Account Owner for church ${churchId}`);
        return adminUsers[0];
      }
      
      // Last resort: just find any admin in the system
      const [fallbackAdmin] = await db
        .select()
        .from(users)
        .where(eq(users.role, 'ADMIN'))
        .limit(1);
        
      if (fallbackAdmin) {
        console.log(`Using fallback Admin ${fallbackAdmin.id} as Account Owner (no church match found)`);
        return fallbackAdmin;
      }
      
      console.log(`Could not find any suitable Account Owner for church ${churchId}`);
      return undefined;
    } catch (error) {
      console.error("Error in getAccountOwnerForChurch:", error);
      return undefined;
    }
  }
  
  // Get the Master Admin for a church (backward compatibility)
  async getMasterAdminForChurch(churchId: string): Promise<User | undefined> {
    try {
      const accountOwner = await this.getAccountOwnerForChurch(churchId);
      
      if (accountOwner) {
        // Ensure backward compatibility with the isMasterAdmin virtual flag
        return {
          ...accountOwner,
          isMasterAdmin: true
        };
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in getMasterAdminForChurch:", error);
      return undefined;
    }
  }
  
  // Set a user as the Account Owner for a church
  async setUserAsAccountOwner(userId: string, churchId: string): Promise<User | undefined> {
    try {
      // First, verify this user exists
      const user = await this.getUser(userId);
      if (!user) {
        console.error(`Cannot set user ${userId} as Account Owner - user not found`);
        return undefined;
      }
      
      // Do NOT change the churchId here - we want to preserve the association with the church
      // Update only the role and isAccountOwner flag
      const [updatedUser] = await db
        .update(users)
        .set({
          role: 'ACCOUNT_OWNER',
          isAccountOwner: true,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();
        
      console.log(`Set user ${userId} as Account Owner for church ${churchId} without changing churchId`);
      
      return updatedUser;
    } catch (error) {
      console.error("Error in setUserAsAccountOwner:", error);
      return undefined;
    }
  }
  
  // Set a user as the Master Admin for a church (backward compatibility)
  async setUserAsMasterAdmin(userId: string, churchId: string): Promise<User | undefined> {
    try {
      const updatedUser = await this.setUserAsAccountOwner(userId, churchId);
      
      if (updatedUser) {
        // Virtually add the isMasterAdmin flag for backward compatibility
        return {
          ...updatedUser,
          isMasterAdmin: true
        };
      }
      
      return undefined;
    } catch (error) {
      console.error("Error in setUserAsMasterAdmin:", error);
      return undefined;
    }
  }
  
  // Transfer Account Ownership from one user to another
  async transferAccountOwnership(fromUserId: string, toUserId: string, churchId: string): Promise<boolean> {
    try {
      // Verify both users exist
      const fromUser = await this.getUser(fromUserId);
      const toUser = await this.getUser(toUserId);
      
      if (!fromUser || !toUser) {
        console.error(`Cannot transfer Account Ownership - one or both users not found`);
        return false;
      }
      
      // Verify the current user is an Account Owner / Master Admin
      const isFromUserOwner = 
        fromUser.role === 'ACCOUNT_OWNER' || 
        (fromUser.role === 'ADMIN' && (fromUser.isAccountOwner || fromUser.isMasterAdmin));
        
      if (!isFromUserOwner) {
        console.error(`Cannot transfer Account Ownership - source user is not an Account Owner`);
        return false;
      }
      
      // Start transaction
      await db.transaction(async (tx) => {
        // 1. Remove Account Owner status from the current Account Owner
        await tx
          .update(users)
          .set({ 
            role: 'ADMIN', // Demote to regular admin
            isAccountOwner: false,
            updatedAt: new Date()
          })
          .where(eq(users.id, fromUserId));
          
        // 2. Promote the target user to Account Owner
        await tx
          .update(users)
          .set({ 
            role: 'ACCOUNT_OWNER',
            isAccountOwner: true,
            updatedAt: new Date()
          })
          .where(eq(users.id, toUserId));
        
        // Important: We DO NOT update the churchId of any users. The churchId
        // should remain constant and represent the actual church, not the Account Owner's ID.
        console.log(`Transferred Account Ownership from ${fromUserId} to ${toUserId} while preserving churchId ${churchId}`);
      });
        
      console.log(`Transferred Account Ownership from ${fromUserId} to ${toUserId} for church ${churchId}`);
      
      return true;
    } catch (error) {
      console.error("Error in transferAccountOwnership:", error);
      return false;
    }
  }
  
  // Backward compatibility method for transferring Master Admin status
  async transferMasterAdmin(fromUserId: string, toUserId: string, churchId: string): Promise<boolean> {
    return this.transferAccountOwnership(fromUserId, toUserId, churchId);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSettings(id: string, data: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async updateUserEmailNotificationSetting(userId: string, enabled: boolean): Promise<boolean> {
    try {
      await db
        .update(users)
        .set({ 
          emailNotificationsEnabled: enabled,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error updating email notification setting:', error);
      throw error;
    }
  }
  
  // This method was a duplicate - see the complete implementation below
  
  async updateUserRole(id: string, role: string): Promise<User> {
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    // Handle legacy role mapping and set isAccountOwner flag appropriately
    if (role === "ACCOUNT_OWNER") {
      updateData.role = role;
      updateData.isAccountOwner = true;
    } else if (role === "ADMIN") {
      updateData.role = role;
      updateData.isAccountOwner = false;
    } else if (role === "STANDARD") {
      // Update to STANDARD_USER for consistency with new role naming
      updateData.role = "STANDARD_USER"; 
      updateData.isAccountOwner = false;
    } else {
      // For any other role, just set it directly
      updateData.role = role;
      updateData.isAccountOwner = false;
    }
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    // For backwards compatibility, set isMasterAdmin based on isAccountOwner
    if (updatedUser) {
      updatedUser.isMasterAdmin = !!updatedUser.isAccountOwner;
    }
    
    return updatedUser;
  }
  
  async createUser(userData: Partial<UpsertUser> & { churchId?: string }): Promise<User> {
    try {
      // Generate a unique ID for the user if not provided
      const userId = userData.id || Math.floor(Math.random() * 1000000000).toString();
      
      // Generate a password reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Create data object without churchId
      const { churchId, ...userDataToInsert } = userData;
      
      // Token will expire in 48 hours
      const resetExpires = new Date();
      resetExpires.setHours(resetExpires.getHours() + 48);
      
      // Generate base username from email if not provided
      let baseUsername = userData.username || userData.email?.split('@')[0] || `user_${userId}`;
      let username = baseUsername;
      
      // Check if this username already exists
      const usernameExists = async (name: string) => {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.username, name))
          .limit(1);
        return result.length > 0;
      };
      
      // If username exists, add a sequential number suffix until we find a unique one
      let suffix = 1;
      const existsCheck = await usernameExists(username);
      
      if (existsCheck) {
        // First, try to find all usernames that start with this base
        const similarUsernames = await db
          .select()
          .from(users)
          .where(sql`${users.username} LIKE ${baseUsername + '%'}`);
        
        // Start the suffix from the highest existing number + 1
        if (similarUsernames.length > 0) {
          const existingNumbers = similarUsernames
            .map(u => {
              const match = u.username?.match(new RegExp(`^${baseUsername}(\\d+)$`));
              return match ? parseInt(match[1], 10) : 0;
            })
            .filter(n => !isNaN(n));
          
          if (existingNumbers.length > 0) {
            suffix = Math.max(...existingNumbers) + 1;
          }
        }
        
        // Format the suffix with leading zeros based on how many digits we need
        // e.g., 01, 02, ..., 10, 11, etc.
        const suffixStr = suffix.toString().padStart(2, '0');
        username = `${baseUsername}${suffixStr}`;
        
        // Double-check that this username is unique (in case of race conditions)
        while (await usernameExists(username)) {
          suffix++;
          const newSuffixStr = suffix.toString().padStart(2, '0');
          username = `${baseUsername}${newSuffixStr}`;
        }
      }
      
      console.log(`Generated unique username: ${username} for user ${userData.email}`);
      
      // Important: We need to check if the churchId exists as a user in the database first
      // because there's a foreign key constraint requiring churchId to exist in users.id
      let finalChurchId = null;
      if (churchId) {
        // Check if the churchId exists first
        const churchExists = await db
          .select()
          .from(users)
          .where(eq(users.id, churchId))
          .limit(1);
          
        if (churchExists.length > 0) {
          finalChurchId = churchId;
          console.log(`Verified churchId ${churchId} exists in users table`);
        } else {
          console.log(`WARNING: churchId ${churchId} doesn't exist in users table, setting to null`);
        }
      }
      
      const [newUser] = await db
        .insert(users)
        .values({
          id: userId,
          username,
          email: userData.email!,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          bio: userData.bio || null,
          profileImageUrl: userData.profileImageUrl || null,
          role: userData.role || 'STANDARD_USER',
          password: userData.password || null,
          createdAt: new Date(),
          updatedAt: new Date(),
          churchName: userData.churchName || null,
          churchId: finalChurchId, // Only set if verified to exist
          emailNotificationsEnabled: userData.emailNotificationsEnabled !== undefined ? userData.emailNotificationsEnabled : true,
          passwordResetToken: resetToken,
          passwordResetExpires: resetExpires,
          isVerified: false,
        })
        .returning();
      
      return newUser;
    } catch (error) {
      console.error("Error in createUser:", error);
      throw error;
    }
  }
  
  async deleteUser(id: string): Promise<boolean> {
    try {
      // First check if user exists
      const user = await this.getUser(id);
      if (!user) {
        console.log(`Cannot delete non-existent user: ${id}`);
        return false;
      }
      
      console.log(`Checking if user ${id} has attestation records...`);
      
      // Check if user has attestation records (was involved in batch counts)
      const hasAttestations = await db
        .select({ count: sql<number>`count(*)` })
        .from(batches)
        .where(
          or(
            eq(batches.primaryAttestorId, id),
            eq(batches.secondaryAttestorId, id),
            eq(batches.attestationConfirmedBy, id)
          )
        )
        .then(result => result[0]?.count > 0);
      
      // Use transaction to ensure data consistency
      await db.transaction(async (tx) => {
        // First delete any related records that reference this user
        
        if (hasAttestations) {
          // For users with attestation history, mark as inactive by prefixing email
          console.log(`User ${id} has attestation records - marking as inactive`);
          await tx
            .update(users)
            .set({
              // Only prefix if not already inactive
              email: sql`CASE WHEN email NOT LIKE 'INACTIVE_%' THEN CONCAT('INACTIVE_', email) ELSE email END`,
              updatedAt: new Date()
            })
            .where(eq(users.id, id));
        } else {
          // For users with no history, completely remove
          console.log(`User ${id} has no attestation records - removing completely`);
          await tx.delete(users).where(eq(users.id, id));
        }
      });
      
      console.log(`Successfully processed user deletion: ${id}`);
      return true;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      return false;
    }
  }

  // Member operations
  async getMembers(churchId: string): Promise<Member[]> {
    return db
      .select()
      .from(members)
      .where(eq(members.churchId, churchId))
      .orderBy(desc(members.createdAt));
  }

  async getMember(id: number, churchId: string): Promise<Member | undefined> {
    const [member] = await db
      .select()
      .from(members)
      .where(and(
        eq(members.id, id),
        eq(members.churchId, churchId)
      ));
    
    return member;
  }

  async getMemberWithDonations(id: number, churchId: string): Promise<MemberWithDonations | undefined> {
    const [member] = await db
      .select()
      .from(members)
      .where(and(
        eq(members.id, id),
        eq(members.churchId, churchId)
      ));
    
    if (!member) return undefined;
    
    const memberDonations = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.memberId, id),
        eq(donations.churchId, churchId)
      ))
      .orderBy(desc(donations.date));
    
    // Calculate total donations amount
    const [totalResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.memberId, id),
        eq(donations.churchId, churchId)
      ));
    
    const totalDonations = parseFloat(totalResult?.total || "0");
    
    return {
      ...member,
      donations: memberDonations,
      totalDonations,
      lastDonation: memberDonations[0]
    };
  }

  async createMember(memberData: InsertMember): Promise<Member> {
    const [newMember] = await db
      .insert(members)
      .values(memberData)
      .returning();
    
    return newMember;
  }

  async updateMember(id: number, data: Partial<InsertMember>, churchId: string): Promise<Member | undefined> {
    const [updatedMember] = await db
      .update(members)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(members.id, id),
        eq(members.churchId, churchId)
      ))
      .returning();
    
    return updatedMember;
  }

  // Batch operations
  async getBatches(churchId: string): Promise<Batch[]> {
    return db
      .select()
      .from(batches)
      .where(eq(batches.churchId, churchId))
      .orderBy(desc(batches.date));
  }

  async getBatch(id: number, churchId: string): Promise<Batch | undefined> {
    const [batch] = await db
      .select()
      .from(batches)
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ));
    
    return batch;
  }

  async getBatchWithDonations(id: number, churchId: string): Promise<BatchWithDonations | undefined> {
    const [batch] = await db
      .select()
      .from(batches)
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ));
    
    if (!batch) return undefined;
    
    const batchDonations = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.batchId, id),
        eq(donations.churchId, churchId)
      ))
      .orderBy(desc(donations.date));
    
    // Get all unique member IDs
    const memberIds = Array.from(new Set(batchDonations
      .filter(d => d.memberId !== null)
      .map(d => d.memberId)));
    // Fetch all members in a single query if there are member IDs
    let membersMap: Record<number, Member> = {};
    if (memberIds.length > 0) {
      const membersList = await db
        .select()
        .from(members)
        .where(sql`${members.id} IN (${memberIds.join(',')})`);
      
      // Create a map for quick member lookup
      membersMap = membersList.reduce((acc, member) => {
        acc[member.id] = member;
        return acc;
      }, {} as Record<number, Member>);
    }
    
    // Join donations with members
    const donationsWithMembers = batchDonations.map(donation => ({
      ...donation,
      member: donation.memberId ? membersMap[donation.memberId] : undefined
    }));
    
    return {
      ...batch,
      donations: donationsWithMembers,
      donationCount: donationsWithMembers.length
    };
  }

  async createBatch(batchData: InsertBatch): Promise<Batch> {
    // Format the default name as "Month Day, Year" if not provided
    if (!batchData.name) {
      const date = batchData.date instanceof Date ? batchData.date : new Date();
      batchData.name = format(date, 'MMMM d, yyyy');
    }
    
    const [newBatch] = await db
      .insert(batches)
      .values(batchData)
      .returning();
    
    return newBatch;
  }

  async updateBatch(id: number, data: Partial<InsertBatch>, churchId: string): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async updateBatchPrimaryAttestation(id: number, churchId: string, attestationData: any): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        primaryAttestorId: attestationData.attestorId,
        primaryAttestorName: attestationData.attestorName,
        primaryAttestationDate: attestationData.attestationDate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async updateBatchSecondaryAttestation(id: number, churchId: string, attestationData: any): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        secondaryAttestorId: attestationData.attestorId,
        secondaryAttestorName: attestationData.attestorName,
        secondaryAttestationDate: attestationData.attestationDate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async finalizeBatch(id: number, churchId: string, userId: string): Promise<Batch | undefined> {
    // Get the batch to calculate total amount first
    const batchWithDonations = await this.getBatchWithDonations(id, churchId);
    
    if (!batchWithDonations) {
      throw new Error('Batch not found');
    }
    
    // Calculate total amount from donations
    const totalAmount = batchWithDonations.donations.reduce((sum, donation) => {
      return sum + parseFloat(donation.amount.toString());
    }, 0).toFixed(2);
    
    // Update the batch status to FINALIZED and set total amount
    const [updatedBatch] = await db
      .update(batches)
      .set({
        status: 'FINALIZED',
        totalAmount,
        attestationConfirmedBy: userId,
        attestationConfirmationDate: new Date(),
        updatedAt: new Date(),
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async addPrimaryAttestation(id: number, attestorId: string, attestorName: string, churchId: string): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        primaryAttestorId: attestorId,
        primaryAttestorName: attestorName,
        primaryAttestationDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async updateBatchPrimaryAttestation(id: number, churchId: string, attestationData: any): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        primaryAttestorId: attestationData.attestorId,
        primaryAttestorName: attestationData.attestorName,
        primaryAttestationDate: attestationData.attestationDate,
        primaryAttestationNotes: attestationData.notes,
        status: 'PENDING_SECONDARY',
        updatedAt: new Date()
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async updateBatchSecondaryAttestation(id: number, churchId: string, attestationData: any): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        secondaryAttestorId: attestationData.attestorId,
        secondaryAttestorName: attestationData.attestorName,
        secondaryAttestationDate: attestationData.attestationDate,
        secondaryAttestationNotes: attestationData.notes,
        status: 'PENDING_FINALIZATION',
        updatedAt: new Date()
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async finalizeBatch(id: number, churchId: string, userId: string): Promise<Batch | undefined> {
    try {
      // First update the batch status
      const [updatedBatch] = await db
        .update(batches)
        .set({
          attestationConfirmedBy: userId,
          attestationConfirmationDate: new Date(),
          status: 'FINALIZED',
          updatedAt: new Date()
        })
        .where(and(
          eq(batches.id, id),
          eq(batches.churchId, churchId)
        ))
        .returning();
      
      if (!updatedBatch) {
        console.error(`Failed to update batch ${id}`);
        return undefined;
      }

      // Check if we should send email notifications
      const church = await this.getChurchById(churchId);
      if (church && church.emailNotificationsEnabled) {
        console.log(`Email notifications are enabled for church ${churchId}. Preparing to send finalization emails...`);
        
        // Get the batch with donations for sending emails
        const batchWithDonations = await this.getBatchWithDonations(id, churchId);
        if (batchWithDonations) {
          // Start processing emails in the background
          setTimeout(async () => {
            try {
              // First, handle donor receipt emails if members have email addresses
              console.log(`Processing donation receipt emails for batch ${id}...`);
              const { donations } = batchWithDonations;
              
              if (donations && donations.length > 0) {
                for (const donation of donations) {
                  if (donation.memberId) {
                    const member = await this.getMember(donation.memberId, churchId);
                    if (member && member.email) {
                      // We have a member with an email, send receipt
                      const donationDate = donation.createdAt 
                        ? format(new Date(donation.createdAt), 'MMMM d, yyyy')
                        : format(new Date(), 'MMMM d, yyyy');
                        
                      const { sendDonationNotification } = await import('./sendgrid');
                      await sendDonationNotification({
                        to: member.email,
                        amount: donation.amount.toString(),
                        date: donationDate,
                        donorName: `${member.firstName} ${member.lastName}`,
                        churchName: church.name || 'Your Church',
                        churchId: churchId,
                        churchLogoUrl: church.logoUrl,
                        donationId: donation.id.toString()
                      });
                      
                      console.log(`Sent donation receipt to ${member.email} for donation ${donation.id}`);
                    }
                  }
                }
              }
              
              // Now send the count report to all report recipients
              const recipients = await this.getReportRecipients(churchId);
              if (recipients && recipients.length > 0) {
                console.log(`Sending count report to ${recipients.length} recipients...`);
                
                // Get service option name
                let serviceName = "Regular Service";
                if (batchWithDonations.serviceOptionId) {
                  const serviceOption = await this.getServiceOption(batchWithDonations.serviceOptionId, churchId);
                  if (serviceOption) {
                    serviceName = serviceOption.name;
                  }
                }
                
                // Calculate totals
                const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
                const cashDonations = donations.filter(d => d.type === 'CASH');
                const checkDonations = donations.filter(d => d.type === 'CHECK');
                const cashAmount = cashDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
                const checkAmount = checkDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
                
                // Format date
                const batchDate = batchWithDonations.createdAt 
                  ? format(new Date(batchWithDonations.createdAt), 'MMMM d, yyyy')
                  : format(new Date(), 'MMMM d, yyyy');
                
                // Get counter names
                const primaryAttestor = await this.getUser(batchWithDonations.attestorId);
                const secondaryAttestor = batchWithDonations.secondaryAttestorId 
                  ? await this.getUser(batchWithDonations.secondaryAttestorId) 
                  : null;
                
                // Format counter names
                const primaryAttestorName = primaryAttestor 
                  ? `${primaryAttestor.firstName || ''} ${primaryAttestor.lastName || ''}`.trim() || primaryAttestor.email 
                  : 'Unknown';
                
                const secondaryAttestorName = secondaryAttestor 
                  ? `${secondaryAttestor.firstName || ''} ${secondaryAttestor.lastName || ''}`.trim() || secondaryAttestor.email 
                  : '';
                
                const counterNames = secondaryAttestorName 
                  ? `${primaryAttestorName} and ${secondaryAttestorName}` 
                  : primaryAttestorName;
                
                // Send to each recipient
                for (const recipient of recipients) {
                  if (recipient.email) {
                    const { sendCountReport } = await import('./sendgrid');
                    await sendCountReport({
                      to: recipient.email,
                      recipientName: `${recipient.firstName} ${recipient.lastName}`,
                      churchName: church.name || 'Your Church',
                      churchId: churchId,
                      churchLogoUrl: church.logoUrl,
                      batchId: id,
                      batchName: serviceName,
                      batchDate: batchDate,
                      totalAmount: totalAmount.toFixed(2),
                      cashAmount: cashAmount.toFixed(2),
                      checkAmount: checkAmount.toFixed(2),
                      donations: donations,
                      donationCount: donations.length,
                      counterNames: counterNames,
                      date: new Date(batchWithDonations.createdAt),
                      serviceOption: serviceName
                    });
                    
                    console.log(`Sent count report to ${recipient.email}`);
                  }
                }
              } else {
                console.log(`No report recipients configured for church ${churchId}`);
              }
              
            } catch (emailError) {
              console.error('Error sending finalization emails:', emailError);
              // Do not block the batch finalization process for email errors
            }
          }, 0);
        }
      } else {
        console.log(`Email notifications are NOT enabled for church ${churchId}. Skipping emails.`);
      }
      
      return updatedBatch;
    } catch (error) {
      console.error(`Error finalizing batch ${id}:`, error);
      throw error;
    }
  }
  
  async addSecondaryAttestation(id: number, attestorId: string, attestorName: string, churchId: string): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        secondaryAttestorId: attestorId,
        secondaryAttestorName: attestorName,
        secondaryAttestationDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }
  
  async confirmAttestation(id: number, confirmerId: string, churchId: string): Promise<Batch | undefined> {
    const [updatedBatch] = await db
      .update(batches)
      .set({
        attestationConfirmedBy: confirmerId,
        attestationConfirmationDate: new Date(),
        status: 'FINALIZED',
        updatedAt: new Date()
      })
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ))
      .returning();
    
    return updatedBatch;
  }

  async deleteBatch(id: number, churchId: string): Promise<void> {
    try {
      // Begin transaction to ensure data integrity
      await db.transaction(async (tx) => {
        // 1. First fetch the batch to verify it exists and belongs to the church
        const [batch] = await tx
          .select()
          .from(batches)
          .where(and(
            eq(batches.id, id),
            eq(batches.churchId, churchId)
          ));
        
        if (!batch) {
          throw new Error(`Batch not found with ID ${id} for church ${churchId}`);
        }
        
        // 2. Delete any donation notifications related to this batch's donations
        // This is handled by cascading deletes in the database, but we'll make it explicit here

        // 3. Delete all donations associated with this batch
        await tx
          .delete(donations)
          .where(and(
            eq(donations.batchId, id),
            eq(donations.churchId, churchId)
          ));
        
        console.log(`Deleted all donations for batch ${id} from church ${churchId}`);
        
        // 4. Delete the batch itself
        await tx
          .delete(batches)
          .where(and(
            eq(batches.id, id),
            eq(batches.churchId, churchId)
          ));
        
        console.log(`Deleted batch ${id} from church ${churchId}`);
      });
    } catch (error) {
      console.error(`Error deleting batch ${id} for church ${churchId}:`, error);
      throw error;
    }
  }

  async getCurrentBatch(churchId: string): Promise<Batch | undefined> {
    // Get the most recent OPEN batch
    const [currentBatch] = await db
      .select()
      .from(batches)
      .where(and(
        eq(batches.churchId, churchId),
        eq(batches.status, 'OPEN')
      ))
      .orderBy(desc(batches.date))
      .limit(1);
    
    if (currentBatch) {
      return currentBatch;
    }
    
    // If no open batch exists, create a new one
    const today = new Date();
    const newBatch: InsertBatch = {
      name: format(today, 'MMMM d, yyyy'),
      date: today,
      status: 'OPEN',
      notes: 'Automatically created batch',
      churchId
    };
    
    return this.createBatch(newBatch);
  }
  
  async getLatestFinalizedBatch(churchId: string): Promise<Batch | undefined> {
    // Get the most recent FINALIZED batch
    const [finalizedBatch] = await db
      .select()
      .from(batches)
      .where(and(
        eq(batches.churchId, churchId),
        eq(batches.status, 'FINALIZED')
      ))
      .orderBy(desc(batches.date))
      .limit(1);
    
    // If no finalized batch was found, return null explicitly to make
    // error handling in the route handler more straightforward
    return finalizedBatch || null;
  }

  // Donation operations
  async getDonations(churchId: string): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(eq(donations.churchId, churchId))
      .orderBy(desc(donations.date));
  }

  async getDonationsWithMembers(churchId: string): Promise<DonationWithMember[]> {
    const donationsList = await db
      .select()
      .from(donations)
      .where(eq(donations.churchId, churchId))
      .orderBy(desc(donations.date));
    
    // If there are no donations, return empty array
    if (!donationsList.length) return [];
    
    // Get all unique member IDs
    const memberIds = Array.from(new Set(donationsList
      .filter(d => d.memberId !== null)
      .map(d => d.memberId)));
    
    // If there are no member IDs (all anonymous donations), return as is
    if (!memberIds.length) {
      return donationsList.map(d => ({ ...d, member: undefined }));
    }
    
    // Fetch all members in a single query
    const membersList = await db
      .select()
      .from(members)
      .where(sql`${members.id} IN (${memberIds.join(',')})`);
    
    // Create a map for quick member lookup
    const membersMap = membersList.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {} as Record<number, Member>);
    
    // Join donations with members
    return donationsList.map(donation => ({
      ...donation,
      member: donation.memberId ? membersMap[donation.memberId] : undefined
    }));
  }

  async getDonation(id: number, churchId: string): Promise<Donation | undefined> {
    const [donation] = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.id, id),
        eq(donations.churchId, churchId)
      ));
    
    return donation;
  }
  
  async getDonationsForBatch(batchId: number, churchId: string): Promise<Donation[]> {
    return db
      .select()
      .from(donations)
      .where(and(
        eq(donations.batchId, batchId),
        eq(donations.churchId, churchId)
      ))
      .orderBy(desc(donations.date));
  }
  
  async getDonationWithMember(id: number, churchId: string): Promise<DonationWithMember | undefined> {
    const [donation] = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.id, id),
        eq(donations.churchId, churchId)
      ));
    
    if (!donation) return undefined;
    
    // If this is an anonymous donation (no memberId), return as is
    if (!donation.memberId) {
      return { ...donation, member: undefined };
    }
    
    // Fetch the associated member
    const [member] = await db
      .select()
      .from(members)
      .where(eq(members.id, donation.memberId));
    
    return {
      ...donation,
      member
    };
  }

  async createDonation(donationData: InsertDonation): Promise<Donation> {
    const [newDonation] = await db
      .insert(donations)
      .values(donationData)
      .returning();
    
    return newDonation;
  }

  async getDonationsByBatch(batchId: number, churchId: string): Promise<DonationWithMember[]> {
    const donationsList = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.batchId, batchId),
        eq(donations.churchId, churchId)
      ))
      .orderBy(desc(donations.date));
    
    // If there are no donations, return empty array
    if (!donationsList.length) return [];
    
    // Get all unique member IDs
    const memberIds = Array.from(new Set(donationsList
      .filter(d => d.memberId !== null)
      .map(d => d.memberId)));
    
    // If there are no member IDs (all anonymous donations), return as is
    if (!memberIds.length) {
      return donationsList.map(d => ({ ...d, member: undefined }));
    }
    
    // Fetch all members in a single query
    const membersList = await db
      .select()
      .from(members)
      .where(sql`${members.id} IN (${memberIds.join(',')})`);
    
    // Create a map for quick member lookup
    const membersMap = membersList.reduce((acc, member) => {
      acc[member.id] = member;
      return acc;
    }, {} as Record<number, Member>);
    
    // Join donations with members
    return donationsList.map(donation => ({
      ...donation,
      member: donation.memberId ? membersMap[donation.memberId] : undefined
    }));
  }

  async updateDonation(id: number, data: Partial<InsertDonation>, churchId: string): Promise<Donation | undefined> {
    const [updatedDonation] = await db
      .update(donations)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(donations.id, id),
        eq(donations.churchId, churchId)
      ))
      .returning();
    
    return updatedDonation;
  }

  async deleteDonation(id: number, churchId: string): Promise<Donation | undefined> {
    // First get the donation to return it after deletion
    const [donation] = await db
      .select()
      .from(donations)
      .where(and(
        eq(donations.id, id),
        eq(donations.churchId, churchId)
      ));
    
    if (!donation) {
      return undefined;
    }
    
    // Then delete the donation
    await db
      .delete(donations)
      .where(and(
        eq(donations.id, id),
        eq(donations.churchId, churchId)
      ));
    
    return donation;
  }

  async updateDonationNotificationStatus(id: number, status: string): Promise<void> {
    await db
      .update(donations)
      .set({
        notificationStatus: status,
        updatedAt: new Date(),
      })
      .where(eq(donations.id, id));
  }

  // Dashboard statistics
  async getTodaysDonations(churchId: string): Promise<{ total: string, percentChange: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [todayResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, today)
      ));
    
    // Get last Sunday's donations
    const lastSunday = new Date();
    lastSunday.setDate(lastSunday.getDate() - (lastSunday.getDay() || 7));
    lastSunday.setHours(0, 0, 0, 0);
    
    const prevSunday = new Date(lastSunday);
    prevSunday.setDate(prevSunday.getDate() - 7);
    
    const [lastSundayResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, lastSunday),
        sql`${donations.date} < ${new Date(lastSunday.getTime() + 24 * 60 * 60 * 1000)}`
      ));
    
    const todayTotal = parseFloat(todayResult.total);
    const lastSundayTotal = parseFloat(lastSundayResult.total);
    
    const percentChange = lastSundayTotal === 0 
      ? 0 
      : ((todayTotal - lastSundayTotal) / lastSundayTotal) * 100;
    
    return {
      total: todayTotal.toFixed(2),
      percentChange: Math.round(percentChange * 10) / 10
    };
  }

  async getWeeklyDonations(churchId: string): Promise<{ total: string, percentChange: number }> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);
    
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    twoWeeksAgo.setHours(0, 0, 0, 0);
    
    const [thisWeekResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, oneWeekAgo)
      ));
    
    const [lastWeekResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, twoWeeksAgo),
        sql`${donations.date} < ${oneWeekAgo}`
      ));
    
    const thisWeekTotal = parseFloat(thisWeekResult.total);
    const lastWeekTotal = parseFloat(lastWeekResult.total);
    
    const percentChange = lastWeekTotal === 0 
      ? 0 
      : ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100;
    
    return {
      total: thisWeekTotal.toFixed(2),
      percentChange: Math.round(percentChange * 10) / 10
    };
  }

  async getMonthlyDonations(churchId: string): Promise<{ total: string, percentChange: number }> {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    oneMonthAgo.setHours(0, 0, 0, 0);
    
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setHours(0, 0, 0, 0);
    
    const [thisMonthResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, oneMonthAgo)
      ));
    
    const [lastMonthResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${donations.amount}), 0)::text`
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, twoMonthsAgo),
        sql`${donations.date} < ${oneMonthAgo}`
      ));
    
    const thisMonthTotal = parseFloat(thisMonthResult.total);
    const lastMonthTotal = parseFloat(lastMonthResult.total);
    
    const percentChange = lastMonthTotal === 0 
      ? 0 
      : ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    
    return {
      total: thisMonthTotal.toFixed(2),
      percentChange: Math.round(percentChange * 10) / 10
    };
  }

  async getActiveDonorCount(churchId: string): Promise<{ count: number, newCount: number }> {
    // Active donors are those who donated in the last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    // New donors are those who made their first donation in the last month
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Get all unique donors (member IDs) who donated in the last 3 months
    const activeDonors = await db
      .select({
        memberId: donations.memberId
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, threeMonthsAgo),
        sql`${donations.memberId} IS NOT NULL`
      ))
      .groupBy(donations.memberId);
    
    // Get new donors in the last month
    const newDonors = await db
      .select({
        memberId: donations.memberId
      })
      .from(donations)
      .where(and(
        eq(donations.churchId, churchId),
        gte(donations.date, oneMonthAgo),
        sql`${donations.memberId} IS NOT NULL`
      ))
      .groupBy(donations.memberId)
      .having(sql`MIN(${donations.date}) >= ${oneMonthAgo}`);
    
    return {
      count: activeDonors.length,
      newCount: newDonors.length
    };
  }

  // Service options operations
  async getServiceOptions(churchId: string): Promise<ServiceOption[]> {
    return db
      .select()
      .from(serviceOptions)
      .where(eq(serviceOptions.churchId, churchId))
      .orderBy(desc(serviceOptions.createdAt));
  }

  async getServiceOption(id: number, churchId: string): Promise<ServiceOption | undefined> {
    const [option] = await db
      .select()
      .from(serviceOptions)
      .where(and(
        eq(serviceOptions.id, id),
        eq(serviceOptions.churchId, churchId)
      ));
    
    return option;
  }

  async createServiceOption(optionData: InsertServiceOption): Promise<ServiceOption> {
    // If this is set as default, clear other defaults first
    if (optionData.isDefault) {
      await db
        .update(serviceOptions)
        .set({ isDefault: false })
        .where(sql`${serviceOptions.churchId} = ${optionData.churchId}`);
    }
    
    const [newOption] = await db
      .insert(serviceOptions)
      .values(optionData)
      .returning();
    
    return newOption;
  }

  async updateServiceOption(id: number, data: Partial<InsertServiceOption>, churchId: string): Promise<ServiceOption | undefined> {
    // If this is set as default, clear other defaults first
    if (data.isDefault) {
      await db
        .update(serviceOptions)
        .set({ isDefault: false })
        .where(sql`${serviceOptions.churchId} = ${churchId} AND ${serviceOptions.id} != ${id}`);
    }
    
    const [updatedOption] = await db
      .update(serviceOptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(sql`${serviceOptions.id} = ${id} AND ${serviceOptions.churchId} = ${churchId}`)
      .returning();
    
    return updatedOption;
  }

  async deleteServiceOption(id: number, churchId: string): Promise<void> {
    await db
      .delete(serviceOptions)
      .where(sql`${serviceOptions.id} = ${id} AND ${serviceOptions.churchId} = ${churchId}`);
  }
  
  // Create default service options for new users
  async createDefaultServiceOptions(churchId: string): Promise<void> {
    const defaultOptions = [
      { name: "Sunday Morning", value: "sunday-morning", isDefault: true, churchId },
      { name: "Sunday Evening", value: "sunday-evening", isDefault: false, churchId },
      { name: "Wednesday Night", value: "wednesday-night", isDefault: false, churchId },
      { name: "Special Event", value: "special-event", isDefault: false, churchId }
    ];
    
    // Check if options already exist for this church
    const existingOptions = await this.getServiceOptions(churchId);
    
    // Only create defaults if no options exist
    if (existingOptions.length === 0) {
      for (const option of defaultOptions) {
        await this.createServiceOption(option);
      }
    }
  }
  
  // Report Recipients operations
  async getReportRecipients(churchId: string): Promise<ReportRecipient[]> {
    return db
      .select()
      .from(reportRecipients)
      .where(eq(reportRecipients.churchId, churchId))
      .orderBy(asc(reportRecipients.lastName), asc(reportRecipients.firstName));
  }
  
  async getReportRecipient(id: number, churchId: string): Promise<ReportRecipient | undefined> {
    const [recipient] = await db
      .select()
      .from(reportRecipients)
      .where(and(
        eq(reportRecipients.id, id),
        eq(reportRecipients.churchId, churchId)
      ));
    
    return recipient;
  }
  
  async createReportRecipient(recipientData: InsertReportRecipient): Promise<ReportRecipient> {
    const [newRecipient] = await db
      .insert(reportRecipients)
      .values(recipientData)
      .returning();
    
    return newRecipient;
  }
  
  async updateReportRecipient(id: number, data: Partial<InsertReportRecipient>, churchId: string): Promise<ReportRecipient | undefined> {
    const [updatedRecipient] = await db
      .update(reportRecipients)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(reportRecipients.id, id),
        eq(reportRecipients.churchId, churchId)
      ))
      .returning();
    
    return updatedRecipient;
  }
  
  async deleteReportRecipient(id: number, churchId: string): Promise<void> {
    await db
      .delete(reportRecipients)
      .where(and(
        eq(reportRecipients.id, id),
        eq(reportRecipients.churchId, churchId)
      ));
  }
  
  // Email Templates operations
  async getEmailTemplates(churchId: string): Promise<EmailTemplate[]> {
    return db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.churchId, churchId))
      .orderBy(asc(emailTemplates.templateType));
  }
  
  async getEmailTemplate(id: number, churchId: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.churchId, churchId)
      ));
    
    return template;
  }
  
  async getEmailTemplateByType(templateType: string, churchId: string): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(
        eq(emailTemplates.templateType, templateType),
        eq(emailTemplates.churchId, churchId)
      ));
    
    return template;
  }
  
  async getEmailTemplateById(id: number, churchId?: string): Promise<EmailTemplate | undefined> {
    // Create the base query
    let query = db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    
    // If churchId is provided, include it in the query
    if (churchId) {
      query = query.where(eq(emailTemplates.churchId, churchId));
    }
    
    // Execute the query and return the first result
    const [template] = await query;
    
    if (template) {
      console.log(`Found template ID ${id}, type: ${template.templateType}, churchId: ${template.churchId}`);
    } else {
      console.log(`No template found with ID ${id}${churchId ? ` and churchId ${churchId}` : ''}`);
    }
    
    return template;
  }
  
  async getAllEmailTemplatesByType(templateType: string): Promise<EmailTemplate[]> {
    const templates = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.templateType, templateType));
    
    return templates;
  }
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values(template)
      .returning();
    
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>, churchId?: string): Promise<EmailTemplate | undefined> {
    // Create base query
    let query = db
      .update(emailTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(emailTemplates.id, id));
    
    // Add churchId to query if provided
    if (churchId) {
      query = query.where(eq(emailTemplates.churchId, churchId));
    }
    
    // Execute the query and get the first result
    const [updatedTemplate] = await query.returning();
    
    console.log(`Updated template ID ${id} with churchId ${churchId || 'not specified'}`);
    
    return updatedTemplate;
  }
  
  async resetEmailTemplateToDefault(id: number, churchId: string): Promise<EmailTemplate | undefined> {
    // First, get the template to determine its type
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.churchId, churchId)
      ));
    
    if (!template) return undefined;
    
    // Create default template content based on type
    let defaultTemplate: Partial<InsertEmailTemplate> = {};
    
    switch (template.templateType) {
      case 'WELCOME_EMAIL':
        defaultTemplate = {
          subject: `Welcome to PlateSync`,
          bodyText: `
Dear {{firstName}} {{lastName}},

Welcome to PlateSync! You have been added as a user for {{churchName}}.

Please verify your email and set up your password by clicking the following link:
{{verificationUrl}}?token={{verificationToken}}

This link will expire in 48 hours.

If you did not request this account, you can safely ignore this email.

Sincerely,
The PlateSync Team
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Welcome to {{churchName}}</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>{{firstName}} {{lastName}}</strong>,</p>
    
    <p>Welcome to PlateSync! You have been added as a user for <strong>{{churchName}}</strong>.</p>
    
    <p>To complete your account setup, please verify your email and create a password by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}?token={{verificationToken}}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Verify Email & Set Password
      </a>
    </div>
    
    <p>This link will expire in 48 hours for security reasons.</p>
    
    <p>Once verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.</p>
    
    <p>If you did not request this account, you can safely ignore this email.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
          `
        };
        break;
        
      case 'PASSWORD_RESET':
        defaultTemplate = {
          subject: `PlateSync Password Reset Request`,
          bodyText: `
Hello,

We received a request to reset your password for your PlateSync account.

Please click on the following link to reset your password:
{{resetUrl}}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.

Sincerely,
The PlateSync Team
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Password Reset Request</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Hello,</p>
    
    <p>We received a request to reset the password for your PlateSync account.</p>
    
    <p>To set a new password, please click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    
    <p>If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
          `
        };
        break;
        
      case 'DONATION_CONFIRMATION':
        defaultTemplate = {
          subject: `Thank You for Your Donation to {{churchName}}`,
          bodyText: `
Dear {{donorName}},

Thank you for your donation of ${{amount}} on {{date}} to {{churchName}}.

Donation Details:
- Amount: ${{amount}}
- Date: {{date}}
- Donation ID: #{{donationId}}

Your generosity makes a difference! Your contribution helps us:
- Support outreach programs in our community
- Maintain our facilities and services
- Fund special ministries and programs
- Continue our mission work

This donation confirmation serves as your official receipt for tax purposes.

We are grateful for your continued support and commitment to our church family.

Blessings,
{{churchName}}

--
This is an automated receipt from {{churchName}} via PlateSync.
Please do not reply to this email. If you have any questions about your donation,
please contact the church office directly.
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #2D3748; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">{{churchName}}</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Donation Receipt</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>{{donorName}}</strong>,</p>
    
    <p>Thank you for your generous donation to {{churchName}}. Your support is a blessing to our church community and helps us continue our mission and ministry.</p>
    
    <!-- Donation Details Box -->
    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Donation Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #718096;">Amount:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{amount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Date:</td>
          <td style="padding: 8px 0;">{{date}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Receipt #:</td>
          <td style="padding: 8px 0;">{{donationId}}</td>
        </tr>
      </table>
    </div>
    
    <p>Your contribution will help us:</p>
    <ul style="padding-left: 20px; line-height: 1.6;">
      <li>Support outreach programs and assistance to those in need</li>
      <li>Maintain our facilities and services for worship</li>
      <li>Fund special ministries and programs</li>
      <li>Continue our mission work in our community and beyond</li>
    </ul>
    
    <p>This email serves as your official receipt for tax purposes.</p>
    
    <p>We are grateful for your continued support and commitment to our church family.</p>
    
    <p style="margin-bottom: 0;">Blessings,<br>
    <strong>{{churchName}}</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated receipt from {{churchName}} via PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email. If you have any questions about your donation, please contact the church office directly.</p>
  </div>
</div>
          `
        };
        break;
        
      case 'COUNT_REPORT':
        defaultTemplate = {
          subject: `Count Report: {{batchName}} - {{churchName}}`,
          bodyText: `
Dear {{recipientName}},

A count has been finalized for {{churchName}}.

Count Details:
- Count: {{batchName}}
- Date: {{batchDate}}
- Total Amount: ${{totalAmount}}
- Cash: ${{cashAmount}}
- Checks: ${{checkAmount}}
- Number of Donations: {{donationCount}}

This report is automatically generated by PlateSync when a count is finalized after attestation.

Sincerely,
PlateSync Reporting System
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">{{churchName}}</h1>
    <h2 style="margin: 10px 0 0; font-size: 18px; font-weight: bold;">Count Report</h2>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>{{recipientName}}</strong>,</p>
    
    <p>A count has been finalized for <strong>{{churchName}}</strong>.</p>
    
    <!-- Count Details Box -->
    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Count Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #718096;">Count Name:</td>
          <td style="padding: 8px 0;">{{batchName}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Date:</td>
          <td style="padding: 8px 0;">{{batchDate}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Total Amount:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">${{totalAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Cash:</td>
          <td style="padding: 8px 0;">${{cashAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Checks:</td>
          <td style="padding: 8px 0;">${{checkAmount}}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Number of Donations:</td>
          <td style="padding: 8px 0;">{{donationCount}}</td>
        </tr>
      </table>
    </div>
    
    <p>This report was automatically generated when the count was finalized after attestation.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>PlateSync Reporting System</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
          `
        };
        break;
        
      default:
        return undefined;
    }
    
    // Update the template with default values
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        ...defaultTemplate,
        updatedAt: new Date(),
      })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.churchId, churchId)
      ))
      .returning();
    
    return updatedTemplate;
  }
  
  // Planning Center operations
  async getPlanningCenterTokens(userId: string, churchId: string): Promise<PlanningCenterTokens | undefined> {
    try {
      const [tokens] = await db
        .select()
        .from(planningCenterTokens)
        .where(and(
          eq(planningCenterTokens.userId, userId),
          eq(planningCenterTokens.churchId, churchId)
        ))
        .limit(1);
      
      return tokens;
    } catch (error) {
      console.error("Error in getPlanningCenterTokens:", error);
      return undefined;
    }
  }
  
  async getPlanningCenterTokensByChurchId(churchId: string): Promise<PlanningCenterTokens | undefined> {
    try {
      console.log(`Looking for Planning Center tokens for church ID: ${churchId}`);
      
      // Find any token for this church - focusing only on church ID
      const [tokens] = await db
        .select()
        .from(planningCenterTokens)
        .where(eq(planningCenterTokens.churchId, churchId))
        .limit(1);
      
      if (tokens) {
        console.log(`Found Planning Center tokens for church ID: ${churchId} (belongs to user: ${tokens.userId})`);
      } else {
        console.log(`No Planning Center tokens found for church ID: ${churchId}`);
      }
      
      return tokens;
    } catch (error) {
      console.error("Error in getPlanningCenterTokensByChurchId:", error);
      return undefined;
    }
  }
  
  async clearPlanningCenterTokens(userId: string, churchId: string): Promise<void> {
    try {
      console.log(`Clearing Planning Center tokens for user ${userId} and church ${churchId}`);
      
      // Delete tokens from the database
      await db.delete(planningCenterTokens)
        .where(and(
          eq(planningCenterTokens.userId, userId),
          eq(planningCenterTokens.churchId, churchId)
        ));
        
      console.log('Planning Center tokens cleared successfully');
    } catch (error) {
      console.error('Error clearing Planning Center tokens:', error);
      throw error;
    }
  }

  async savePlanningCenterTokens(data: InsertPlanningCenterTokens): Promise<PlanningCenterTokens> {
    try {
      // Check if tokens already exist for this user/church
      const existingTokens = await this.getPlanningCenterTokens(data.userId, data.churchId);
      
      if (existingTokens) {
        // Update existing tokens
        const [updatedTokens] = await db
          .update(planningCenterTokens)
          .set({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresAt: data.expiresAt,
            updatedAt: new Date()
          })
          .where(eq(planningCenterTokens.id, existingTokens.id))
          .returning();
        
        return updatedTokens;
      } else {
        // Insert new tokens
        const [newTokens] = await db
          .insert(planningCenterTokens)
          .values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return newTokens;
      }
    } catch (error) {
      console.error("Error in savePlanningCenterTokens:", error);
      throw error;
    }
  }

  async deletePlanningCenterTokens(userId: string, churchId: string): Promise<void> {
    try {
      await db
        .delete(planningCenterTokens)
        .where(and(
          eq(planningCenterTokens.userId, userId),
          eq(planningCenterTokens.churchId, churchId)
        ));
    } catch (error) {
      console.error("Error in deletePlanningCenterTokens:", error);
      throw error;
    }
  }
  
  async updatePlanningCenterLastSync(userId: string, churchId: string): Promise<void> {
    try {
      await db
        .update(planningCenterTokens)
        .set({
          updatedAt: new Date(),
          lastSyncDate: new Date()
        })
        .where(and(
          eq(planningCenterTokens.userId, userId),
          eq(planningCenterTokens.churchId, churchId)
        ));
    } catch (error) {
      console.error("Error in updatePlanningCenterLastSync:", error);
      throw error;
    }
  }
  
  async updatePlanningCenterImportStats(churchId: string, peopleCount: number): Promise<void> {
    try {
      const now = new Date();
      // Update the tokens record for this church with the people count AND the lastSyncDate
      await db
        .update(planningCenterTokens)
        .set({
          peopleCount: peopleCount,
          lastSyncDate: now,
          updatedAt: now
        })
        .where(eq(planningCenterTokens.churchId, churchId));
        
      console.log(`Updated Planning Center stats for church ${churchId}: ${peopleCount} people available, lastSyncDate: ${now.toISOString()}`);
    } catch (error) {
      console.error("Error in updatePlanningCenterImportStats:", error);
      throw error;
    }
  }
  
  // Get CSV import stats for a church
  async getCsvImportStats(churchId: string): Promise<{ lastImportDate: Date | null; importCount: number; totalMembersImported: number; } | null> {
    try {
      const [stats] = await db
        .select()
        .from(csvImportStats)
        .where(eq(csvImportStats.churchId, churchId));
        
      if (!stats) {
        return null;
      }
      
      return {
        lastImportDate: stats.lastImportDate,
        importCount: stats.importCount,
        totalMembersImported: stats.totalMembersImported
      };
    } catch (error) {
      console.error("Error in getCsvImportStats:", error);
      return null;
    }
  }
  
  // Update CSV import stats for a church
  async updateCsvImportStats(userId: string, churchId: string, membersImported: number): Promise<void> {
    try {
      const now = new Date();
      
      // Check if an entry already exists for this church
      const [existingStats] = await db
        .select()
        .from(csvImportStats)
        .where(eq(csvImportStats.churchId, churchId));
        
      if (existingStats) {
        // Update existing entry
        await db
          .update(csvImportStats)
          .set({
            lastImportDate: now,
            importCount: existingStats.importCount + 1,
            totalMembersImported: existingStats.totalMembersImported + membersImported,
            updatedAt: now
          })
          .where(eq(csvImportStats.churchId, churchId));
          
        console.log(`Updated CSV import stats for church ${churchId}: ${membersImported} members imported, lastImportDate: ${now.toISOString()}`);
      } else {
        // Create new entry
        await db
          .insert(csvImportStats)
          .values({
            userId: userId,
            churchId: churchId,
            lastImportDate: now,
            importCount: 1,
            totalMembersImported: membersImported,
            createdAt: now,
            updatedAt: now
          });
          
        console.log(`Created CSV import stats for church ${churchId}: ${membersImported} members imported, lastImportDate: ${now.toISOString()}`);
      }
    } catch (error) {
      console.error("Error in updateCsvImportStats:", error);
      throw error;
    }
  }

  async bulkImportMembers(membersToImport: Array<Partial<InsertMember>>, churchId: string): Promise<number> {
    let importedCount = 0;
    
    try {
      // Process each member one by one
      for (const memberData of membersToImport) {
        // If the member has an externalId, check if they already exist
        if (memberData.externalId && memberData.externalSystem) {
          const [existingMember] = await db
            .select()
            .from(members)
            .where(and(
              eq(members.externalId, memberData.externalId),
              eq(members.externalSystem, memberData.externalSystem),
              eq(members.churchId, churchId)
            ))
            .limit(1);
          
          if (existingMember) {
            // Update existing member
            await db
              .update(members)
              .set({
                firstName: memberData.firstName || existingMember.firstName,
                lastName: memberData.lastName || existingMember.lastName,
                email: memberData.email || existingMember.email,
                phone: memberData.phone || existingMember.phone,
                notes: memberData.notes || existingMember.notes,
                updatedAt: new Date()
              })
              .where(eq(members.id, existingMember.id));
              
            importedCount++;
            continue;
          }
        }
        
        // If no external ID or member not found, check by name and email/phone if available
        // Or just by name if no contact info is available
        let existingMemberQuery = db
          .select()
          .from(members)
          .where(and(
            eq(members.firstName, memberData.firstName || ''),
            eq(members.lastName, memberData.lastName || ''),
            eq(members.churchId, churchId)
          ));
            
        // If we have email or phone, make the match more specific
        if (memberData.email || memberData.phone) {
          if (memberData.email) {
            existingMemberQuery = existingMemberQuery.where(eq(members.email, memberData.email));
          }
          if (memberData.phone) {
            existingMemberQuery = existingMemberQuery.where(eq(members.phone, memberData.phone || ''));
          }
        }
        
        const [existingMember] = await existingMemberQuery.limit(1);
        
        if (existingMember) {
          // Update existing member and add the external IDs
          await db
            .update(members)
            .set({
              externalId: memberData.externalId || existingMember.externalId,
              externalSystem: memberData.externalSystem || existingMember.externalSystem,
              phone: memberData.phone || existingMember.phone,
              notes: memberData.notes || existingMember.notes,
              updatedAt: new Date()
            })
            .where(eq(members.id, existingMember.id));
            
          importedCount++;
          continue;
        }
        
        // If we reach here, we need to create a new member
        if (memberData.firstName && memberData.lastName) {
          await db
            .insert(members)
            .values({
              firstName: memberData.firstName,
              lastName: memberData.lastName,
              email: memberData.email,
              phone: memberData.phone,
              notes: memberData.notes,
              isVisitor: memberData.isVisitor || false,
              externalId: memberData.externalId,
              externalSystem: memberData.externalSystem,
              churchId: churchId,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
          importedCount++;
        }
      }
      
      return importedCount;
    } catch (error) {
      console.error("Error in bulkImportMembers:", error);
      throw error;
    }
  }
  
  async removeDuplicateMembers(churchId: string): Promise<number> {
    try {
      // Find members with the same first and last name but no email or phone
      const query = sql`
        WITH duplicates AS (
          SELECT 
            id,
            ROW_NUMBER() OVER (
              PARTITION BY "first_name", "last_name", "church_id" 
              ORDER BY 
                CASE WHEN "external_id" IS NOT NULL THEN 0 ELSE 1 END,
                CASE WHEN "email" IS NOT NULL OR "phone" IS NOT NULL THEN 0 ELSE 1 END,
                "created_at"
            ) as row_num
          FROM 
            members
          WHERE 
            "church_id" = ${churchId}
            AND ("email" IS NULL OR "email" = '')
            AND ("phone" IS NULL OR "phone" = '')
        )
        DELETE FROM members
        WHERE id IN (
          SELECT id FROM duplicates WHERE row_num > 1
        )
        RETURNING id;
      `;
      
      const result = await db.execute(query);
      // The result will be an array of objects with the deleted IDs
      return Array.isArray(result) ? result.length : 0; // Return number of deleted duplicates
    } catch (error) {
      console.error("Error in removeDuplicateMembers:", error);
      throw error;
    }
  }

  // ========== Global Admin Church Management Functions ==========

  /**
   * Get all churches in the system (for Global Admin)
   */
  async getAllChurches(): Promise<Church[]> {
    try {
      return await db.select().from(churches).orderBy(churches.name);
    } catch (error) {
      console.error("Error fetching all churches:", error);
      return [];
    }
  }

  /**
   * Get a specific church by ID
   */
  async getChurch(id: string): Promise<Church | undefined> {
    try {
      const [church] = await db.select().from(churches).where(eq(churches.id, id));
      return church;
    } catch (error) {
      console.error(`Error fetching church with ID ${id}:`, error);
      return undefined;
    }
  }
  
  async getChurchesByAccountOwner(accountOwnerId: string): Promise<Church[]> {
    try {
      console.log(`Looking for churches with account owner ID: ${accountOwnerId}`);
      const churchResults = await db
        .select()
        .from(churches)
        .where(eq(churches.accountOwnerId, accountOwnerId))
        .orderBy(desc(churches.createdAt));
      
      console.log(`Found ${churchResults.length} churches for account owner ${accountOwnerId}`);
      return churchResults;
    } catch (error) {
      console.error(`Error getting churches for account owner ${accountOwnerId}:`, error);
      return [];
    }
  }

  /**
   * Get church with additional statistics
   */
  async getChurchWithStats(id: string): Promise<Church & { 
    totalMembers: number; 
    totalDonations: string;
    userCount: number;
    lastActivity: Date | null;
  } | undefined> {
    try {
      // Get the church record first
      const [church] = await db.select().from(churches).where(eq(churches.id, id));
      
      if (!church) return undefined;
      
      // Get member count for this church
      const [{ count: totalMembers }] = await db
        .select({ count: count() })
        .from(members)
        .where(eq(members.churchId, id));
      
      // Get total donations amount
      const [donationResult] = await db
        .select({ total: sql<string>`SUM(CAST(${donations.amount} AS DECIMAL(10,2)))` })
        .from(donations)
        .where(eq(donations.churchId, id));
      
      // Get user count
      const [{ count: userCount }] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.churchId, id));
      
      // Get last activity (most recent batch)
      const [lastBatch] = await db
        .select({ createdAt: batches.createdAt })
        .from(batches)
        .where(eq(batches.churchId, id))
        .orderBy(desc(batches.createdAt))
        .limit(1);
      
      return {
        ...church,
        totalMembers,
        totalDonations: donationResult?.total || "0.00",
        userCount,
        lastActivity: lastBatch?.createdAt || null
      };
    } catch (error) {
      console.error(`Error fetching church stats for ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Create a new church
   */
  async createChurch(churchData: InsertChurch, customId?: string): Promise<Church> {
    try {
      // Use provided ID or generate a new UUID
      const churchId = customId || crypto.randomUUID();
      
      const [church] = await db
        .insert(churches)
        .values({
          id: churchId,
          ...churchData
        })
        .returning();
      
      return church;
    } catch (error) {
      console.error("Error creating church:", error);
      throw error;
    }
  }

  /**
   * Update church details
   */
  async updateChurch(id: string, data: Partial<Church>): Promise<Church | undefined> {
    try {
      const [updatedChurch] = await db
        .update(churches)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(churches.id, id))
        .returning();
      
      return updatedChurch;
    } catch (error) {
      console.error(`Error updating church with ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Suspend a church
   */
  async suspendChurch(id: string): Promise<Church | undefined> {
    try {
      const [suspendedChurch] = await db
        .update(churches)
        .set({
          status: "SUSPENDED",
          updatedAt: new Date()
        })
        .where(eq(churches.id, id))
        .returning();
      
      return suspendedChurch;
    } catch (error) {
      console.error(`Error suspending church with ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Activate a previously suspended church
   */
  async activateChurch(id: string): Promise<Church | undefined> {
    try {
      const [activatedChurch] = await db
        .update(churches)
        .set({
          status: "ACTIVE",
          updatedAt: new Date()
        })
        .where(eq(churches.id, id))
        .returning();
      
      return activatedChurch;
    } catch (error) {
      console.error(`Error activating church with ID ${id}:`, error);
      return undefined;
    }
  }

  /**
   * Delete a church (mark as deleted and archive data)
   */
  async deleteChurch(id: string): Promise<{ archiveUrl: string | null }> {
    try {
      // In a production system, we would:
      // 1. Export all church data to a file
      // 2. Store it somewhere (S3, etc.)
      // 3. Mark the church as DELETED
      // 4. Optionally perform soft-delete of associated records

      // For now, just mark as deleted
      const [deletedChurch] = await db
        .update(churches)
        .set({
          status: "DELETED",
          deletedAt: new Date(),
          updatedAt: new Date(),
          // In a real implementation, store the archive URL
          archiveUrl: null 
        })
        .where(eq(churches.id, id))
        .returning();
      
      return { archiveUrl: deletedChurch.archiveUrl };
    } catch (error) {
      console.error(`Error deleting church with ID ${id}:`, error);
      return { archiveUrl: null };
    }
  }

  /**
   * Migrate existing church data to new churches table
   */
  async migrateDataToNewChurchTable(): Promise<number> {
    try {
      // Get unique churchIds from the users table where role is ACCOUNT_OWNER
      const accountOwners = await db
        .select({
          id: users.id,
          churchId: users.churchId,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.role, "ACCOUNT_OWNER"))
        .orderBy(users.churchId);
      
      let migratedCount = 0;
      
      // For each church, create a church record if it doesn't exist
      for (const owner of accountOwners) {
        if (!owner.churchId) continue;
        
        // Check if church already exists
        const [existingChurch] = await db
          .select()
          .from(churches)
          .where(eq(churches.id, owner.churchId));
        
        if (!existingChurch) {
          // Create new church record
          await db.insert(churches).values({
            id: owner.churchId,
            name: `${owner.firstName || ''} ${owner.lastName || ''}`.trim() + "'s Church",
            contactEmail: owner.email,
            status: "ACTIVE",
            accountOwnerId: owner.id,
          });
          
          migratedCount++;
        }
      }
      
      return migratedCount;
    } catch (error) {
      console.error("Error migrating to church table:", error);
      return 0;
    }
  }
  
  // Subscription operations
  async getSubscription(churchId: string): Promise<Subscription | undefined> {
    try {
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.churchId, churchId));
      
      return subscription;
    } catch (error) {
      console.error("Error getting subscription:", error);
      return undefined;
    }
  }
  
  async createSubscription(subscriptionData: InsertSubscription): Promise<Subscription> {
    try {
      // Calculate the trial end date (30 days from now) if not provided
      const now = new Date();
      const trialEndDate = new Date(now);
      trialEndDate.setDate(trialEndDate.getDate() + 30);
      
      const [subscription] = await db
        .insert(subscriptions)
        .values({
          ...subscriptionData,
          trialEndDate: subscriptionData.trialEndDate || trialEndDate
        })
        .returning();
        
      return subscription;
    } catch (error) {
      console.error("Error creating subscription:", error);
      throw error;
    }
  }
  
  async updateSubscription(churchId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    try {
      // Update the subscription data
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(subscriptions.churchId, churchId))
        .returning();
        
      return updatedSubscription;
    } catch (error) {
      console.error("Error updating subscription:", error);
      return undefined;
    }
  }
  
  async updateSubscriptionStatus(churchId: string, data: Partial<Subscription>): Promise<Subscription | undefined> {
    try {
      // This method is an alias for updateSubscription with additional logging specific to status updates
      console.log(`Updating subscription status for church ${churchId}:`, JSON.stringify(data));
      
      // First check if subscription exists
      const existingSubscription = await this.getSubscription(churchId);
      
      if (!existingSubscription) {
        console.log(`No subscription found for church ${churchId}, creating a new one`);
        // Create new subscription if it doesn't exist
        return await this.createSubscription({
          churchId,
          status: data.status || 'ACTIVE',
          plan: data.plan || 'MONTHLY',
          trialStartDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          trialEndDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago (trial already ended)
          startDate: data.startDate || new Date(),
          endDate: data.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days by default
          stripeCustomerId: null,
          stripeSubscriptionId: null
        });
      }
      
      // Update the existing subscription
      return await this.updateSubscription(churchId, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating subscription status:", error);
      return undefined;
    }
  }
  
  async checkSubscriptionStatus(churchId: string): Promise<{
    isActive: boolean;
    isTrialExpired: boolean;
    status: string;
    daysRemaining: number | null;
    trialEndDate: Date | null;
  }> {
    try {
      const subscription = await this.getSubscription(churchId);
      
      if (!subscription) {
        return {
          isActive: false,
          isTrialExpired: true,
          status: "NO_SUBSCRIPTION",
          daysRemaining: null,
          trialEndDate: null
        };
      }
      
      const now = new Date();
      let isActive = true;
      let isTrialExpired = false;
      let daysRemaining: number | null = null;
      
      // Check if it's a trial subscription
      if (subscription.status === "TRIAL") {
        const trialEndDate = new Date(subscription.trialEndDate);
        daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Trial is expired if days remaining is less than or equal to 0
        isTrialExpired = daysRemaining <= 0;
        isActive = !isTrialExpired;
      } else if (subscription.status === "ACTIVE") {
        // Paid subscription
        isActive = true;
        isTrialExpired = true;
      } else {
        // Expired or canceled subscriptions
        isActive = false;
        isTrialExpired = true;
      }
      
      return {
        isActive,
        isTrialExpired,
        status: subscription.status,
        daysRemaining,
        trialEndDate: subscription.trialEndDate
      };
    } catch (error) {
      console.error("Error checking subscription status:", error);
      // Default to inactive when there's an error
      return {
        isActive: false,
        isTrialExpired: true,
        status: "ERROR",
        daysRemaining: null,
        trialEndDate: null
      };
    }
  }
  
  async upgradeSubscription(churchId: string, plan: string, stripeData?: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<Subscription | undefined> {
    try {
      const now = new Date();
      
      // Update the subscription with paid plan info
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          plan,
          status: "ACTIVE",
          startDate: now,
          stripeCustomerId: stripeData?.stripeCustomerId,
          stripeSubscriptionId: stripeData?.stripeSubscriptionId,
          updatedAt: now
        })
        .where(eq(subscriptions.churchId, churchId))
        .returning();
        
      return updatedSubscription;
    } catch (error) {
      console.error("Error upgrading subscription:", error);
      return undefined;
    }
  }
  
  async cancelSubscription(churchId: string): Promise<Subscription | undefined> {
    try {
      const now = new Date();
      
      // Update the subscription to canceled status
      const [canceledSubscription] = await db
        .update(subscriptions)
        .set({
          status: "CANCELED",
          canceledAt: now,
          updatedAt: now
        })
        .where(eq(subscriptions.churchId, churchId))
        .returning();
        
      return canceledSubscription;
    } catch (error) {
      console.error("Error canceling subscription:", error);
      return undefined;
    }
  }
  // System configuration methods
  async getSystemConfig(key: string): Promise<string | null> {
    try {
      console.log(`Fetching system config for key: ${key}`);
      const configs = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
      
      if (configs && configs.length > 0) {
        console.log(`Found system config for key ${key}`);
        return configs[0]?.value || null;
      } else {
        console.log(`No system config found for key ${key}`);
        return null;
      }
    } catch (error) {
      console.error(`Error getting system config for key ${key}:`, error);
      return null;
    }
  }

  async setSystemConfig(key: string, value: string): Promise<void> {
    try {
      console.log(`Setting system config: key=${key}, value=${value.substring(0, 5)}...`);
      
      // First check if the config exists
      const existing = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
      
      if (existing && existing.length > 0) {
        console.log(`Config exists for key ${key}, updating...`);
        await db.update(systemConfig)
          .set({ 
            value,
            updatedAt: new Date()
          })
          .where(eq(systemConfig.key, key));
      } else {
        console.log(`Config does not exist for key ${key}, inserting new record...`);
        await db.insert(systemConfig)
          .values({ 
            key, 
            value,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
      console.log(`Successfully saved config for key ${key}`);
    } catch (error) {
      console.error(`Error setting system config for key ${key}:`, error);
      throw error;
    }
  }
  
  async updateSystemConfig(configData: { key: string; value: string }[]): Promise<void> {
    try {
      console.log(`Updating multiple system config values (${configData.length} items)`);
      
      // Process each config item in sequence
      for (const item of configData) {
        const { key, value } = item;
        
        // Only process if key is provided
        if (!key) {
          console.warn('Skipping config item with missing key');
          continue;
        }
        
        // For security, don't log the full value
        const logValue = value ? 
          (value.length > 10 ? `${value.substring(0, 5)}...` : '[empty]') : 
          '[null]';
        
        console.log(`Processing config: key=${key}, value=${logValue}`);
        
        // If value is null, skip updating this key
        if (value === null) {
          console.log(`Skipping update for key ${key} as value is null`);
          continue;
        }
        
        // Use the existing setSystemConfig method to handle each item
        await this.setSystemConfig(key, value);
      }
      
      console.log(`Successfully updated all system config values`);
    } catch (error) {
      console.error(`Error updating system config:`, error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();
