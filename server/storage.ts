import * as crypto from 'crypto';
import {
  users,
  members,
  donations,
  batches,
  serviceOptions,
  reportRecipients,
  emailTemplates,
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
  type InsertEmailTemplate
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, sum, count, asc } from "drizzle-orm";
import { format } from "date-fns";

// Interface for storage operations
export interface IStorage {
  // User operations (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUsers(churchId: string): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(id: string, data: Partial<User>): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  createUser(userData: Partial<UpsertUser> & { churchId?: string }): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
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
  getEmailTemplateByType(templateType: string, churchId: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>, churchId: string): Promise<EmailTemplate | undefined>;
  resetEmailTemplateToDefault(id: number, churchId: string): Promise<EmailTemplate | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUsers(churchId: string): Promise<User[]> {
    // Currently, we only need to get users from the same church
    // In a multi-tenant environment, this would be filtered by a tenant or church ID
    return db
      .select()
      .from(users)
      .orderBy(desc(users.username));
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
  
  async updateUserRole(id: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    
    return updatedUser;
  }
  
  async createUser(userData: Partial<UpsertUser> & { churchId?: string }): Promise<User> {
    // Generate a unique ID for the user if not provided
    const userId = userData.id || Math.floor(Math.random() * 1000000000).toString();
    
    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Create data object without churchId
    const { churchId, ...userDataToInsert } = userData;
    
    // Token will expire in 48 hours
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 48);
    
    // Generate a random username if not provided (this is for backward compatibility)
    const username = userData.username || userData.email?.split('@')[0] || `user_${userId}`;
    
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
        role: userData.role || 'USHER',
        createdAt: new Date(),
        updatedAt: new Date(),
        churchName: userData.churchName || null,
        emailNotificationsEnabled: userData.emailNotificationsEnabled !== undefined ? userData.emailNotificationsEnabled : true,
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        isVerified: false,
      })
      .returning();
    
    return newUser;
  }
  
  async deleteUser(id: string): Promise<void> {
    await db
      .delete(users)
      .where(eq(users.id, id));
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
    // First, delete all donations associated with this batch
    await db
      .delete(donations)
      .where(and(
        eq(donations.batchId, id),
        eq(donations.churchId, churchId)
      ));
    
    // Then delete the batch itself
    await db
      .delete(batches)
      .where(and(
        eq(batches.id, id),
        eq(batches.churchId, churchId)
      ));
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
    
    return finalizedBatch;
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
  
  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values(template)
      .returning();
    
    return newTemplate;
  }
  
  async updateEmailTemplate(id: number, data: Partial<InsertEmailTemplate>, churchId: string): Promise<EmailTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(emailTemplates.id, id),
        eq(emailTemplates.churchId, churchId)
      ))
      .returning();
    
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
    <p style="margin: 10px 0 0; font-size: 18px;">Count Report</p>
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
}

export const storage = new DatabaseStorage();
