import express from "express";
import { Router } from "express";
import { db } from "../db";
import { churches, users, members, donations, subscriptions, batches } from "@shared/schema";
import { validateSchema } from "../middleware/validationMiddleware";
import { eq, desc, and, asc, SQL, ilike, sql, ne, count, sum, gte } from "drizzle-orm";
import { z } from "zod";
import { generateId, scryptHash, verifyPassword, generateToken } from "../util";
import { requireGlobalAdmin } from "../middleware/globalAdminMiddleware";
import * as XLSX from "xlsx";

const router = Router();

// Authentication schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const createChurchSchema = z.object({
  name: z.string().min(3, "Church name must be at least 3 characters"),
  contactEmail: z.string().email("Please enter a valid email address"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
});

const updateChurchStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
});

// Global Admin login endpoint
router.post("/login", validateSchema(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find the user with matching email who is a global admin
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.role, "GLOBAL_ADMIN")
        )
      );
    
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Verify the password
    const isPasswordValid = await verifyPassword(password, user.password || "");
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    
    // Generate a JWT token for the global admin with 7-day expiration
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: "GLOBAL_ADMIN",
    }, "7d");
    
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      }
    });
  } catch (error) {
    console.error("Global admin login error:", error);
    res.status(500).json({ message: "An error occurred during login" });
  }
});

