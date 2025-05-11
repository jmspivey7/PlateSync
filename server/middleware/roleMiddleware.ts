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

// Middleware to check if the user has admin role (ACCOUNT_OWNER or ADMIN)
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
    
    // Check for ACCOUNT_OWNER or ADMIN role
    if (dbUser.role !== 'ACCOUNT_OWNER' && dbUser.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Middleware to check if the user is an Account Owner
export const isAccountOwner = async (req: Request, res: Response, next: NextFunction) => {
  // Development mode bypass
  if (ALLOW_DEV_BYPASS && process.env.NODE_ENV === 'development') {
    console.log('Using development auth bypass for ACCOUNT OWNER check');
    return next();
  }

  if (!checkAuthentication(req, res)) {
    return;
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the user with their role and account owner status directly from database
    const userQuery = await db.execute(
      sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
    );
    
    if (userQuery.rows.length === 0) {
      return res.status(403).json({ message: 'Forbidden: Account Owner access required' });
    }
    
    const dbUser = userQuery.rows[0];
    
    // Check if user is an Account Owner (either by role or flag)
    if (dbUser.role !== 'ACCOUNT_OWNER' && !dbUser.is_account_owner) {
      return res.status(403).json({ message: 'Forbidden: Account Owner access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking account owner status:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};

// Keep the old name for backward compatibility, but using the new implementation
export const isMasterAdmin = isAccountOwner;

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
    
    // Account Owners can access all churches they own
    if (dbUser.role === 'ACCOUNT_OWNER' || dbUser.is_account_owner) {
      return next();
    }
    
    // Check if the user belongs to the requested church
    if (dbUser.church_id !== resourceChurchId) {
      return res.status(403).json({ message: 'Forbidden: Not a member of this church' });
    }

    next();
  } catch (error) {
    console.error('Error checking church membership:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};