import {
  users,
  members,
  donations,
  batches,
  serviceOptions,
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
  type InsertServiceOption
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql, sum, count } from "drizzle-orm";
import { format } from "date-fns";

// Interface for storage operations
export interface IStorage {
  // User operations (for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSettings(id: string, data: Partial<User>): Promise<User>;
  
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
  getCurrentBatch(churchId: string): Promise<Batch | undefined>;
  
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
  
  // Dashboard statistics
  getTodaysDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getWeeklyDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getMonthlyDonations(churchId: string): Promise<{ total: string, percentChange: number }>;
  getActiveDonorCount(churchId: string): Promise<{ count: number, newCount: number }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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
        .where(eq(serviceOptions.churchId, optionData.churchId));
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
        .where(and(
          eq(serviceOptions.churchId, churchId),
          sql`${serviceOptions.id} != ${id}`
        ));
    }
    
    const [updatedOption] = await db
      .update(serviceOptions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(
        eq(serviceOptions.id, id),
        eq(serviceOptions.churchId, churchId)
      ))
      .returning();
    
    return updatedOption;
  }

  async deleteServiceOption(id: number, churchId: string): Promise<void> {
    await db
      .delete(serviceOptions)
      .where(and(
        eq(serviceOptions.id, id),
        eq(serviceOptions.churchId, churchId)
      ));
  }
}

export const storage = new DatabaseStorage();
