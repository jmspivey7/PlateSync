import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { users, churches, members, donations, batches } from "@shared/schema";
import { validateSchema } from "../middleware/validationMiddleware";
import { z } from "zod";
import { and, eq, ne, isNull, desc, count, sum, sql } from "drizzle-orm";
import { generateId, scryptHash, verifyPassword } from "../util";
import { isGlobalAdmin } from "../middleware/globalAdminMiddleware";

// Declare session with userId
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Create router for global admin endpoints
const router = Router();

// Schemas for request validation
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

const createChurchSchema = z.object({
  name: z.string().min(3, "Church name must be at least 3 characters"),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional().default("ACTIVE"),
  adminEmail: z.string().email("Please enter a valid email address"),
  adminFirstName: z.string().min(1, "First name is required"),
  adminLastName: z.string().min(1, "Last name is required"),
  adminPassword: z.string().min(6, "Password must be at least 6 characters")
});

const updateChurchSchema = z.object({
  name: z.string().min(3, "Church name must be at least 3 characters").optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]).optional()
});

// Login endpoint for global admins
router.post("/login", validateSchema(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await storage.getUserByEmail(email);
    
    // Check if user exists and has GLOBAL_ADMIN role 
    if (!user || user.role !== "GLOBAL_ADMIN") {
      return res.status(401).json({ 
        message: "Invalid email or password" 
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password || "");
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: "Invalid email or password" 
      });
    }
    
    // Set session userId for authentication
    req.session.userId = user.id;
    
    // Return success response
    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role
    });
  } catch (error) {
    console.error("Global Admin login error:", error);
    return res.status(500).json({ 
      message: "An error occurred during login" 
    });
  }
});

// Get current global admin user
router.get("/me", isGlobalAdmin, async (req, res) => {
  try {
    // User should be authenticated and validated by middleware
    const user = await storage.getUser(req.session.userId!);
    
    if (!user) {
      // This shouldn't happen due to middleware, but just in case
      return res.status(404).json({ message: "User not found" });
    }
    
    // Return user data without sensitive fields
    return res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      profileImageUrl: user.profileImageUrl
    });
  } catch (error) {
    console.error("Error fetching global admin user:", error);
    return res.status(500).json({ message: "Failed to fetch user data" });
  }
});

// Logout endpoint
router.post("/logout", async (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Failed to logout" });
    }
    
    res.clearCookie("connect.sid");
    return res.status(200).json({ message: "Logged out successfully" });
  });
});

// Get list of all churches
router.get("/churches", isGlobalAdmin, async (req, res) => {
  try {
    // Query churches with stats
    const churchesWithStats = await db.execute(sql`
      SELECT 
        c.id,
        c.name,
        c.status,
        c.created_at,
        c.updated_at,
        (SELECT COUNT(*) FROM members m WHERE m.church_id = c.id) as total_members,
        (SELECT COALESCE(SUM(CAST(d.amount AS DECIMAL)), 0) FROM donations d WHERE d.church_id = c.id) as total_donations,
        (SELECT COUNT(*) FROM users u WHERE u.church_id = c.id) as user_count,
        (SELECT MAX(b.created_at) FROM batches b WHERE b.church_id = c.id) as last_activity
      FROM 
        churches c
      ORDER BY 
        c.created_at DESC
    `);
    
    // Format the response
    const formattedChurches = churchesWithStats.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalMembers: parseInt(row.total_members || '0'),
      totalDonations: row.total_donations?.toString() || "0",
      userCount: parseInt(row.user_count || '0'),
      lastActivity: row.last_activity ? new Date(row.last_activity).toISOString() : null
    }));
    
    return res.status(200).json(formattedChurches);
  } catch (error) {
    console.error("Error fetching churches:", error);
    return res.status(500).json({ message: "Failed to fetch churches" });
  }
});

