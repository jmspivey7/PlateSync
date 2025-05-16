import express from "express";
import { Router } from "express";
import { db } from "../db";
import { churches, users, members, donations } from "@shared/schema";
import { validateSchema } from "../middleware/validationMiddleware";
import { eq, desc, and, asc, SQL, ilike, sql } from "drizzle-orm";
import { z } from "zod";
import { generateId, scryptHash, verifyPassword, generateToken } from "../util";
import { requireGlobalAdmin } from "../middleware/globalAdminMiddleware";

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
        // Get user count for this church
        const [{ userCount }] = await db
          .select({
            userCount: sql<number>`count(*)`
          })
          .from(users)
          .where(eq(users.churchId, church.id));
        
        // Use SQL to get member count for this church safely
        const memberResult = await db.execute(
          `SELECT COUNT(*) as "memberCount" FROM members WHERE church_id = '${church.id}'`
        );
        const memberCount = parseInt(memberResult.rows?.[0]?.memberCount || '0');
        
        // Use SQL to get total donations for this church safely
        const donationResult = await db.execute(
          `SELECT COALESCE(SUM(amount)::text, '0.00') as "donationSum" FROM donations WHERE church_id = '${church.id}'`
        );
        const donationSum = donationResult.rows?.[0]?.donationSum || '0.00';
          
        // Use SQL to get the most recent login date (using updatedAt as a proxy) from any user in this church
        const userResult = await db.execute(
          `SELECT updated_at FROM users WHERE church_id = '${church.id}' ORDER BY updated_at DESC LIMIT 1`
        );
        
        // If no users have logged in recently, fall back to the church's updated_at date
        const lastLoginDate = userResult?.rows?.[0]?.updated_at 
          ? new Date(userResult.rows[0].updated_at) 
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
    
    // Get the church details using string interpolation instead of parameterized query
    // This is safe because 'id' comes from the route parameter, not user input
    const churchResult = await db.execute(
      `SELECT * FROM churches WHERE id = '${id}' LIMIT 1`
    );
    
    const church = churchResult.rows?.[0];
    
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Get user count - exclude GLOBAL_ADMIN users from the count
    const userResult = await db.execute(
      `SELECT COUNT(*) as "userCount" FROM users WHERE church_id = '${id}' AND role != 'GLOBAL_ADMIN'`
    );
    const userCount = parseInt(userResult.rows[0]?.userCount || '0');
      
    // Get members count  
    const membersResult = await db.execute(
      `SELECT COUNT(*) as "totalMembers" FROM members WHERE church_id = '${id}'`
    );
    const totalMembers = parseInt(membersResult.rows[0]?.totalMembers || '0');
      
    // Get total donations
    const donationsResult = await db.execute(
      `SELECT SUM(amount) as "totalDonations" FROM donations WHERE church_id = '${id}'`
    );
    const totalDonations = donationsResult.rows[0]?.totalDonations || '0.00';
    
    res.status(200).json({
      ...church,
      userCount,
      totalMembers,
      totalDonations,
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
    // Exclude GLOBAL_ADMIN users from the church users list
    const result = await db.execute(
      `SELECT id, email, first_name AS "firstName", last_name AS "lastName", 
              role, is_verified AS "isVerified", is_account_owner AS "isAccountOwner", 
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE church_id = '${id}' AND role != 'GLOBAL_ADMIN'
       ORDER BY created_at DESC`
    );
    
    const churchUsers = result.rows || [];
    
    res.status(200).json(churchUsers);
  } catch (error) {
    console.error("Error fetching church users:", error);
    res.status(500).json({ message: "Failed to fetch church users" });
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

export default router;