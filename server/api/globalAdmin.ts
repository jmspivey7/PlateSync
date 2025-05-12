import { Router } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { users, churches, members, donations, batches } from "@shared/schema";
import { validateSchema } from "../middleware/validationMiddleware";
import { z } from "zod";
import { and, eq, ne, isNull, desc, count, sum, sql } from "drizzle-orm";
import { generateId, verifyPassword } from "../util";
import { isGlobalAdmin } from "../middleware/globalAdminMiddleware";

// Create router for global admin endpoints
const router = Router();

// Schema for global admin login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
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

    // Set user session
    req.session.userId = user.id;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Global admin login error:", error);
    return res.status(500).json({ message: "Error during authentication" });
  }
});

// Get all churches with stats for global admin dashboard
router.get("/churches", isGlobalAdmin, async (req, res) => {
  try {
    // Get all churches with basic information
    const churchesList = await db.select().from(churches).orderBy(desc(churches.createdAt));
    
    // Prepare response with additional statistics
    const churchesWithStats = await Promise.all(churchesList.map(async (church) => {
      // Count members for this church
      const [membersCount] = await db
        .select({ count: count() })
        .from(members)
        .where(eq(members.churchId, church.id));
      
      // Count users for this church
      const [usersCount] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.churchId, church.id));
      
      // Sum total donations for this church
      const [donationsSum] = await db
        .select({ 
          total: sql<string>`COALESCE(SUM(CAST(${donations.amount} AS DECIMAL(10,2))), 0)::text` 
        })
        .from(donations)
        .where(eq(donations.churchId, church.id));
      
      // Get last activity (most recent batch or login)
      let lastActivity = church.lastLoginDate;
      
      const [lastBatch] = await db
        .select({ createdAt: batches.createdAt })
        .from(batches)
        .where(eq(batches.churchId, church.id))
        .orderBy(desc(batches.createdAt))
        .limit(1);
      
      if (lastBatch && lastBatch.createdAt) {
        if (!lastActivity || lastBatch.createdAt > lastActivity) {
          lastActivity = lastBatch.createdAt;
        }
      }
      
      return {
        ...church,
        totalMembers: membersCount?.count || 0,
        userCount: usersCount?.count || 0,
        totalDonations: donationsSum?.total || "0.00",
        lastActivity: lastActivity ? lastActivity.toISOString() : null
      };
    }));
    
    return res.status(200).json(churchesWithStats);
  } catch (error) {
    console.error("Error fetching churches for global admin:", error);
    return res.status(500).json({ message: "Error fetching churches" });
  }
});

// Get detailed information about a specific church
router.get("/churches/:id", isGlobalAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get church details
    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
      
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Get church statistics
    const [membersCount] = await db
      .select({ count: count() })
      .from(members)
      .where(eq(members.churchId, id));
    
    const [usersCount] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.churchId, id));
    
    const [donationsSum] = await db
      .select({ 
        total: sql<string>`COALESCE(SUM(CAST(${donations.amount} AS DECIMAL(10,2))), 0)::text` 
      })
      .from(donations)
      .where(eq(donations.churchId, id));
    
    // Get all users for this church
    const churchUsers = await db
      .select()
      .from(users)
      .where(eq(users.churchId, id))
      .orderBy(desc(users.createdAt));
    
    // Get recent batches
    const recentBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.churchId, id))
      .orderBy(desc(batches.createdAt))
      .limit(5);
    
    // Combine all data
    const churchData = {
      ...church,
      totalMembers: membersCount?.count || 0,
      userCount: usersCount?.count || 0,
      totalDonations: donationsSum?.total || "0.00",
      users: churchUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      }),
      recentBatches
    };
    
    return res.status(200).json(churchData);
  } catch (error) {
    console.error("Error fetching church details:", error);
    return res.status(500).json({ message: "Error fetching church details" });
  }
});

// Schema for updating church status
const updateChurchStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"])
});

// Update church status (activate, suspend, delete)
router.patch("/churches/:id/status", isGlobalAdmin, validateSchema(updateChurchStatusSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if church exists
    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, id));
      
    if (!church) {
      return res.status(404).json({ message: "Church not found" });
    }
    
    // Update church status
    const [updatedChurch] = await db
      .update(churches)
      .set({ 
        status,
        updatedAt: new Date(),
        // If deleted, set deletedAt timestamp
        deletedAt: status === "DELETED" ? new Date() : null
      })
      .where(eq(churches.id, id))
      .returning();
    
    return res.status(200).json(updatedChurch);
  } catch (error) {
    console.error("Error updating church status:", error);
    return res.status(500).json({ message: "Error updating church status" });
  }
});

export default router;