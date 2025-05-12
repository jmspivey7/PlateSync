import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

/**
 * Middleware to ensure a user is a Global Admin
 * This is the highest level of authorization in the system
 */
export const isGlobalAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = await storage.getUserRole(req.user.id);
    
    if (userRole !== "GLOBAL_ADMIN") {
      return res.status(403).json({ 
        message: "Access denied. Global Administrator role required." 
      });
    }

    next();
  } catch (error) {
    console.error("Error in global admin middleware:", error);
    res.status(500).json({ message: "Server error verifying administrator access" });
  }
};

/**
 * Middleware to check if a user is trying to access data that belongs to a suspended or deleted church
 * Global admins can bypass this check
 */
export const restrictSuspendedChurchAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Global admins can always access everything
    const userRole = req.user ? await storage.getUserRole(req.user.id) : null;
    if (userRole === "GLOBAL_ADMIN") {
      return next();
    }

    // Get churchId from user or from request
    const churchId = req.user?.churchId || req.params.churchId || req.body.churchId;
    
    if (!churchId) {
      return next(); // No church specified, continue
    }

    // Check church status
    const church = await storage.getChurch(churchId);
    
    if (!church) {
      return next(); // Church not found, this will be handled by the route handler
    }

    // If church is suspended or deleted, restrict access
    if (church.status === "SUSPENDED") {
      return res.status(403).json({ 
        message: "This church account has been suspended. Please contact support for assistance." 
      });
    }

    if (church.status === "DELETED") {
      return res.status(404).json({ 
        message: "This church account has been deleted." 
      });
    }

    next();
  } catch (error) {
    console.error("Error in suspended church access middleware:", error);
    next(); // Continue on error to avoid blocking legitimate requests
  }
};