// Get all churches for global admin dashboard
router.get("/churches", requireGlobalAdmin, async (req, res) => {
  try {
    // Get query parameters for pagination, search, and filters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || "";
    const status = (req.query.status as string) || null;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? asc : desc;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    let conditions: SQL[] = [];
    
    // Filter by status if provided, otherwise default to ACTIVE
    if (status) {
      conditions.push(eq(churches.status, status));
    } else {
      conditions.push(eq(churches.status, 'ACTIVE'));
    }
    
    if (search) {
      conditions.push(ilike(churches.name, `%${search}%`));
    }
    
    // Get all churches with pagination, search, and sorting
    const churchesList = await db
      .select({
        id: churches.id,
        name: churches.name,
        status: churches.status,
        createdAt: churches.createdAt,
        updatedAt: churches.updatedAt,
      })
      .from(churches)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortBy === "name" ? churches.name : churches.createdAt)
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const [{ count }] = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(churches)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
    
    // For each church, get additional statistics
    const churchesWithStats = await Promise.all(
      churchesList.map(async (church) => {
        // Get user count for this church (excluding GLOBAL_ADMIN users and INACTIVE users)
        // Use parameterized SQL to prevent injection attacks
        const userCountResult = await db.$client.query(
          `SELECT COUNT(*) as "userCount" FROM users WHERE church_id = $1 AND role != 'GLOBAL_ADMIN' AND (email IS NULL OR email NOT LIKE 'INACTIVE_%')`,
          [church.id]
        );
        const userCount = parseInt(userCountResult.rows[0]?.userCount || '0');
        
        // Use parameterized SQL to get member count for this church safely
        const memberResult = await db.$client.query(
          `SELECT COUNT(*) as "memberCount" FROM members WHERE church_id = $1`,
          [church.id]
        );
        const memberCount = parseInt(memberResult.rows?.[0]?.memberCount || '0');
        
        // Use parameterized SQL to get total donations for this church safely
        const donationResult = await db.$client.query(
          `SELECT COALESCE(SUM(amount)::text, '0.00') as "donationSum" FROM donations WHERE church_id = $1`,
          [church.id]
        );
        const donationSum = donationResult.rows?.[0]?.donationSum || '0.00';
          
        // Use parameterized SQL to get the most recent login date (using updatedAt as a proxy) from any user in this church
        const userLoginResult = await db.$client.query(
          `SELECT updated_at FROM users WHERE church_id = $1 ORDER BY updated_at DESC LIMIT 1`,
          [church.id]
        );
        
        // If no users have logged in recently, fall back to the church's updated_at date
        const lastLoginDate = userLoginResult?.rows?.[0]?.updated_at 
          ? new Date(userLoginResult.rows[0].updated_at) 
          : church.updatedAt;
        
        return {
          ...church,
          userCount,
          totalMembers: memberCount,
          totalDonations: donationSum,
          lastActivity: lastLoginDate ? lastLoginDate.toISOString() : null,
        };
      })
    );
    
    res.status(200).json({
      churches: churchesWithStats,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching churches:", error);
    res.status(500).json({ message: "Failed to fetch churches" });
  }
});

// Get a single church by ID with detailed information
router.get("/churches/:id", requireGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Input validation to prevent SQL injection
    if (!id || typeof id !== 'string' || id.trim() === '') {
      return res.status(400).json({ message: "Invalid church ID" });
    }
    
    // Get the church details using parameterized query to prevent SQL injection
    const churchResult = await db.execute(
      sql`SELECT * FROM churches WHERE id = ${id} LIMIT 1`
    );
    
    const church = churchResult.rows?.[0];
    
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Get active user count (excluding GLOBAL_ADMIN users and INACTIVE users)
    const userResult = await db.execute(
      sql`SELECT COUNT(*) as "userCount" FROM users WHERE church_id = ${id} AND role != 'GLOBAL_ADMIN' AND (email IS NULL OR email NOT LIKE 'INACTIVE_%')`
    );
    const userCount = parseInt(String(userResult.rows[0]?.userCount || '0'));
      
    // Get members count  
    const membersResult = await db.execute(
      sql`SELECT COUNT(*) as "totalMembers" FROM members WHERE church_id = ${id}`
    );
    const totalMembers = parseInt(String(membersResult.rows[0]?.totalMembers || '0'));
      
    // Get total donations
    const donationsResult = await db.execute(
      sql`SELECT SUM(amount) as "totalDonations" FROM donations WHERE church_id = ${id}`
    );
    const totalDonations = donationsResult.rows[0]?.totalDonations || '0.00';

    // Get Account Owner's email for contact email
    const accountOwnerResult = await db.execute(
      sql`SELECT email FROM users WHERE church_id = ${id} AND (role = 'ACCOUNT_OWNER' OR is_account_owner = true) AND (email IS NULL OR email NOT LIKE 'INACTIVE_%') LIMIT 1`
    );
    const contactEmail = accountOwnerResult.rows[0]?.email || church.contact_email;

    // Get Account Owner's registration date for Created On
    const accountOwnerCreatedResult = await db.execute(
      sql`SELECT created_at FROM users WHERE church_id = ${id} AND (role = 'ACCOUNT_OWNER' OR is_account_owner = true) AND (email IS NULL OR email NOT LIKE 'INACTIVE_%') ORDER BY created_at ASC LIMIT 1`
    );
    const createdOn = accountOwnerCreatedResult.rows[0]?.created_at || church.created_at;

    // Get most recent finalized count date for Last Updated
    const lastFinalizedResult = await db.execute(
      sql`SELECT MAX(attestation_confirmation_date) as last_finalized FROM batches WHERE church_id = ${id} AND status = 'FINALIZED'`
    );
    const lastUpdated = lastFinalizedResult.rows[0]?.last_finalized || church.updated_at;
    
    res.status(200).json({
      ...church,
      userCount,
      totalMembers,
      totalDonations,
      contactEmail,
      createdOn,
      lastUpdated,
    });
  } catch (error) {
    console.error("Error fetching church:", error);
    res.status(500).json({ message: "Failed to fetch church details" });
  }
});

