import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';
import { storage } from '../storage';

// Middleware to check if the user has admin role
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    // Get the user with their role from the database
    const dbUser = await storage.getUser(userId);
    
    if (!dbUser || dbUser.role !== 'ADMIN') {
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
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const user = req.user as any;
      const userId = user.claims.sub;
      
      // Get the user with their role from the database
      const dbUser = await storage.getUser(userId);
      
      // Default to USHER if not specified in the database
      const userRole = dbUser?.role || 'USHER';
      
      if (!allowedRoles.includes(userRole as UserRole)) {
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