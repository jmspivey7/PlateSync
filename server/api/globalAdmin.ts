import express from "express";
import { Router } from "express";
import { db } from "../db";
import { churches, users } from "@shared/schema";
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
    
    // Generate a JWT token for the global admin
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: "GLOBAL_ADMIN",
    }, "24h");
    
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
    
    if (search) {
      conditions.push(ilike(churches.name, `%${search}%`));
    }
    
    if (status) {
      conditions.push(eq(churches.status, status));
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
        
        // In a real implementation, we would get member count, donation totals, etc.
        // This is just an example
        const totalMembers = Math.floor(Math.random() * 500) + 50; // Placeholder
        const totalDonations = (Math.random() * 50000 + 5000).toFixed(2); // Placeholder
        const lastActivityDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Random date within last 30 days
        
        return {
          ...church,
          userCount,
          totalMembers,
          totalDonations,
          lastActivity: lastActivityDate.toISOString(),
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
    
    // Get the church details
    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
    
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Get user count
    const [{ userCount }] = await db
      .select({
        userCount: sql<number>`count(*)`
      })
      .from(users)
      .where(eq(users.church_id, id));
      
    // Get members count
    const [{ totalMembers }] = await db
      .select({
        totalMembers: sql<number>`count(*)`
      })
      .from(members)
      .where(eq(members.churchId, id));
      
    // Get total donations
    const [totalDonationsResult] = await db
      .select({
        totalDonations: sql<string>`SUM(amount)`
      })
      .from(donations)
      .where(eq(donations.churchId, id));
    
    // Format the total donations amount
    const totalDonations = totalDonationsResult.totalDonations || "0.00";
    
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
    
    // Use a raw SQL query to avoid field mapping issues with Drizzle ORM
    const result = await db.execute(
      `SELECT id, email, first_name AS "firstName", last_name AS "lastName", 
              role, is_verified AS "isVerified", is_account_owner AS "isAccountOwner", 
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM users 
       WHERE church_id = $1
       ORDER BY created_at DESC`,
      [id]
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

export default router;