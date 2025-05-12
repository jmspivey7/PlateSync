import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { churches } from "@shared/schema";
import { eq } from "drizzle-orm";

// Declare session with userId
declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

// Middleware to check if the user is a Global Admin
export const isGlobalAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if user is authenticated
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = req.session.userId;
    
    // Get user from database
    const user = await storage.getUser(userId);
    
    // If user not found or not a Global Admin
    if (!user || user.role !== "GLOBAL_ADMIN") {
      return res.status(403).json({ 
        message: "Forbidden: Global Administrator access required" 
      });
    }

    // User is a Global Admin, proceed
    next();
  } catch (error) {
    console.error("Global Admin middleware error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Middleware to restrict access for users from suspended or deleted churches
export const restrictSuspendedChurchAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Skip for Global Admins and unauthenticated requests (they'll be caught by auth middleware)
    if (!req.session || !req.session.userId) {
      return next();
    }
    
    const user = await storage.getUser(req.session.userId);
    
    // Global Admins bypass this check
    if (user?.role === "GLOBAL_ADMIN") {
      return next();
    }
    
    // If user has no church ID, let them proceed (this is not ideal but prevents errors)
    if (!user?.churchId) {
      return next();
    }
    
    // Check church status
    const [church] = await db
      .select()
      .from(churches)
      .where(eq(churches.id, user.churchId));
    
    // If church not found, something is wrong
    if (!church) {
      console.error(`Church not found for ID: ${user.churchId}`);
      return res.status(403).json({ message: "Account issue detected. Please contact support." });
    }
    
    // Check if church is suspended or deleted
    if (church.status === "SUSPENDED") {
      return res.status(403).json({ 
        message: "Your church account has been suspended. Please contact support for assistance."
      });
    }
    
    if (church.status === "DELETED") {
      return res.status(403).json({ 
        message: "This church account has been deleted and is no longer accessible."
      });
    }
    
    // Church is active, proceed
    next();
  } catch (error) {
    console.error("Church status check error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};