// Create a new church
router.post("/churches", requireGlobalAdmin, validateSchema(createChurchSchema), async (req, res) => {
  try {
    const { 
      name, 
      contactEmail, 
      adminEmail, 
      adminFirstName, 
      adminLastName, 
      adminPassword 
    } = req.body;
    
    // Start a transaction to create both church and admin user
    const churchId = generateId("church_");
    
    // Create the church
    await db.insert(churches).values({
      id: churchId,
      name,
      contactEmail,
      status: "ACTIVE",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Create the admin user for the church
    const userId = generateId("user_");
    const hashedPassword = await scryptHash(adminPassword);
    
    await db.insert(users).values({
      id: userId,
      email: adminEmail,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: "ADMIN",
      password: hashedPassword,
      churchId,
      churchName: name,
      isActive: true,
      isVerified: true,
      isAccountOwner: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    res.status(201).json({
      message: "Church and admin created successfully",
      churchId,
      adminId: userId
    });
  } catch (error) {
    console.error("Error creating church:", error);
    res.status(500).json({ message: "Failed to create church" });
  }
});

// Update a church's status
router.patch("/churches/:id/status", requireGlobalAdmin, validateSchema(updateChurchStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if the church exists
    const [existingChurch] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
    
    if (!existingChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Update the church status
    await db
      .update(churches)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(churches.id, id));
    
    res.status(200).json({
      message: `Church status updated to ${status}`,
      churchId: id,
      status
    });
  } catch (error) {
    console.error("Error updating church status:", error);
    res.status(500).json({ message: "Failed to update church status" });
  }
});

// Purge church data - completely delete church and all associated data
router.delete("/churches/:id/purge", requireGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the church exists
    const [existingChurch] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
    
    if (!existingChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Start a transaction to ensure all deletions succeed or fail together
    await db.execute(`BEGIN`);
    
    try {
      // Get users associated with church (needed for later deletions)
      const usersResult = await db.execute(
        `SELECT id FROM users WHERE church_id = '${id}'`
      );
      const userIds = usersResult.rows.map(user => user.id);
      const userIdsForQuery = userIds.length > 0 ? userIds.map(id => `'${id}'`).join(',') : "'0'";
      
      console.log(`Purging church ${id} and ${userIds.length} associated users`);
      
      // Delete verification codes for this church
      await db.execute(
        `DELETE FROM verification_codes WHERE church_id = '${id}'`
      );
      console.log(`Deleted verification codes for church`);
      
      // Delete planning center tokens
      await db.execute(
        `DELETE FROM planning_center_tokens WHERE church_id = '${id}'`
      );
      console.log(`Deleted planning center tokens`);
      
      // Delete subscription data
      await db.execute(
        `DELETE FROM subscriptions WHERE church_id = '${id}'`
      );
      console.log(`Deleted subscriptions`);
      
      // Delete service options
      await db.execute(
        `DELETE FROM service_options WHERE church_id = '${id}'`
      );
      console.log(`Deleted service options`);
      
      // Delete report recipients
      await db.execute(
        `DELETE FROM report_recipients WHERE church_id = '${id}'`
      );
      console.log(`Deleted report recipients`);
      
      // Delete email templates for this church
      await db.execute(
        `DELETE FROM email_templates WHERE church_id = '${id}'`
      );
      console.log(`Deleted email templates`);
      
      // Delete donations first to maintain referential integrity
      await db.execute(
        `DELETE FROM donations WHERE church_id = '${id}'`
      );
      console.log(`Deleted donations`);
      
      // Delete batches
      await db.execute(
        `DELETE FROM batches WHERE church_id = '${id}'`
      );
      console.log(`Deleted batches`);
      
      // Delete members
      await db.execute(
        `DELETE FROM members WHERE church_id = '${id}'`
      );
      console.log(`Deleted members`);
      
      // First get the church details for account_owner_id
      const churchDetails = await db.execute(
        `SELECT * FROM churches WHERE id = '${id}'`
      );
      
      // Set account_owner_id to NULL to remove foreign key constraint
      await db.execute(
        `UPDATE churches SET account_owner_id = NULL WHERE id = '${id}'`
      );
      console.log(`Removed account owner reference`);
      
      // Delete sessions associated with users
      // The sessions table stores session data in JSON format
      if (userIds.length > 0) {
        await db.execute(
          `DELETE FROM sessions WHERE sess::jsonb->'user'->>'id' IN (${userIdsForQuery})`
        );
        console.log(`Deleted user sessions`);
      }
      
      // Now delete users associated with the church
      await db.execute(
        `DELETE FROM users WHERE church_id = '${id}'`
      );
      console.log(`Deleted users`);
      
      // Finally, delete the church itself
      await db.execute(
        `DELETE FROM churches WHERE id = '${id}'`
      );
      console.log(`Deleted church entity`);
      
      // Commit the transaction
      await db.execute(`COMMIT`);
      
      res.status(200).json({
        message: "Church and all associated data purged successfully",
        churchId: id
      });
      
    } catch (error) {
      // Rollback the transaction if any queries fail
      await db.execute(`ROLLBACK`);
      console.error("Error in purge transaction:", error);
      throw error;
    }
    
  } catch (error) {
    console.error("Error purging church data:", error);
    res.status(500).json({ message: "Failed to purge church data" });
  }
});

// Get users for a specific church
router.get("/churches/:id/users", requireGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the church exists
    const [existingChurch] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
    
    if (!existingChurch) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Use a raw SQL query with string interpolation for consistency
    // Exclude GLOBAL_ADMIN users and INACTIVE users from the church users list
    const result = await db.execute(
      `SELECT id, email, first_name AS "firstName", last_name AS "lastName", 
              role, is_verified AS "isVerified", is_account_owner AS "isAccountOwner", 
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE church_id = '${id}' AND role != 'GLOBAL_ADMIN' 
       AND (email IS NULL OR email NOT LIKE 'INACTIVE_%')
       ORDER BY created_at DESC`
    );
    
    const churchUsers = result.rows || [];
    
    res.status(200).json(churchUsers);
  } catch (error) {
    console.error("Error fetching church users:", error);
    res.status(500).json({ message: "Failed to fetch church users" });
  }
});