// Get details of a specific church
router.get("/churches/:id", isGlobalAdmin, async (req, res) => {
  try {
    const churchId = req.params.id;
    
    // Get church details
    const churchQuery = await db
      .select()
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);
    
    if (churchQuery.length === 0) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    const church = churchQuery[0];
    
    // Get stats
    const memberCount = await db
      .select({ count: count() })
      .from(members)
      .where(eq(members.churchId, churchId));
      
    const donationTotal = await db
      .select({ total: sql`SUM(CAST(amount as DECIMAL))` })
      .from(donations)
      .where(eq(donations.churchId, churchId));
      
    const userCount = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.churchId, churchId));
      
    const lastActivity = await db
      .select({ lastDate: sql`MAX(created_at)` })
      .from(batches)
      .where(eq(batches.churchId, churchId));
    
    // Return church with stats
    return res.status(200).json({
      ...church,
      totalMembers: memberCount[0].count || 0,
      totalDonations: donationTotal[0].total?.toString() || "0",
      userCount: userCount[0].count || 0,
      lastActivity: lastActivity[0].lastDate ? new Date(lastActivity[0].lastDate).toISOString() : null
    });
  } catch (error) {
    console.error("Error fetching church details:", error);
    return res.status(500).json({ message: "Failed to fetch church details" });
  }
});

// Create a new church
router.post("/churches", isGlobalAdmin, validateSchema(createChurchSchema), async (req, res) => {
  try {
    const { 
      name, 
      status = "ACTIVE", 
      adminEmail, 
      adminFirstName, 
      adminLastName, 
      adminPassword 
    } = req.body;
    
    // Check if church with same name already exists
    const existingChurch = await db
      .select()
      .from(churches)
      .where(eq(churches.name, name))
      .limit(1);
      
    if (existingChurch.length > 0) {
      return res.status(400).json({ message: "A church with this name already exists" });
    }
    
    // Check if admin email is already in use
    const existingUser = await storage.getUserByEmail(adminEmail);
    if (existingUser) {
      return res.status(400).json({ message: "Email address is already in use" });
    }
    
    // Hash the admin password
    const hashedPassword = await scryptHash(adminPassword);
    
    // Generate a new church ID
    const churchId = generateId("church");
    
    // Create the church
    const [church] = await db
      .insert(churches)
      .values({
        id: churchId,
        name,
        status,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    // Create the admin user
    const [admin] = await db
      .insert(users)
      .values({
        id: generateId("user"),
        email: adminEmail,
        firstName: adminFirstName,
        lastName: adminLastName,
        role: "ACCOUNT_OWNER", // Church admin is always an account owner
        password: hashedPassword,
        isVerified: true, // Pre-verify the admin
        churchId: churchId,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAccountOwner: true
      })
      .returning();
      
    // Return the created church with the admin info
    return res.status(201).json({
      church,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Error creating church:", error);
    return res.status(500).json({ message: "Failed to create church" });
  }
});

// Update a church
router.patch("/churches/:id", isGlobalAdmin, validateSchema(updateChurchSchema), async (req, res) => {
  try {
    const churchId = req.params.id;
    const { name, status } = req.body;
    
    // Check if church exists
    const churchQuery = await db
      .select()
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);
      
    if (churchQuery.length === 0) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Update church
    const [updatedChurch] = await db
      .update(churches)
      .set({
        ...(name && { name }),
        ...(status && { status }),
        updatedAt: new Date()
      })
      .where(eq(churches.id, churchId))
      .returning();
      
    return res.status(200).json(updatedChurch);
  } catch (error) {
    console.error("Error updating church:", error);
    return res.status(500).json({ message: "Failed to update church" });
  }
});

// Get users of a church
router.get("/churches/:id/users", isGlobalAdmin, async (req, res) => {
  try {
    const churchId = req.params.id;
    
    // Check if church exists
    const churchQuery = await db
      .select()
      .from(churches)
      .where(eq(churches.id, churchId))
      .limit(1);
      
    if (churchQuery.length === 0) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Get users
    const churchUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isVerified: users.isVerified,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        isAccountOwner: users.isAccountOwner
      })
      .from(users)
      .where(eq(users.churchId, churchId))
      .orderBy(users.createdAt);
      
    return res.status(200).json(churchUsers);
  } catch (error) {
    console.error("Error fetching church users:", error);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

// Export the router
export default router;
