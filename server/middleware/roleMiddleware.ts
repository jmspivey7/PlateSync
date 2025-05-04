import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@shared/schema';

// Middleware to check if the user has admin role
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const user = req.user as any;
  
  if (user.claims?.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin access required' });
  }

  next();
};

// Middleware to check if user has a specific role
export const hasRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = req.user as any;
    const userRole = user.claims?.role || 'USHER'; // Default to USHER if not specified
    
    if (!allowedRoles.includes(userRole as UserRole)) {
      return res.status(403).json({ 
        message: `Forbidden: Required role(s): ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};