// Reports analytics endpoint - fetches detailed data for Global Admin reports
router.get("/reports/analytics", requireGlobalAdmin, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Convert period to SQL interval
    let interval = '30 days';
    switch (period) {
      case '7days': interval = '7 days'; break;
      case '30days': interval = '30 days'; break;
      case '90days': interval = '90 days'; break;
      case '6months': interval = '6 months'; break;
    }

    // Get revenue data by subscription type and month
    const revenueData = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        plan,
        COUNT(*) as subscription_count,
        CASE 
          WHEN plan = 'MONTHLY' THEN COUNT(*) * 2.99
          WHEN plan = 'ANNUAL' THEN COUNT(*) * 25.00
          ELSE 0
        END as revenue
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
        AND plan IN ('MONTHLY', 'ANNUAL')
      GROUP BY DATE_TRUNC('month', created_at), plan
      ORDER BY month
    `);

    // Get detailed church statistics
    const detailedChurchStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_churches,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_churches,
        COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END) as suspended_churches,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${sql.raw(interval)}' THEN 1 END) as new_churches
      FROM churches
    `);

    // Get user growth statistics
    const userGrowthStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${sql.raw(interval)}' THEN 1 END) as new_users,
        COUNT(CASE WHEN role = 'ACCOUNT_OWNER' THEN 1 END) as account_owners,
        COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as admins
      FROM users
      WHERE role != 'GLOBAL_ADMIN'
    `);

    // Get subscription summary
    const subscriptionSummary = await db.execute(sql`
      SELECT 
        plan,
        status,
        COUNT(*) as count,
        CASE 
          WHEN plan = 'MONTHLY' THEN COUNT(*) * 2.99
          WHEN plan = 'ANNUAL' THEN COUNT(*) * 25.00
          ELSE 0
        END as total_revenue
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
      GROUP BY plan, status
    `);

    res.json({
      period,
      revenueData: revenueData.rows || [],
      churchStats: detailedChurchStats.rows[0] || {},
      userStats: userGrowthStats.rows[0] || {},
      subscriptionSummary: subscriptionSummary.rows || []
    });
  } catch (error) {
    console.error("Error fetching reports analytics:", error);
    res.status(500).json({ message: "Failed to fetch reports analytics" });
  }
});

// Dashboard analytics endpoint - fetches real data for Global Admin dashboard
router.get("/dashboard/analytics", requireGlobalAdmin, async (req, res) => {
  try {
    // Get church statistics
    const churchStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_churches,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_churches,
        COUNT(CASE WHEN status = 'SUSPENDED' THEN 1 END) as suspended_churches,
        COUNT(CASE WHEN status = 'DELETED' THEN 1 END) as deleted_churches
      FROM churches
    `);

    // Get subscription statistics
    const subscriptionStats = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN plan = 'TRIAL' THEN 1 END) as trial_subscriptions,
        COUNT(CASE WHEN plan = 'MONTHLY' THEN 1 END) as monthly_subscriptions,
        COUNT(CASE WHEN plan = 'ANNUAL' THEN 1 END) as annual_subscriptions,
        COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_subscriptions,
        COUNT(CASE WHEN status = 'TRIAL' THEN 1 END) as trial_active
      FROM subscriptions
    `);
    
    console.log("Raw subscription stats from DB:", subscriptionStats.rows[0]);

    // Get donation statistics
    const donationStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_donations,
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT church_id) as churches_with_donations
      FROM donations
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get batch statistics
    const batchStats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_batches,
        COUNT(CASE WHEN status = 'FINALIZED' THEN 1 END) as finalized_batches,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_batches
      FROM batches
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `);

    // Get monthly subscription trends (last 6 months)
    const subscriptionTrends = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(CASE WHEN plan = 'TRIAL' THEN 1 END) as trial_count,
        COUNT(CASE WHEN plan IN ('MONTHLY', 'ANNUAL') THEN 1 END) as paid_count
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    // Calculate conversion rates (trials that became paid subscriptions)
    const conversionRates = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', s1.created_at) as month,
        COUNT(CASE WHEN s1.plan = 'TRIAL' THEN 1 END) as trial_starts,
        COUNT(CASE WHEN s1.plan = 'TRIAL' AND s2.id IS NOT NULL THEN 1 END) as conversions
      FROM subscriptions s1
      LEFT JOIN subscriptions s2 ON s1.church_id = s2.church_id 
        AND s2.plan IN ('MONTHLY', 'ANNUAL') 
        AND s2.created_at > s1.created_at
      WHERE s1.created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', s1.created_at)
      ORDER BY month
    `);

    // Calculate churn rates (subscriptions that were canceled or expired)
    const churnRates = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(CASE WHEN plan IN ('MONTHLY', 'ANNUAL') THEN 1 END) as total_paid,
        COUNT(CASE WHEN plan IN ('MONTHLY', 'ANNUAL') AND canceled_at IS NOT NULL THEN 1 END) as churned,
        COUNT(CASE WHEN plan = 'TRIAL' AND status = 'EXPIRED' THEN 1 END) as trial_expired
      FROM subscriptions
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    // Get donation trends (last 6 months)
    const donationTrends = await db.execute(sql`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as donation_count,
        COALESCE(SUM(amount), 0) as total_amount
      FROM donations
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `);

    // Format the data for frontend consumption
    const analytics = {
      churchStats: churchStats.rows[0] || {
        total_churches: 0,
        active_churches: 0,
        suspended_churches: 0,
        deleted_churches: 0
      },
      subscriptionStats: {
        trial_subscriptions: parseInt(String(subscriptionStats.rows[0]?.trial_subscriptions)) || 0,
        monthly_subscriptions: parseInt(String(subscriptionStats.rows[0]?.monthly_subscriptions)) || 0,
        annual_subscriptions: parseInt(String(subscriptionStats.rows[0]?.annual_subscriptions)) || 0,
        active_subscriptions: parseInt(String(subscriptionStats.rows[0]?.active_subscriptions)) || 0,
        trial_active: parseInt(String(subscriptionStats.rows[0]?.trial_active)) || 0
      },
      donationStats: donationStats.rows[0] || {
        total_donations: 0,
        total_amount: 0,
        churches_with_donations: 0
      },
      batchStats: batchStats.rows[0] || {
        total_batches: 0,
        finalized_batches: 0,
        open_batches: 0
      },
      subscriptionTrends: subscriptionTrends.rows || [],
      conversionRates: conversionRates.rows || [],
      churnRates: churnRates.rows || []
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error);
    res.status(500).json({ message: "Failed to fetch dashboard analytics" });
  }
});

// Global admin logout endpoint
router.get("/logout", (req, res) => {
  // In a real implementation, we might blacklist the token
  // For now, just redirect to the login page
  res.redirect("/global-admin/login");
});

// We'll add the profile avatar endpoint later when mounted in routes.ts
// Using the same avatarUpload middleware

// Excel export endpoints
router.get("/reports/export/churches", requireGlobalAdmin, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Convert period to SQL interval
    let interval = '30 days';
    switch (period) {
      case '7days': interval = '7 days'; break;
      case '30days': interval = '30 days'; break;
      case '90days': interval = '90 days'; break;
      case '6months': interval = '6 months'; break;
    }

    // Get detailed church data
    const churchData = await db.execute(sql`
      SELECT 
        c.id,
        c.name,
        c.contact_email,
        c.status,
        c.created_at,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT s.id) as subscription_count,
        COALESCE(SUM(d.amount), 0) as total_donations
      FROM churches c
      LEFT JOIN users u ON u.church_id = c.id
      LEFT JOIN subscriptions s ON s.church_id = c.id
      LEFT JOIN donations d ON d.church_id = c.id 
        AND d.created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
      WHERE c.created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
      GROUP BY c.id, c.name, c.contact_email, c.status, c.created_at
      ORDER BY c.created_at DESC
    `);

    // Format data for Excel
    const excelData = churchData.rows.map((church: any) => ({
      'Church ID': church.id,
      'Church Name': church.name,
      'Contact Email': church.contact_email,
      'Status': church.status,
      'Created Date': new Date(church.created_at).toLocaleDateString(),
      'Total Users': parseInt(church.user_count) || 0,
      'Subscriptions': parseInt(church.subscription_count) || 0,
      'Total Donations': `$${parseFloat(church.total_donations || 0).toFixed(2)}`
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Churches Report");
    
    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="churches-report-${period}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating churches Excel report:", error);
    res.status(500).json({ message: "Failed to generate Excel report" });
  }
});

router.get("/reports/export/users", requireGlobalAdmin, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Convert period to SQL interval
    let interval = '30 days';
    switch (period) {
      case '7days': interval = '7 days'; break;
      case '30days': interval = '30 days'; break;
      case '90days': interval = '90 days'; break;
      case '6months': interval = '6 months'; break;
    }

    // Get detailed user data
    const userData = await db.execute(sql`
      SELECT 
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.role,
        u.created_at,
        c.name as church_name,
        c.status as church_status
      FROM users u
      LEFT JOIN churches c ON u.church_id = c.id
      WHERE u.created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
        AND u.role != 'GLOBAL_ADMIN'
      ORDER BY u.created_at DESC
    `);

    // Format data for Excel
    const excelData = userData.rows.map((user: any) => ({
      'User ID': user.id,
      'Email': user.email,
      'First Name': user.first_name || '',
      'Last Name': user.last_name || '',
      'Role': user.role,
      'Church': user.church_name || 'No Church',
      'Church Status': user.church_status || 'N/A',
      'Created Date': new Date(user.created_at).toLocaleDateString()
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users Report");
    
    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="users-report-${period}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating users Excel report:", error);
    res.status(500).json({ message: "Failed to generate Excel report" });
  }
});

router.get("/reports/export/revenue", requireGlobalAdmin, async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Convert period to SQL interval
    let interval = '30 days';
    switch (period) {
      case '7days': interval = '7 days'; break;
      case '30days': interval = '30 days'; break;
      case '90days': interval = '90 days'; break;
      case '6months': interval = '6 months'; break;
    }

    // Get detailed subscription/revenue data
    const revenueData = await db.execute(sql`
      SELECT 
        s.id,
        s.plan,
        s.status,
        s.created_at,
        c.name as church_name,
        c.contact_email as church_email,
        CASE 
          WHEN s.plan = 'MONTHLY' THEN 2.99
          WHEN s.plan = 'ANNUAL' THEN 25.00
          ELSE 0
        END as monthly_value,
        CASE 
          WHEN s.plan = 'ANNUAL' THEN 25.00
          ELSE 0
        END as annual_value
      FROM subscriptions s
      LEFT JOIN churches c ON s.church_id = c.id
      WHERE s.created_at >= NOW() - INTERVAL '${sql.raw(interval)}'
      ORDER BY s.created_at DESC
    `);

    // Format data for Excel
    const excelData = revenueData.rows.map((sub: any) => ({
      'Subscription ID': sub.id,
      'Church Name': sub.church_name || 'Unknown',
      'Church Email': sub.church_email || '',
      'Plan Type': sub.plan,
      'Status': sub.status,
      'Monthly Revenue': sub.plan === 'MONTHLY' ? '$2.99' : '$0.00',
      'Annual Revenue': sub.plan === 'ANNUAL' ? '$25.00' : '$0.00',
      'Created Date': new Date(sub.created_at).toLocaleDateString()
    }));

    // Add summary row
    const totalMonthly = revenueData.rows.filter((r: any) => r.plan === 'MONTHLY').length * 2.99;
    const totalAnnual = revenueData.rows.filter((r: any) => r.plan === 'ANNUAL').length * 25.00;
    
    excelData.push({
      'Subscription ID': '',
      'Church Name': '',
      'Church Email': '',
      'Plan Type': 'TOTALS',
      'Status': '',
      'Monthly Revenue': `$${totalMonthly.toFixed(2)}`,
      'Annual Revenue': `$${totalAnnual.toFixed(2)}`,
      'Created Date': ''
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Report");
    
    // Generate Excel file buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${period}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating revenue Excel report:", error);
    res.status(500).json({ message: "Failed to generate Excel report" });
  }
});

export default router;