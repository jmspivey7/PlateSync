import { Request, Response, NextFunction } from 'express';

// Authentication middleware
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is logged in via passport
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check for our updated session structure as fallback
  const userData = req.session?.user;
  
  if (!userData || !userData.userId) {
    console.log('No user session found in authentication middleware');
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  next();
};

// Admin role check middleware
export const isAdmin = (req: any, res: Response, next: NextFunction) => {
  const userRole = req.user?.role || req.session?.user?.role;
  
  if (userRole !== 'ADMIN' && userRole !== 'GLOBAL_ADMIN' && userRole !== 'ACCOUNT_OWNER') {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  
  next();
};

// Account owner check middleware
export const isAccountOwner = (req: any, res: Response, next: NextFunction) => {
  const isOwner = req.user?.isAccountOwner || req.session?.user?.isAccountOwner;
  
  if (!isOwner) {
    return res.status(403).json({ message: 'Access denied. Account owner privileges required.' });
  }
  
  next();
};

// Global admin check middleware
export const isGlobalAdmin = (req: any, res: Response, next: NextFunction) => {
  const userRole = req.user?.role || req.session?.user?.role;
  
  if (userRole !== 'GLOBAL_ADMIN') {
    return res.status(403).json({ message: 'Access denied. Global admin privileges required.' });
  }
  
  next();
};