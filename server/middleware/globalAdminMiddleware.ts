import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../util";

/**
 * Middleware to restrict access to routes for non-global admins
 */
export const requireGlobalAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Check for JWT token in the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized - No token provided" });
  }

  // Extract and verify the token
  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ message: "Unauthorized - Invalid token" });
  }

  // Ensure the token is for a global admin
  if (decoded.role !== "GLOBAL_ADMIN") {
    return res.status(403).json({ message: "Forbidden - Global admin access required" });
  }

  // Set user info on request
  req.user = decoded;
  next();
};

/**
 * Middleware to restrict access to suspended churches
 * Global administrators are exempt from this restriction
 */
export const restrictSuspendedChurchAccess = (req: Request, res: Response, next: NextFunction) => {
  // Skip this middleware for global admin routes
  if (req.path.startsWith("/api/global-admin")) {
    return next();
  }

  // Skip if no user is logged in yet
  if (!req.session || !req.session.userId) {
    return next();
  }

  // Skip if no churchId is present (global admin or unassigned user)
  if (!req.user || !req.user.churchId) {
    return next();
  }

  // Check if the church is suspended (this would be retrieved from the database in reality)
  const churchStatus = req.user.churchStatus;

  if (churchStatus === "SUSPENDED") {
    return res.status(403).json({
      message: "Access to this church account has been suspended. Please contact support for assistance."
    });
  }

  next();
};