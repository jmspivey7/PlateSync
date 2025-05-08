import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';
import { storage } from '../storage';
import { sql } from 'drizzle-orm';
import { db } from '../db';

// Helper function to check if the user is authenticated
const checkAuthentication = (req: Request, res: Response): boolean => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ message: 'Unauthorized' });
    return false;
  }
  return true;
};

// Development bypass for testing (should be false in production)
const ALLOW_DEV_BYPASS = process.env.NODE_ENV === 'development';

// Middleware to check if the user has admin role
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
    console.log('Using development auth bypass for ADMIN check');
    return next();
  }

  if (!checkAuthentication(req, res)) {
    return;
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the user with their role directly from database
    const userQuery = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    const dbUser = userQuery.rows[0];
    
    // Check for ADMIN role
    if (dbUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Middleware to check if the user is a Master Admin
export const isMasterAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
    console.log('Using development auth bypass for MASTER ADMIN check');
    return next();
  }

  if (!checkAuthentication(req, res)) {
    return;
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the user with their role and master admin status directly from database
    const userQuery = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Master Admin access required' });
    }
    
    const dbUser = userQuery.rows[0];
    
    // Check for ADMIN role and Master Admin status
    if (dbUser.role !== 'ADMIN' || !dbUser.is_master_admin) {
      return res.status(403).json({ message: 'Forbidden: Master Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking master admin status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Middleware to check if the user is either an Admin or a Master Admin
export const isAdminOrMasterAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
    console.log('Using development auth bypass for ADMIN or MASTER ADMIN check');
    return next();
  }

  if (!checkAuthentication(req, res)) {
    return;
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the user with their role and master admin status directly from database
    const userQuery = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
    
    const dbUser = userQuery.rows[0];
    
    // Check for ADMIN role (regardless of Master Admin status)
    if (dbUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Middleware to check if user has a specific role
export const hasRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Development mode bypass
    if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
      console.log('Using development auth bypass for role check');
      return next();
    }

    if (!checkAuthentication(req, res)) {
      return;
    }

    try {
      const user = req.user as any;
      const userId = user.claims.sub;
      
      // Get the user with their role directly from database
      const userQuery = await db.execute(
        sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
      );
      
      if (userQuery.rows.length === 0) {
        return res.status(403).json({ 
          message: `Forbidden: Required role(s): ${allowedRoles.join(', ')}` 
        });
      }
      
      const dbUser = userQuery.rows[0];
      
      // Check if user role is in allowed roles
      if (!allowedRoles.includes(dbUser.role as UserRole)) {
        return res.status(403).json({ 
          message: `Forbidden: Required role(s): ${allowedRoles.join(', ')}` 
        });
      }

      next();
    } catch (error) {
      console.error('Error checking user role:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };
};

// Middleware to check if a user belongs to the same church as the requested resource
export const isSameChurch = async (req: Request, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
    console.log('Using development auth bypass for church membership check');
    return next();
  }

  if (!checkAuthentication(req, res)) {
    return;
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the requested resource's churchId
    const resourceChurchId = req.params.churchId || req.body.churchId;
    
    if (!resourceChurchId) {
      // If no church ID is specified, we can't check membership
      return next();
    }
    
    // Get the user's church ID directly from database
    const userQuery = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Not a member of this church' });
    }
    
    const dbUser = userQuery.rows[0];
    
    // ADMIN users who are Master Admins can access all churches
    if (dbUser.role === 'ADMIN' && dbUser.is_master_admin) {
      return next();
    }
    
    // Get the user's church ID from storage function which handles the data access logic
    const userChurchId = await storage.getChurchIdForUser(userId);
    
    // Check if the user belongs to the requested church
    if (userChurchId !== resourceChurchId) {
      return res.status(403).json({ message: 'Forbidden: Not a member of this church' });
    }

    next();
  } catch (error) {
    console.error('Error checking church membership:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};