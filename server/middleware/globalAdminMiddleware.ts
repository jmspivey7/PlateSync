import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../util";

/**
 * Middleware to restrict access to routes for non-global admins
 */
export const requireGlobalAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check for JWT token in the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("Missing authorization header");
      return res.status(401).json({ message: "Unauthorized - No token provided" });
    }

    // Extract and verify the token
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("Empty token provided");
      return res.status(401).json({ message: "Unauthorized - Empty token" });
    }

    // Verify the token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      console.log("Token verification failed");
      
      // Detailed logging for debugging
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Log first part of payload (without revealing sensitive data)
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log("Token payload (partial):", {
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'none',
            role: payload.role || 'none'
          });
        }
      } catch (e) {
        console.log("Error parsing token:", e);
      }
      
      return res.status(401).json({ message: "Unauthorized - Invalid token" });
    }

    // Ensure the token is for a global admin
    if (decoded.role !== "GLOBAL_ADMIN") {
      console.log("User role is not GLOBAL_ADMIN:", decoded.role);
      return res.status(403).json({ message: "Forbidden - Global admin access required" });
    }

    // Set user info on request
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Global admin middleware error:", error);
    return res.status(500).json({ message: "Internal server error during authentication" });
  }
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
  if (!req.session || !req.session.passport?.user) {
    return next();
  }

  // Skip if no churchId is present (global admin or unassigned user)
  if (!req.user || !req.user.churchId) {
    return next();
  }

  // Check if the church is suspended (this would be retrieved from the database in reality)
  const churchStatus = req.user.status || 'ACTIVE';

  if (churchStatus === "SUSPENDED") {
    return res.status(403).json({
      message: "Access to this church account has been suspended. Please contact support for assistance."
    });
  }

  next();
};