import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import session from 'express-session';
import passport from 'passport';
import connectPg from 'connect-pg-simple';
import globalAdminProfileRoutes from './api/globalAdminProfileRoutes';
import profileRoutes from './api/profileRoutes';
import settingsRoutes from './api/settingsRoutes';


// Extend express-session with our user type
declare global {
  namespace Express {
    interface SessionData {
      user?: {
        userId: string;
        churchId?: string;
        role?: string;
        isAccountOwner?: boolean;
      };
    }
  }
}
// Create our own isAuthenticated middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is logged in via passport
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  // Check for our updated session structure as fallback
  const userData = req.session?.user;
  
  if (!userData || !userData.userId) {
    console.log('No user session found:', req.session);
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  next();
};

// Middleware to check trial expiration for Account Owners and restrict access
const checkTrialExpiration = async (req: Request, res: Response, next: NextFunction) => {
  const user = req.user as any;
  
  // Only apply to Account Owners
  if (user && user.role === 'ACCOUNT_OWNER' && user.churchId) {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.churchId, user.churchId));
    
    if (subscription) {
      const now = new Date();
      const trialEndDate = new Date(subscription.trialEndDate);
      const isTrialExpired = subscription.status === 'TRIAL' && now > trialEndDate;
      
      if (isTrialExpired) {
        // Allow access only to subscription-related endpoints
        const allowedPaths = [
          '/api/subscription/',
          '/api/auth/user',
          '/api/logout'
        ];
        
        const isAllowedPath = allowedPaths.some(path => req.path.includes(path));
        
        if (!isAllowedPath) {
          console.log(`Account Owner with expired trial blocked from ${req.path}`);
          return res.status(403).json({ 
            message: 'Trial expired. Please upgrade to a paid subscription to continue using PlateSync.',
            trialExpired: true,
            requiresUpgrade: true
          });
        }
      }
    }
  }
  
  next();
};
import { isAdmin, isAccountOwner, isMasterAdmin } from "./middleware/roleMiddleware";
import { sendDonationNotification, testSendGridConfiguration, sendWelcomeEmail, sendPasswordResetEmail, sendCountReport } from "./sendgrid";
import { sendVerificationEmail, verifyCode } from "./verification";
import { setupTestEndpoints } from "./test-endpoints";
import { setupPlanningCenterRoutes } from "./planning-center";
import { restrictSuspendedChurchAccess, requireGlobalAdmin } from "./middleware/globalAdminMiddleware";
import globalAdminRoutes from "./api/globalAdmin";
import authRoutes from "./api/authRoutes";
import multer from 'multer';

import { eq, sql, and, or, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { generateCountReportPDF } from "./pdf-generator";
import Stripe from "stripe";
import { createTrialSubscriptionForOnboarding } from "./subscription-helper";
import { verifyStripeSubscription, updateSubscriptionFromStripe, cancelStripeSubscription } from "./stripe-helper";

import { parse } from "csv-parse/sync";
import { importMembers } from "./import-members";
import { queryClient } from "./query-client";
import { 
  batches, 
  churches, 
  donations, 
  members,
  csvImportStats, 
  registerChurchSchema,
  reportRecipients, 
  serviceOptions, 
  subscriptions, 
  users,
  verificationTokens
} from "@shared/schema";

// Initialize Stripe if API key is available
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY) 
  : undefined;

// Helper for password handling
async function scryptHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') + ':' + salt);
    });
  });
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [hash, salt] = hashedPassword.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(hash === derivedKey.toString('hex'));
    });
  });
}

// Set up session middleware
function setupSessionMiddleware(app: Express) {
  // Session configuration
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Set up PostgreSQL session store
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  // Configure session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: true,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: sessionTtl,
    },
  }));
  
  // Configure passport for authentication
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Serialize and deserialize user
  passport.serializeUser((user: any, done) => {
    // Handle complex user object format from existing sessions
    if (user && typeof user === 'object') {
      if (user.id) {
        console.log("Serializing user by id:", user.id);
        return done(null, user.id);
      } else if (user.userId) {
        console.log("Serializing user by userId:", user.userId);
        return done(null, user.userId);
      } else if (user.claims && user.claims.sub) {
        console.log("Serializing user by claims.sub:", user.claims.sub);
        return done(null, user.claims.sub);
      }
    }
    
    console.log("Failed to serialize user, using fallback:", user);
    done(null, user);
  });
  
  passport.deserializeUser(async (id: any, done) => {
    try {
      console.log("Deserializing user:", id);
      
      // Handle object format (legacy sessions)
      if (typeof id === 'object') {
        if (id.id) {
          console.log("Using id from object:", id.id);
          id = id.id;
        } else if (id.userId) {
          console.log("Using userId from object:", id.userId);
          id = id.userId;
        } else if (id.claims && id.claims.sub) {
          console.log("Using claims.sub from object:", id.claims.sub);
          id = id.claims.sub;
        } else {
          console.log("Cannot extract ID from object:", id);
          return done(null, false);
        }
      }
      
      if (!id || typeof id !== 'string') {
        console.log("Invalid ID type:", typeof id, id);
        return done(null, false);
      }
      
      const user = await storage.getUserById(id);
      
      if (!user) {
        console.log("No user found with ID:", id);
        return done(null, false);
      }
      
      console.log("User deserialized successfully:", user.id);
      done(null, user);
    } catch (err) {
      console.error("Error deserializing user:", err);
      done(null, false);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // CRITICAL: Onboarding endpoint MUST be first, before any middleware
  app.post('/api/onboard-email-setting', express.json(), (req: any, res) => {
    console.log(`[ONBOARD-ENDPOINT] Successfully reached! Body:`, req.body);
    
    const { enabled, churchId } = req.body;
    
    // Return proper JSON response
    res.json({
      success: true,
      message: "Email notification setting saved",
      enabled: enabled,
      churchId: churchId
    });
  });

  // Set up app.trustProxy before any middleware
  app.set("trust proxy", 1);
  
  // Setup auth middleware and routes
  setupSessionMiddleware(app);
  
  // Add logout routes (supports both GET and POST) - BEFORE auth middleware
  const handleLogout = (req: Request, res: Response) => {
    console.log("Logout endpoint called - destroying session");
    
    try {
      // Clear all cookies first
      res.clearCookie('connect.sid');
      res.clearCookie('session');
      
      // Destroy session if it exists
      if (req.session) {
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          console.log("Session destroyed and cookies cleared");
        });
      }
      
      // For GET requests or if 'redirect' is true in the POST body, redirect to login
      const isGetRequest = req.method === 'GET';
      const wantsRedirect = isGetRequest || (req.body && req.body.redirect);
      
      if (wantsRedirect) {
        res.redirect('/login-local');
      } else {
        // For API calls that don't want redirect, just send a success response
        res.status(200).json({ success: true, message: "Logged out successfully" });
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.status(200).json({ success: true, message: "Logged out successfully" });
    }
  };
  
  // Register logout routes BEFORE any auth middleware
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
  
  // Purge onboarding data endpoint (no auth required for cancellation) - MUST be before other routes
  app.delete('/api/purge-onboarding/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      
      console.log(`Purging church ${id} and all associated data during onboarding cancellation`);
      
      // Get user IDs associated with this church first
      const userResult = await db.execute(
        `SELECT id FROM users WHERE church_id = '${id}'`
      );
      const userIds = userResult.rows.map((row: any) => row.id);
      const userIdsForQuery = userIds.map((uid: string) => `'${uid}'`).join(',');
      
      console.log(`Purging church ${id} and ${userIds.length} associated users`);
      
      // Delete verification codes for this church
      await db.execute(
        `DELETE FROM verification_codes WHERE church_id = '${id}'`
      );
      console.log(`Deleted verification codes for church`);
      
      // Delete planning center tokens
      await db.execute(
        `DELETE FROM planning_center_tokens WHERE church_id = '${id}'`
      );
      console.log(`Deleted planning center tokens`);
      
      // Delete subscription data
      await db.execute(
        `DELETE FROM subscriptions WHERE church_id = '${id}'`
      );
      console.log(`Deleted subscriptions`);
      
      // Delete service options
      await db.execute(
        `DELETE FROM service_options WHERE church_id = '${id}'`
      );
      console.log(`Deleted service options`);
      
      // Delete report recipients
      await db.execute(
        `DELETE FROM report_recipients WHERE church_id = '${id}'`
      );
      console.log(`Deleted report recipients`);
      
      // Delete donations first to maintain referential integrity
      await db.execute(
        `DELETE FROM donations WHERE church_id = '${id}'`
      );
      console.log(`Deleted donations`);
      
      // Delete batches
      await db.execute(
        `DELETE FROM batches WHERE church_id = '${id}'`
      );
      console.log(`Deleted batches`);
      
      // Delete members
      await db.execute(
        `DELETE FROM members WHERE church_id = '${id}'`
      );
      console.log(`Deleted members`);
      
      // Set account_owner_id to NULL to remove foreign key constraint
      await db.execute(
        `UPDATE churches SET account_owner_id = NULL WHERE id = '${id}'`
      );
      console.log(`Removed account owner reference`);
      
      // Delete sessions associated with users
      if (userIds.length > 0) {
        await db.execute(
          `DELETE FROM sessions WHERE sess::jsonb->'user'->>'id' IN (${userIdsForQuery})`
        );
        console.log(`Deleted user sessions`);
      }
      
      // Now delete users associated with the church
      await db.execute(
        `DELETE FROM users WHERE church_id = '${id}'`
      );
      console.log(`Deleted users`);
      
      // Finally, delete the church itself
      await db.execute(
        `DELETE FROM churches WHERE id = '${id}'`
      );
      console.log(`Deleted church entity`);
      
      res.status(200).json({ 
        message: `Church ${id} and all associated data successfully purged`,
        deletedUserCount: userIds.length
      });
      
    } catch (error) {
      console.error('Error purging onboarding data:', error);
      res.status(500).json({ 
        message: 'Error purging onboarding data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Set up global admin routes
  app.use('/api/global-admin', globalAdminRoutes);
  
  // Global admin profile routes
  app.use('/api/global-admin', globalAdminProfileRoutes);
  
  // ISOLATED ONBOARDING ENDPOINT - MUST BE BEFORE ANY OTHER ROUTES
  app.post('/api/onboard-email-setting', express.json(), (req: any, res) => {
    console.log(`[ONBOARD-ENDPOINT] Hit! Body:`, req.body);
    
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    const result = {
      success: true,
      message: "Endpoint reached successfully",
      body: req.body
    };
    
    res.end(JSON.stringify(result));
    return;
  });

  // Regular user profile routes
  app.use('/api/profile', isAuthenticated, profileRoutes);
  
  // Dedicated endpoint for toggling email notifications (no auth required for onboarding)
  // Place this BEFORE any other middleware that might interfere
  app.post('/api/onboarding/email-notifications', async (req: any, res) => {
    try {
      let churchId = '';
      let userId = '';
      
      console.log('Email notifications request received:', {
        hasUser: !!req.user,
        bodyUserId: req.body.userId,
        bodyChurchId: req.body.churchId,
        sessionExists: !!req.session,
        body: req.body
      });
      
      console.log('Request headers:', req.headers['content-type']);
      
      // Handle both authenticated users and registration flow
      if (req.user) {
        // Authenticated user
        userId = req.user.id;
        churchId = req.user.churchId || req.user.id;
        console.log('Using authenticated user:', { userId, churchId });
      } else {
        // Registration flow - get userId and churchId from request body
        userId = req.body.userId || req.body.churchId;
        churchId = req.body.churchId || req.body.userId;
        console.log('Using registration flow:', { userId, churchId });
      }
      
      if (!churchId || !userId) {
        console.log('Missing required IDs:', { churchId, userId });
        return res.status(400).json({ message: 'Church ID and User ID are required' });
      }
      
      // Validate input
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: 'Invalid input: enabled must be a boolean' });
      }
      
      console.log(`Updating email notification setting for church ${churchId}: ${enabled}`);
      
      // Update church's email notification setting instead of user setting
      await storage.updateChurchEmailNotificationSetting(churchId, enabled);
      
      // Force JSON response with explicit headers
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(JSON.stringify({ success: true, message: 'Email notification setting updated successfully' }));
      return;
    } catch (error) {
      console.error('Error updating email notification setting:', error);
      return res.status(500).json({ message: 'An error occurred while updating settings' });
    }
  });
  
  // Settings routes including church logo management
  app.use('/api/settings', isAuthenticated, settingsRoutes);
  
  // Member data endpoints
  app.get('/api/members', isAuthenticated, checkTrialExpiration, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Fetching members for church ID: ${churchId}`);
      const members = await storage.getMembers(churchId);
      console.log(`Found ${members.length} members for church ID: ${churchId}`);
      
      res.json(members);
    } catch (error) {
      console.error('Error fetching members:', error);
      res.status(500).json({ message: 'Failed to fetch members' });
    }
  });
  
  // Service Options endpoints
  app.get('/api/service-options', isAuthenticated, checkTrialExpiration, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Fetching service options for church ID: ${churchId}`);
      const options = await storage.getServiceOptions(churchId);
      console.log(`Found ${options.length} service options for church ID: ${churchId}`);
      
      res.json(options);
    } catch (error) {
      console.error('Error fetching service options:', error);
      res.status(500).json({ message: 'Failed to fetch service options' });
    }
  });

  // Create service option endpoint for onboarding
  app.post('/api/service-options', async (req: any, res) => {
    try {
      const { name, churchId } = req.body;
      
      if (!name || !churchId) {
        return res.status(400).json({ message: 'Name and churchId are required' });
      }

      console.log(`Creating service option "${name}" for church ID: ${churchId}`);
      
      // Check if this is the first service option for this church
      const existingOptions = await storage.getServiceOptions(churchId);
      const isFirstOption = existingOptions.length === 0;
      
      // Create service option with proper data structure
      const serviceOptionData = {
        name: name.trim(),
        value: name.toLowerCase().replace(/\s+/g, '-'),
        churchId: churchId,
        isDefault: isFirstOption // First option is automatically set as default
      };

      const newOption = await storage.createServiceOption(serviceOptionData);
      console.log(`Service option "${name}" created successfully${isFirstOption ? ' (set as default)' : ''}`);
      
      res.status(201).json(newOption);
    } catch (error) {
      console.error('Error creating service option:', error);
      res.status(500).json({ message: 'Failed to create service option' });
    }
  });
  
  // Add debugging middleware specifically for this route
  app.patch('/api/service-options/:id', (req, res, next) => {
    console.log(`🔥 PATCH REQUEST INTERCEPTED: ${req.method} ${req.path} - Body:`, req.body);
    next();
  }, isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(401).json({ message: 'Church ID not found' });
      }
      
      console.log(`PATCH /api/service-options/${id} - Church ID: ${churchId} - Data:`, req.body);
      
      const updatedOption = await storage.updateServiceOption(id, req.body, churchId);
      console.log(`Update result:`, updatedOption);
      
      if (!updatedOption) {
        console.log(`Service option ${id} not found for church ${churchId}`);
        return res.status(404).json({ message: 'Service option not found' });
      }
      
      console.log(`SUCCESS: Service option ${id} updated:`, JSON.stringify(updatedOption, null, 2));
      console.log(`Returning JSON response with updatedOption`);
      
      // Return simple success response to avoid serialization issues
      return res.status(200).json({ 
        id: updatedOption.id,
        name: updatedOption.name,
        value: updatedOption.value,
        isDefault: updatedOption.isDefault,
        churchId: updatedOption.churchId
      });
    } catch (error) {
      console.error('Error updating service option:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: 'Failed to update service option' });
    }
  });
  
  // Report Recipients endpoints
  app.get('/api/report-recipients', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Fetching report recipients for church ID: ${churchId}`);
      const recipients = await storage.getReportRecipients(churchId);
      console.log(`Found ${recipients.length} report recipients for church ID: ${churchId}`);
      
      res.json(recipients);
    } catch (error) {
      console.error('Error fetching report recipients:', error);
      res.status(500).json({ message: 'Failed to fetch report recipients' });
    }
  });
  
  // Add report recipient endpoint
  app.post('/api/report-recipients', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      const { firstName, lastName, email } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: 'First name, last name, and email are required' });
      }
      
      console.log(`Creating report recipient for church ID: ${churchId}`, { firstName, lastName, email });
      
      const newRecipient = await storage.createReportRecipient({
        firstName,
        lastName,
        email,
        churchId
      });
      
      console.log(`Created report recipient with ID: ${newRecipient.id}`, newRecipient);
      
      // Ensure we're setting the correct content type
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(newRecipient);
    } catch (error) {
      console.error('Error creating report recipient:', error);
      res.status(500).json({ message: 'Failed to create report recipient' });
    }
  });
  
  // Update report recipient endpoint
  app.patch('/api/report-recipients/:id', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      const recipientId = parseInt(req.params.id);
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: 'Invalid recipient ID' });
      }
      
      const { firstName, lastName, email } = req.body;
      
      console.log(`Updating report recipient ${recipientId} for church ID: ${churchId}`);
      
      const updatedRecipient = await storage.updateReportRecipient(recipientId, {
        firstName,
        lastName,
        email
      }, churchId);
      
      if (!updatedRecipient) {
        return res.status(404).json({ message: 'Report recipient not found' });
      }
      
      console.log(`Updated report recipient with ID: ${updatedRecipient.id}`);
      res.json(updatedRecipient);
    } catch (error) {
      console.error('Error updating report recipient:', error);
      res.status(500).json({ message: 'Failed to update report recipient' });
    }
  });
  
  // Delete report recipient endpoint
  app.delete('/api/report-recipients/:id', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      const recipientId = parseInt(req.params.id);
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: 'Invalid recipient ID' });
      }
      
      console.log(`Deleting report recipient ${recipientId} for church ID: ${churchId}`);
      
      await storage.deleteReportRecipient(recipientId, churchId);
      
      console.log(`Deleted report recipient with ID: ${recipientId}`);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting report recipient:', error);
      res.status(500).json({ message: 'Failed to delete report recipient' });
    }
  });
  
  // Planning Center connection status endpoint
  app.get('/api/planning-center/status', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Checking Planning Center connection status for church ID: ${churchId}`);
      
      // Check if any Planning Center tokens exist for this church (regardless of user)
      const tokens = await storage.getPlanningCenterTokensByChurchId(churchId);
      
      if (tokens) {
        console.log(`Planning Center connection found for church ID: ${churchId}`);
        
        // Get extra Planning Center data that might be stored
        const lastSyncDate = tokens.lastSyncDate ? new Date(tokens.lastSyncDate).toISOString() : null;
        const peopleCount = typeof tokens.peopleCount === 'number' ? tokens.peopleCount : 0;
        
        res.json({
          connected: true,
          lastSyncDate: lastSyncDate,
          peopleCount: peopleCount
        });
      } else {
        console.log(`No Planning Center connection found for church ID: ${churchId}`);
        res.json({ connected: false });
      }
    } catch (error) {
      console.error('Error checking Planning Center connection status:', error);
      res.status(500).json({ message: 'Failed to check Planning Center connection status' });
    }
  });
  
  // Get CSV import statistics for church
  app.get('/api/csv-import/stats', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || '';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Fetching CSV import stats for church ID: ${churchId}`);
      
      const stats = await storage.getCsvImportStats(churchId);
      
      if (stats) {
        res.json({
          lastImportDate: stats.lastImportDate,
          importCount: stats.importCount,
          totalMembersImported: stats.totalMembersImported
        });
      } else {
        res.json({});
      }
    } catch (error) {
      console.error('Error fetching CSV import stats:', error);
      res.status(500).json({ message: 'Failed to fetch CSV import statistics' });
    }
  });
  


  // Configure multer for logo uploads
  const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/logos/');
    },
    filename: (req, file, cb) => {
      const timestamp = Date.now();
      const extension = path.extname(file.originalname);
      cb(null, `church-logo-${timestamp}${extension}`);
    }
  });

  const logoUpload = multer({
    storage: logoStorage,
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'), false);
      }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
  });

  // Logo upload for onboarding (unauthenticated) - now properly handles file uploads
  app.post('/api/upload-logo', logoUpload.single('logo'), async (req: any, res) => {
    try {
      const { churchId } = req.body;
      if (!churchId) {
        console.error('No church ID provided in logo upload request');
        return res.status(400).json({ message: 'Church ID is required' });
      }

      if (!req.file) {
        console.error('No logo file provided in upload request');
        return res.status(400).json({ message: 'No logo file uploaded' });
      }

      console.log(`✅ ONBOARDING LOGO: Processing actual file upload for church ${churchId}`, {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });

      // Create both local and S3 URLs for the logo
      const logoUrl = `/logos/${req.file.filename}`;
      const s3LogoUrl = `https://repl-plates-image-repo.s3.amazonaws.com/logos/${req.file.filename}`;

      // Store the logo URL for this church during onboarding
      await storage.updateOnboardingLogo(churchId, s3LogoUrl);

      console.log(`✅ ONBOARDING LOGO: Stored logo URL: ${s3LogoUrl} for church ${churchId}`);

      res.status(200).json({
        message: 'Logo uploaded successfully',
        logoUrl: logoUrl,
        s3LogoUrl: s3LogoUrl
      });
    } catch (error) {
      console.error('Onboarding logo upload error:', error);
      res.status(500).json({
        message: 'Server error while uploading logo',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });



  // Add Member endpoint for quick member creation  
  app.post('/api/members/create', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      console.log('=== POST /api/members endpoint hit ===');
      console.log('Request body:', req.body);
      console.log('User:', req.user);
      
      const user = req.user;
      const churchId = user?.churchId || user?.id || '';
      
      console.log('Church ID determined:', churchId);
      
      if (!churchId) {
        console.log('No church ID found, returning error');
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      const { firstName, lastName, email, phone } = req.body;
      
      if (!firstName || !lastName) {
        console.log('Missing required fields, returning error');
        return res.status(400).json({ message: 'First name and last name are required' });
      }
      
      console.log(`Creating new member for church ID: ${churchId}`, { firstName, lastName, email, phone });
      
      const newMember = await storage.createMember({
        firstName,
        lastName,
        email: email || null,
        phone: phone || null
      }, churchId);
      
      console.log(`Created new member with ID: ${newMember.id}`);
      
      // Set content type explicitly
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(newMember);
    } catch (error) {
      console.error('Error creating member:', error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: 'Failed to create member' });
    }
  });

  // Delete Member endpoint (soft delete)
  app.post('/api/members/:memberId/remove', isAuthenticated, restrictSuspendedChurchAccess, async (req: any, res) => {
    try {
      const user = req.user;
      const churchId = user?.churchId || user?.id || '';
      const memberId = parseInt(req.params.memberId);
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      if (!memberId || isNaN(memberId)) {
        return res.status(400).json({ message: 'Valid member ID is required' });
      }
      
      console.log(`Attempting to soft delete member ${memberId} for church ${churchId}`);
      
      // Check for open donations and attempt soft delete
      console.log(`DEBUG: About to call softDeleteMember for member ${memberId}, church ${churchId}`);
      const result = await storage.softDeleteMember(memberId, churchId);
      console.log(`DEBUG: softDeleteMember returned:`, result);
      
      if (!result.success) {
        if (result.error === 'Member has donations in open counts') {
          const countNames = result.openCounts || [];
          const countText = countNames.length === 1 ? 'count' : 'counts';
          const countList = countNames.join(', ');
          
          return res.status(400).json({ 
            message: `Cannot delete member: They have donations in open ${countText} (${countList}). Please finalize these counts first or reassign the donations.`,
            error: 'HAS_OPEN_DONATIONS',
            openCounts: countNames
          });
        } else {
          return res.status(404).json({ message: result.error || 'Member not found or already inactive' });
        }
      }
      
      console.log(`Successfully soft deleted member ${memberId}`);
      res.json({ message: 'Member deleted successfully' });
    } catch (error) {
      console.error('Error deleting member:', error);
      res.status(500).json({ message: 'Failed to delete member' });
    }
  });

  // CSV Member Import endpoint
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
  });
  
  app.post('/api/members/import', upload.single('csvFile'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No CSV file provided' });
      }
      
      // Handle both authenticated users and registration flow
      const user = req.user;
      let churchId = '';
      let userId = '';
      
      if (user) {
        // Authenticated user - use their church ID and check for suspended access
        churchId = user.churchId || user.id || '';
        userId = user.id || '';
        
        // Check if church access is suspended for authenticated users
        const churchUser = await storage.getUser(churchId);
        if (churchUser && churchUser.status === 'suspended') {
          return res.status(403).json({ 
            message: 'Church access is suspended. Please update your subscription to continue using PlateSync.' 
          });
        }
      } else {
        // Registration flow - get church ID from request body
        churchId = req.body.churchId || '';
        userId = req.body.userId || churchId; // Use provided user ID or fall back to church ID
        
        console.log(`CSV IMPORT DURING REGISTRATION: churchId=${churchId}, userId=${userId}`);
      }
      
      const replaceAll = req.body.replaceAll === 'true';
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Processing CSV import for church ID: ${churchId}, file size: ${req.file.size} bytes, replaceAll: ${replaceAll}`);
      
      // Parse CSV data
      const csvContent = req.file.buffer.toString('utf8');
      let records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      // Normalize header names and validate required fields
      records = records.map((record: any) => {
        const normalizedRecord: any = {};
        Object.keys(record).forEach(key => {
          const normalizedKey = key.trim().toLowerCase();
          
          if (normalizedKey.includes('first') && normalizedKey.includes('name')) {
            normalizedRecord.firstName = record[key];
          } else if (normalizedKey.includes('last') && normalizedKey.includes('name')) {
            normalizedRecord.lastName = record[key];
          } else if (normalizedKey.includes('email')) {
            normalizedRecord.email = record[key];
          } else if (
            (normalizedKey.includes('phone') || normalizedKey.includes('mobile') || normalizedKey.includes('cell')) && 
            !normalizedKey.includes('home')
          ) {
            normalizedRecord.phone = record[key];
          } else if (normalizedKey.includes('note')) {
            normalizedRecord.notes = record[key];
          }
        });
        
        return normalizedRecord;
      });
      
      // Filter out records without required name fields
      const validRecords = records.filter((record: any) => record.firstName && record.lastName);
      
      if (validRecords.length === 0) {
        return res.status(400).json({ message: 'No valid records found in the CSV file' });
      }
      
      console.log(`Found ${validRecords.length} valid records out of ${records.length} total records`);
      
      let result;
      if (replaceAll) {
        // Use merge and update approach to preserve donation history
        console.log(`Merging and updating members for church ${churchId}`);
        result = await storage.mergeAndUpdateMembers(churchId, validRecords);
        console.log(`Merge complete: ${result.updated} updated, ${result.added} added`);
        
        // Record the import stats in the database
        await storage.updateCsvImportStats(userId, churchId, result.added + result.updated);
      } else {
        // Import the members using the shared import function (add only new)
        result = await importMembers(validRecords, churchId);
        
        console.log(`CSV IMPORT RESULT: imported=${result.importedCount}, skipped=${result.duplicatesSkipped}, total=${validRecords.length}`);
        
        // Record the import stats in the database
        await storage.updateCsvImportStats(userId, churchId, result.importedCount);
      }
      
      // Invalidate relevant cache
      await queryClient.invalidateQueries(['/api/csv-import/stats']);
      
      // Return success response
      if (replaceAll) {
        res.status(200).json({
          success: true,
          importedCount: result.added + result.updated,
          totalRecords: validRecords.length,
          updatedCount: result.updated,
          addedCount: result.added
        });
      } else {
        res.status(200).json({
          success: true,
          importedCount: result.importedCount,
          totalRecords: validRecords.length,
          duplicatesSkipped: result.duplicatesSkipped || 0
        });
      }
      
    } catch (error) {
      console.error('Error processing CSV import:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to import members from CSV' 
      });
    }
  });
  
  // SendGrid configuration endpoints for global admin
  app.get('/api/global-admin/integrations/sendgrid', requireGlobalAdmin, async (req, res) => {
    try {
      console.log('Fetching SendGrid configuration...');
      
      // Direct SQL query to bypass any potential ORM issues
      const query = `SELECT * FROM system_config WHERE key IN ('SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL')`;
      const { rows } = await db.$client.query(query);
      
      // Convert rows to a map for easier access
      const configMap = {};
      rows.forEach(row => {
        configMap[row.key] = row.value;
      });
      
      console.log('Found configuration entries:', rows.length);
      
      res.json({
        apiKey: configMap['SENDGRID_API_KEY'] ? '************' : '', // Mask the API key for security
        fromEmail: configMap['SENDGRID_FROM_EMAIL'] || ''
      });
    } catch (error) {
      console.error('Error fetching SendGrid config:', error);
      res.status(500).json({ message: 'Failed to fetch SendGrid configuration' });
    }
  });
  
  app.post('/api/global-admin/integrations/sendgrid', requireGlobalAdmin, async (req, res) => {
    try {
      console.log('Saving SendGrid configuration...');
      const { apiKey, fromEmail } = req.body;
      
      if (!fromEmail) {
        return res.status(400).json({ message: 'From Email is required' });
      }
      
      // Direct SQL queries to bypass ORM issues
      try {
        // Save From Email
        const checkFromEmail = `SELECT * FROM system_config WHERE key = 'SENDGRID_FROM_EMAIL'`;
        const fromEmailResult = await db.$client.query(checkFromEmail);
        
        if (fromEmailResult.rows.length > 0) {
          await db.$client.query(
            `UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = 'SENDGRID_FROM_EMAIL'`,
            [fromEmail]
          );
        } else {
          await db.$client.query(
            `INSERT INTO system_config (key, value) VALUES ('SENDGRID_FROM_EMAIL', $1)`,
            [fromEmail]
          );
        }
        
        // Only update API key if it was provided (not masked)
        if (apiKey && !apiKey.includes('*')) {
          const checkApiKey = `SELECT * FROM system_config WHERE key = 'SENDGRID_API_KEY'`;
          const apiKeyResult = await db.$client.query(checkApiKey);
          
          if (apiKeyResult.rows.length > 0) {
            await db.$client.query(
              `UPDATE system_config SET value = $1, updated_at = NOW() WHERE key = 'SENDGRID_API_KEY'`,
              [apiKey]
            );
          } else {
            await db.$client.query(
              `INSERT INTO system_config (key, value) VALUES ('SENDGRID_API_KEY', $1)`,
              [apiKey]
            );
          }
          
          // Update environment variable for the current session
          process.env.SENDGRID_API_KEY = apiKey;
        }
        
        // Update environment variable for the current session
        process.env.SENDGRID_FROM_EMAIL = fromEmail;
        
        // Log success for debugging
        console.log('SendGrid configuration updated successfully');
        console.log('- From Email:', fromEmail);
        console.log('- API Key set:', !!apiKey);
        
        res.json({ success: true, message: 'SendGrid configuration saved successfully' });
      } catch (dbError) {
        console.error('Database error saving SendGrid config:', dbError);
        res.status(500).json({ message: 'Database error: Failed to save SendGrid configuration' });
      }
    } catch (error) {
      console.error('Error saving SendGrid config:', error);
      res.status(500).json({ message: 'Failed to save SendGrid configuration' });
    }
  });
  
  app.post('/api/global-admin/integrations/sendgrid/test', requireGlobalAdmin, async (req, res) => {
    try {
      const { emailTo } = req.body;
      
      if (!emailTo) {
        return res.status(400).json({ message: 'Test recipient email is required' });
      }
      
      const apiKey = await storage.getSystemConfig('SENDGRID_API_KEY');
      const fromEmail = await storage.getSystemConfig('SENDGRID_FROM_EMAIL');
      
      if (!apiKey || !fromEmail) {
        return res.status(400).json({ message: 'SendGrid is not configured yet' });
      }
      
      // Set up SendGrid with the configured API key
      // Import using ES modules syntax
      const { MailService } = await import('@sendgrid/mail');
      const sgMail = new MailService();
      sgMail.setApiKey(apiKey);
      
      // Send a test email
      const msg = {
        to: emailTo,
        from: fromEmail,
        subject: 'PlateSync SendGrid Integration Test',
        text: 'This is a test email from PlateSync to verify your SendGrid integration is working correctly.',
        html: '<strong>This is a test email from PlateSync to verify your SendGrid integration is working correctly.</strong>',
      };
      
      await sgMail.send(msg);
      
      res.json({ success: true, message: 'Test email sent successfully' });
    } catch (error) {
      console.error('Error sending test email:', error);
      let errorMessage = 'Failed to send test email';
      
      // Extract SendGrid specific error message if available
      if (error.response && error.response.body && error.response.body.errors) {
        errorMessage = error.response.body.errors.map(e => e.message).join(', ');
      }
      
      res.status(500).json({ message: errorMessage });
    }
  });
  
  // Set up Planning Center routes
  setupPlanningCenterRoutes(app);

  // AWS S3 Integration Routes
  app.get('/api/global-admin/integrations/aws-s3', requireGlobalAdmin, async (req, res) => {
    try {
      // Extract just the region code from AWS_REGION (e.g., "us-east-2" from "US East (Ohio) us-east-2")
      const rawRegion = process.env.AWS_REGION || '';
      const region = rawRegion.includes(' ') ? rawRegion.split(' ').pop() || rawRegion : rawRegion;
      
      res.json({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        region: region,
        bucketName: process.env.AWS_S3_BUCKET || '',
      });
    } catch (error) {
      console.error("Error fetching AWS S3 settings:", error);
      res.status(500).json({ error: "Failed to fetch AWS S3 settings" });
    }
  });

  app.put('/api/global-admin/integrations/aws-s3', requireGlobalAdmin, async (req, res) => {
    try {
      res.json({ 
        message: "AWS S3 settings are managed through Replit secrets",
        note: "Your AWS credentials are securely stored and already configured"
      });
    } catch (error) {
      console.error("Error updating AWS S3 settings:", error);
      res.status(500).json({ error: "Failed to update AWS S3 settings" });
    }
  });

  app.post('/api/global-admin/integrations/aws-s3/test', requireGlobalAdmin, async (req, res) => {
    try {
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      // Extract just the region code from AWS_REGION (same as in GET endpoint)
      const rawRegion = process.env.AWS_REGION || '';
      const region = rawRegion.includes(' ') ? rawRegion.split(' ').pop() || rawRegion : rawRegion;
      const bucketName = process.env.AWS_S3_BUCKET;
      
      if (!accessKeyId || !secretAccessKey || !region || !bucketName) {
        return res.json({ 
          success: false, 
          error: "AWS credentials are not properly configured in environment secrets" 
        });
      }
      
      const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
      
      const s3Client = new S3Client({
        region: region,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
      });

      const command = new HeadBucketCommand({ Bucket: bucketName });
      await s3Client.send(command);
      
      res.json({ 
        success: true, 
        message: "AWS S3 connectivity test successful! Bucket is accessible." 
      });
    } catch (error: any) {
      console.error("AWS S3 connectivity test failed:", error);
      res.json({ 
        success: false, 
        error: error.message || "Failed to connect to AWS S3" 
      });
    }
  });
  
  // If in development, add test endpoints
  if (process.env.NODE_ENV === 'development') {
    setupTestEndpoints(app);
  }
  
  // Batch Routes - API endpoints for managing batches
  
  // Get all batches for the authenticated user's church
  app.get('/api/batches', isAuthenticated, checkTrialExpiration, async (req: any, res) => {
    try {
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      console.log(`Fetching batches for church ID: ${churchId}`);
      
      const batches = await storage.getBatches(churchId);
      console.log(`Found ${batches.length} batches for church ID: ${churchId}`);
      
      res.json(batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
      res.status(500).json({ message: 'Failed to fetch batches' });
    }
  });
  
  // Get the latest finalized batch for the authenticated user's church
  app.get('/api/batches/latest-finalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      console.log(`Fetching latest finalized batch for church ID: ${churchId}`);
      
      const batch = await storage.getLatestFinalizedBatch(churchId);
      
      if (!batch) {
        console.log(`No finalized batches found for church ID: ${churchId}`);
        return res.status(404).json({ message: 'No finalized batches found' });
      }
      
      console.log(`Found latest finalized batch: ${batch.id} for church ID: ${churchId}`);
      res.json(batch);
    } catch (error) {
      console.error('Error fetching latest finalized batch:', error);
      res.status(500).json({ message: 'Failed to fetch latest finalized batch' });
    }
  });
  
  // Get a specific batch with its donations
  app.get('/api/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Fetching batch ${batchId} for church ID: ${churchId}`);
      const batch = await storage.getBatchWithDonations(batchId, churchId);
      
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      res.json(batch);
    } catch (error) {
      console.error('Error fetching batch with donations:', error);
      res.status(500).json({ message: 'Failed to fetch batch details' });
    }
  });
  
  // Get donations for a specific batch
  app.get('/api/batches/:id/donations', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Fetching donations for batch ${batchId} and church ID: ${churchId}`);
      const donationList = await storage.getDonationsByBatch(batchId, churchId);
      
      res.json(donationList);
    } catch (error) {
      console.error('Error fetching donations for batch:', error);
      res.status(500).json({ message: 'Failed to fetch donations' });
    }
  });
  
  // Add a new donation
  app.post('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      const donationData = {
        ...req.body,
        churchId
      };
      
      // If date is a string (e.g. "2025-05-19"), convert it to a proper Date object
      if (donationData.date && typeof donationData.date === 'string') {
        try {
          // Parse the date string and create a proper Date object
          const dateStr = donationData.date.trim();
          const dateObj = new Date(dateStr);
          
          // Check if date is valid
          if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date format');
          }
          
          donationData.date = dateObj;
        } catch (dateError) {
          console.error('Error parsing donation date:', dateError);
          return res.status(400).json({ message: 'Invalid date format' });
        }
      }
      
      // Convert amount from string to number if needed
      if (donationData.amount && typeof donationData.amount === 'string') {
        donationData.amount = parseFloat(donationData.amount);
      }
      
      console.log(`Creating donation for batch ${donationData.batchId} and church ID: ${churchId}`);
      const newDonation = await storage.createDonation(donationData);
      
      res.status(200).json(newDonation);
    } catch (error) {
      console.error('Error creating donation:', error);
      res.status(500).json({ message: 'Failed to create donation' });
    }
  });
  
  // Delete a donation
  app.delete('/api/donations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const donationId = parseInt(req.params.id);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ message: 'Invalid donation ID' });
      }
      
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Deleting donation ${donationId} for church ID: ${churchId}`);
      const deletedDonation = await storage.deleteDonation(donationId, churchId);
      
      if (!deletedDonation) {
        return res.status(404).json({ message: 'Donation not found or already deleted' });
      }
      
      res.status(200).json({ success: true, id: donationId });
    } catch (error) {
      console.error('Error deleting donation:', error);
      res.status(500).json({ message: 'Failed to delete donation' });
    }
  });
  
  // Primary attestation endpoint for batch
  app.post('/api/batches/:id/attest-primary', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      // Prepare attestation data
      const attestationData = {
        ...req.body,
        batchId,
        attestorId: userId,
        attestorName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        attestationDate: new Date()
      };
      
      console.log(`Primary attestation for batch ${batchId} and church ID: ${churchId}`);
      const updatedBatch = await storage.updateBatchPrimaryAttestation(batchId, churchId, attestationData);
      
      res.status(200).json(updatedBatch);
    } catch (error) {
      console.error('Error during primary attestation:', error);
      res.status(500).json({ message: 'Failed to perform primary attestation' });
    }
  });
  
  // Secondary attestation endpoint for batch
  app.post('/api/batches/:id/attest-secondary', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      // For secondary attestation, we should use the attestorId from the request body
      // to get the correct attestor name, not the current user's ID
      let attestorName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      
      // If attestorId is provided in the request and it's different from the current user
      if (req.body.attestorId && req.body.attestorId !== userId) {
        // Fetch the user with the provided attestorId to get their full name
        const secondaryAttestor = await storage.getUser(req.body.attestorId);
        if (secondaryAttestor) {
          attestorName = `${secondaryAttestor.firstName || ''} ${secondaryAttestor.lastName || ''}`.trim();
        }
      }
      
      // Prepare attestation data
      const attestationData = {
        ...req.body,
        batchId,
        attestorId: req.body.attestorId || userId, // Use provided attestorId or default to current userId
        attestorName: attestorName,
        attestationDate: new Date()
      };
      
      console.log(`Secondary attestation for batch ${batchId} and church ID: ${churchId}`);
      const updatedBatch = await storage.updateBatchSecondaryAttestation(batchId, churchId, attestationData);
      
      res.status(200).json(updatedBatch);
    } catch (error) {
      console.error('Error during secondary attestation:', error);
      res.status(500).json({ message: 'Failed to perform secondary attestation' });
    }
  });
  
  // Confirm attestation endpoint for batch finalization
  app.post('/api/batches/:id/confirm-attestation', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Confirming attestation for batch ${batchId} for church ID: ${churchId}`);
      const updatedBatch = await storage.finalizeBatch(batchId, churchId, userId);
      
      if (!updatedBatch) {
        return res.status(404).json({ message: 'Batch not found or could not be finalized' });
      }
      
      res.status(200).json(updatedBatch);
    } catch (error) {
      console.error('Error confirming attestation:', error);
      res.status(500).json({ message: 'Failed to confirm attestation' });
    }
  });
  
  // Final confirmation endpoint for batch
  app.post('/api/batches/:id/finalize', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Finalizing batch ${batchId} for church ID: ${churchId}`);
      const updatedBatch = await storage.finalizeBatch(batchId, churchId, userId);
      
      res.status(200).json(updatedBatch);
    } catch (error) {
      console.error('Error finalizing batch:', error);
      res.status(500).json({ message: 'Failed to finalize batch' });
    }
  });
  
  // PDF Report generation endpoint for batch
  app.get('/api/batches/:id/pdf-report', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      // Fetch the batch data
      const batch = await storage.getBatch(batchId, churchId);
      if (!batch) {
        return res.status(404).json({ message: 'Batch not found' });
      }
      
      // Debug information about batch data with better visibility
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++');
      console.log('PDF GENERATION DEBUG INFO');
      console.log('Batch status:', batch.status);
      console.log('Attestation info:');
      console.log('  - Primary Attestor:', batch.primaryAttestorName);
      console.log('  - Secondary Attestor:', batch.secondaryAttestorName);
      console.log('  - Attestation Date:', batch.attestationConfirmationDate);
      console.log('  - Has primaryAttestorName:', !!batch.primaryAttestorName);
      console.log('  - Has secondaryAttestorName:', !!batch.secondaryAttestorName);
      console.log('  - Has attestationConfirmationDate:', !!batch.attestationConfirmationDate);
      console.log('+++++++++++++++++++++++++++++++++++++++++++++++++++');
      
      // Fetch all donations for this batch
      const batchDonations = await storage.getDonationsByBatch(batchId, churchId);
      
      // Get member data for each donation if possible
      for (const donation of batchDonations) {
        if (donation.memberId) {
          try {
            const member = await storage.getMember(donation.memberId, churchId);
            if (member) {
              donation.member = member;
            }
          } catch (err) {
            console.error(`Failed to fetch member data for member ID ${donation.memberId}:`, err);
          }
        }
      }

      // Calculate totals
      const cashDonations = batchDonations.filter(d => d.donationType === 'CASH');
      const checkDonations = batchDonations.filter(d => d.donationType === 'CHECK');
      
      const cashTotal = cashDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
      const checkTotal = checkDonations.reduce((sum, d) => sum + parseFloat(d.amount.toString()), 0);
      const total = cashTotal + checkTotal;
      
      // Helper function to format currency with thousands separators
      function formatCurrency(amount: string | number): string {
        // Convert to number if it's a string
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        
        // Format with thousands separator and 2 decimal places
        const numStr = numAmount.toFixed(2);
        
        // Format with commas for thousands
        const parts = numStr.split('.');
        const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return `$${integerPart}.${parts[1]}`;
      }
      
      try {
        // Import modules dynamically
        const PDFKit = await import('pdfkit');
        const fs = await import('fs');
        
        // Format the date for the report
        const formattedDate = new Date(batch.date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="count-report-${batchId}.pdf"`);
        
        // Create PDF document with margins
        const doc = new PDFKit.default({ 
          margin: 50,
          size: 'letter',
          autoFirstPage: true
        });
        
        // Pipe the PDF to the response
        doc.pipe(res);
        
        // Set up constants for layout
        const pageWidth = doc.page.width;
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);
        
        // Set up table constants
        const leftColX = margin;
        const rightMargin = margin;
        const amountColX = pageWidth - rightMargin - 100; 
        
        // Header - Logo (if available)
        let headerY = margin;
        let logoHeight = 0;
        
        try {
          // Get the church info for the logo
          const churchUser = await storage.getUser(churchId);
          let logoPath = null;
          
          // First try to find a local file based on the S3 URL
          if (churchUser && churchUser.churchLogoUrl && churchUser.churchLogoUrl.includes('s3.amazonaws.com')) {
            // Extract filename from S3 URL
            const urlParts = churchUser.churchLogoUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const localPath = `${process.cwd()}/public/logos/${filename}`;
            
            console.log(`Checking for logo at: ${localPath}`);
            if (fs.existsSync(localPath)) {
              logoPath = localPath;
              console.log(`Found logo at: ${logoPath}`);
            }
          }
          
          // If no S3-based logo found, try the user's churchLogoUrl (local path)
          if (!logoPath && user.churchLogoUrl) {
            const userLogoPath = `${process.cwd()}/public${user.churchLogoUrl}`;
            if (fs.existsSync(userLogoPath)) {
              logoPath = userLogoPath;
              console.log(`Found logo from user settings: ${logoPath}`);
            }
          }
          
          // If we found a logo, add it to the PDF
          if (logoPath) {
            // Position logo horizontally in the center
            const logoWidth = 312.5;
            const centerX = (pageWidth - logoWidth) / 2;
            
            // Draw the logo
            doc.image(logoPath, centerX, headerY, { 
              fit: [logoWidth, 125],
              align: 'center'
            });
            
            // Update the vertical position - give more space for the logo
            logoHeight = 125; // estimated logo height
            headerY = margin + logoHeight + 20; // add extra padding after logo
          } else {
            // If no logo file exists, use church name in large font
            doc.font('Helvetica-Bold').fontSize(24);
            doc.text(user.churchName || 'Church Count Report', margin, headerY, { 
              align: 'center',
              width: contentWidth
            });
            headerY += 30; // Move down after the church name
          }
        } catch (error) {
          console.error("Error rendering logo:", error);
          
          // Fallback to text if logo fails
          doc.font('Helvetica-Bold').fontSize(24);
          doc.text(user.churchName || 'Church Count Report', margin, headerY, { 
            align: 'center',
            width: contentWidth
          });
          headerY += 30; // Move down after the church name
        }
        
        // Title and date - positioned after the logo or church name
        // Set the cursor position explicitly instead of using moveDown
        doc.font('Helvetica-Bold').fontSize(18);
        doc.text('Finalized Count Report', margin, headerY, {
          align: 'center',
          width: contentWidth
        });
        
        // Move to the next position for the date
        headerY += 25;
        
        doc.font('Helvetica').fontSize(14);
        doc.text(formattedDate, margin, headerY, {
          align: 'center',
          width: contentWidth
        });
        
        // Move to the position for the content section
        doc.y = headerY + 30;
        
        // Summary section
        doc.font('Helvetica').fontSize(12);
        
        // First row - Checks
        let rowY = doc.y;
        doc.text('Checks', leftColX, rowY);
        doc.text(formatCurrency(checkTotal), amountColX, rowY, { align: 'right' });
        doc.moveDown(0.5);
        
        // Second row - Cash
        rowY = doc.y;
        doc.text('Cash', leftColX, rowY);
        doc.text(formatCurrency(cashTotal), amountColX, rowY, { align: 'right' });
        doc.moveDown(0.5);
        
        // Add a line
        doc.moveTo(leftColX, doc.y + 5)
           .lineTo(pageWidth - rightMargin, doc.y + 5)
           .stroke();
        doc.moveDown(1);
        
        // Total row
        rowY = doc.y;
        doc.font('Helvetica-Bold');
        doc.text('TOTAL', leftColX, rowY);
        doc.text(formatCurrency(total), amountColX, rowY, { align: 'right' });
        doc.moveDown(1.5);
        
        // CHECKS section
        if (checkDonations.length > 0) {
          doc.font('Helvetica-Bold').fontSize(14);
          doc.text('CHECKS', leftColX);
          doc.moveDown(0.5);
          
          // Check table header
          doc.font('Helvetica-Bold').fontSize(12);
          doc.text('Member / Donor', leftColX);
          doc.text('Check #', leftColX + 225, doc.y - doc.currentLineHeight());
          doc.text('Amount', amountColX, doc.y - doc.currentLineHeight(), { align: 'right' });
          doc.moveDown(0.5);
          
          // Add a line under header
          doc.moveTo(leftColX, doc.y)
             .lineTo(pageWidth - rightMargin, doc.y)
             .stroke();
          doc.moveDown(0.5);
          
          // Check items
          doc.font('Helvetica').fontSize(12);
          
          checkDonations.forEach(donation => {
            let donorName = 'Anonymous';
            if (donation.member) {
              donorName = `${donation.member.firstName} ${donation.member.lastName}`.trim();
            }
            
            const itemY = doc.y;
            doc.text(donorName, leftColX, itemY);
            doc.text(donation.checkNumber || '', leftColX + 225, itemY);
            doc.text(formatCurrency(donation.amount), amountColX, itemY, { align: 'right' });
            doc.moveDown(0.5);
          });
          
          // Add a line
          doc.moveTo(leftColX, doc.y)
             .lineTo(pageWidth - rightMargin, doc.y)
             .stroke();
          doc.moveDown(0.5);
          
          // Check subtotal row
          rowY = doc.y;
          doc.font('Helvetica-Bold');
          doc.text('Sub-Total Checks', leftColX, rowY);
          doc.text(formatCurrency(checkTotal), amountColX, rowY, { align: 'right' });
          doc.moveDown(1.5);
        }
        
        // CASH section
        if (cashDonations.length > 0) {
          doc.font('Helvetica-Bold').fontSize(14);
          doc.text('CASH', leftColX);
          doc.moveDown(0.5);
          
          // Cash table header
          doc.font('Helvetica-Bold').fontSize(12);
          doc.text('Member / Donor', leftColX);
          doc.text('Amount', amountColX, doc.y - doc.currentLineHeight(), { align: 'right' });
          doc.moveDown(0.5);
          
          // Add a line under header
          doc.moveTo(leftColX, doc.y)
             .lineTo(pageWidth - rightMargin, doc.y)
             .stroke();
          doc.moveDown(0.5);
          
          // Cash items
          doc.font('Helvetica').fontSize(12);
          
          cashDonations.forEach(donation => {
            let donorName = 'Anonymous';
            if (donation.member) {
              donorName = `${donation.member.firstName} ${donation.member.lastName}`.trim();
            }
            
            const itemY = doc.y;
            doc.text(donorName, leftColX, itemY);
            doc.text(formatCurrency(donation.amount), amountColX, itemY, { align: 'right' });
            doc.moveDown(0.5);
          });
          
          // Add a line
          doc.moveTo(leftColX, doc.y)
             .lineTo(pageWidth - rightMargin, doc.y)
             .stroke();
          doc.moveDown(0.5);
          
          // Cash subtotal row
          rowY = doc.y;
          doc.font('Helvetica-Bold');
          doc.text('Sub-Total Cash', leftColX, rowY);
          doc.text(formatCurrency(cashTotal), amountColX, rowY, { align: 'right' });
          doc.moveDown(1.5);
        }
        
        // GRAND TOTAL with double line
        doc.moveTo(leftColX, doc.y)
           .lineTo(pageWidth - rightMargin, doc.y)
           .stroke();
        doc.moveTo(leftColX, doc.y + 3)
           .lineTo(pageWidth - rightMargin, doc.y + 3)
           .stroke();
        doc.moveDown(0.5);
        
        // Grand total row
        rowY = doc.y;
        doc.font('Helvetica-Bold').fontSize(14);
        doc.text('GRAND TOTAL', leftColX, rowY);
        doc.text(formatCurrency(total), amountColX, rowY, { align: 'right' });
        
        // ALWAYS add attestation information - with hardcoded values for now
        // This will ensure it shows up regardless of the batch status
        {
          doc.moveDown(2);
          
          // Add a box for attestation details
          const boxY = doc.y;
          const boxHeight = 75; // Adjust based on content
          
          // Draw a light gray box
          doc.rect(leftColX, boxY, contentWidth, boxHeight)
             .fillAndStroke('#f5f5f5', '#d9d9d9');
          
          // Add title for attestation section
          doc.font('Helvetica-Bold').fontSize(12);
          doc.fillColor('#000000');
          doc.text('ATTESTATION INFORMATION', leftColX + 10, boxY + 10, { width: contentWidth - 20 });
          
          // Add actual attestation details from the batch
          doc.font('Helvetica').fontSize(10);
          
          // Primary attestor
          const primaryAttestor = batch.primaryAttestorName || "";
          if (primaryAttestor) {
            doc.text(`Primary Attestor: ${primaryAttestor}`, 
                   leftColX + 10, boxY + 30, { width: contentWidth - 20 });
          }
          
          // Secondary attestor
          const secondaryAttestor = batch.secondaryAttestorName || "";
          if (secondaryAttestor) {
            doc.text(`Secondary Attestor: ${secondaryAttestor}`, 
                   leftColX + 10, boxY + 45, { width: contentWidth - 20 });
          }
          
          // Finalization date/time
          if (batch.attestationConfirmationDate) {
            const confirmDate = new Date(batch.attestationConfirmationDate);
            const formattedConfirmDate = confirmDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            const formattedConfirmTime = confirmDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit'
            });
            
            doc.text(`Finalized on: ${formattedConfirmDate} at ${formattedConfirmTime}`, 
                   leftColX + 10, boxY + 60, { width: contentWidth - 20 });
          }
        }
        
        // Finalize the PDF
        doc.end();
      } catch (pdfError) {
        console.error('Error generating PDF:', pdfError);
        res.status(500).json({ message: 'Failed to generate PDF document' });
      }
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({ message: 'Failed to generate PDF report' });
    }
  });
  
  // Create a new batch
  app.post('/api/batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      // Process the date to ensure it's in the correct format
      const batchData = {
        ...req.body,
        churchId
      };
      
      // If date is a string (e.g. "2025-05-19"), convert it to a proper Date object
      if (batchData.date && typeof batchData.date === 'string') {
        try {
          // Parse the date string and create a proper Date object
          const dateStr = batchData.date.trim();
          const dateObj = new Date(dateStr);
          
          // Check if date is valid
          if (isNaN(dateObj.getTime())) {
            throw new Error('Invalid date format');
          }
          
          batchData.date = dateObj;
        } catch (dateError) {
          console.error('Error parsing date:', dateError);
          return res.status(400).json({ message: 'Invalid date format' });
        }
      }
      
      console.log(`Creating batch for church ID: ${churchId}`);
      const newBatch = await storage.createBatch(batchData);
      
      res.status(201).json(newBatch);
    } catch (error) {
      console.error('Error creating batch:', error);
      res.status(500).json({ message: 'Failed to create batch' });
    }
  });
  
  // Delete a batch and all associated donations
  app.delete('/api/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Only allow account owners to delete finalized batches
      if (!user.isAccountOwner) {
        // Check if this is a finalized batch
        const batch = await storage.getBatch(batchId, user.churchId || userId);
        if (batch && batch.status === 'FINALIZED') {
          return res.status(403).json({ 
            message: 'Only account owners can delete finalized counts' 
          });
        }
      }
      
      // Use the churchId from the user object, or fallback to using the userId as churchId
      const churchId = user.churchId || userId;
      
      console.log(`Deleting batch ${batchId} for church ID: ${churchId}`);
      
      // The deleteBatch function in storage.ts already handles deleting associated donations first
      await storage.deleteBatch(batchId, churchId);
      
      res.status(200).json({ message: 'Batch deleted successfully' });
    } catch (error) {
      console.error('Error deleting batch:', error);
      
      // Check for foreign key constraint violation
      if (error instanceof Error && error.message.includes('foreign key constraint')) {
        return res.status(400).json({ 
          message: 'Cannot delete this count because it has associated records. Please contact support.' 
        });
      }
      
      res.status(500).json({ message: 'Failed to delete batch' });
    }
  });
  
  // Email Template Routes
  
  // Get all email templates for a church
  app.get('/api/email-templates', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      
      const templates = await storage.getEmailTemplates(churchId);
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({ message: 'Failed to fetch email templates' });
    }
  });
  
  // Get email template by ID
  app.get('/api/email-templates/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const template = await storage.getEmailTemplate(templateId, churchId);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching email template:', error);
      res.status(500).json({ message: 'Failed to fetch email template' });
    }
  });
  
  // Get email template by type
  app.get('/api/email-templates/type/:type', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      const templateType = req.params.type;
      
      const template = await storage.getEmailTemplateByType(templateType, churchId);
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching email template by type:', error);
      res.status(500).json({ message: 'Failed to fetch email template' });
    }
  });
  
  // Update email template (PUT method)
  app.put('/api/email-templates/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const { subject, bodyHtml, bodyText } = req.body;
      
      if (!subject || !bodyHtml || !bodyText) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const updatedTemplate = await storage.updateEmailTemplate(templateId, {
        subject,
        bodyHtml,
        bodyText
      }, churchId);
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating email template:', error);
      res.status(500).json({ message: 'Failed to update email template' });
    }
  });
  
  // Update email template (PATCH method) - Fixed version with body parser
  app.patch('/api/email-templates/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      console.log('PATCH request received for template ID:', req.params.id);
      
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      // Express should already have parsed the body, but let's check it
      console.log('Request body type:', typeof req.body);
      console.log('Request body keys:', Object.keys(req.body));
      
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: 'Invalid request body' });
      }
      
      const { subject, bodyHtml, bodyText } = req.body;
      
      if (!subject) {
        console.log('Subject is missing');
        return res.status(400).json({ message: 'Subject is required' });
      }
      
      if (!bodyHtml) {
        console.log('HTML body is missing');
        return res.status(400).json({ message: 'HTML body is required' });
      }
      
      if (!bodyText) {
        console.log('Text body is missing');
        return res.status(400).json({ message: 'Text body is required' });
      }
      
      console.log('Updating template with ID:', templateId);
      console.log('Subject:', subject.substring(0, 30) + '...');
      console.log('HTML body length:', bodyHtml.length);
      console.log('Text body length:', bodyText.length);
      
      const updatedTemplate = await storage.updateEmailTemplate(templateId, {
        subject,
        bodyHtml,
        bodyText
      }, churchId);
      
      if (!updatedTemplate) {
        console.log('Template not found for ID:', templateId, 'Church ID:', churchId);
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      console.log('Template updated successfully');
      return res.status(200).json(updatedTemplate);
    } catch (error) {
      console.error('Error updating email template:', error);
      return res.status(500).json({ message: 'Failed to update email template', error: error.message });
    }
  });
  
  // Initialize default email templates for a church
  app.post('/api/email-templates/initialize', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      
      // Get church details from user record (since churchId references users.id)
      const churchUser = await storage.getUser(churchId);
      if (!churchUser) {
        return res.status(404).json({ message: 'Church user not found' });
      }
      
      // Check if templates already exist - only get church templates, not system templates
      const existingTemplates = await storage.getEmailTemplates(churchId);
      // Filter out any system templates that might accidentally be included
      const churchTemplates = existingTemplates.filter(t => t.churchId === churchId && t.churchId !== 'SYSTEM_TEMPLATES');
      const existingTypes = churchTemplates.map(t => t.templateType);
      
      const templates = [];
      
      // Create donation confirmation template if it doesn't exist
      if (!existingTypes.includes('DONATION_CONFIRMATION')) {
        const donationTemplate = await storage.createEmailTemplate({
          templateType: 'DONATION_CONFIRMATION',
          subject: 'Thank you for your donation to {{churchName}}',
          bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Donation Confirmation</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #777;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .amount {
      font-weight: bold;
      color: #4caf50;
    }
    .donation-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if churchLogoUrl}}
    <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" class="logo">
    {{/if}}
    <h2>{{churchName}}</h2>
  </div>
  
  <p>Dear {{donorName}},</p>
  
  <p>Thank you for your generous donation to {{churchName}}. Your support helps us continue our mission and serve our community.</p>
  
  <div class="donation-details">
    <p><strong>Donation Amount:</strong> <span class="amount">$\{{amount}}</span></p>
    <p><strong>Date:</strong> {{date}}</p>
    <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
  </div>
  
  <p>Your contribution makes a difference in the lives of those we serve. We are grateful for your continued support of our ministry.</p>
  
  <p>Blessings,<br>
  {{churchName}} Team</p>
  
  <div class="footer">
    <p>This is an automated email. Please do not reply to this message.</p>
    <p>&copy; {{currentYear}} {{churchName}}. All rights reserved.</p>
  </div>
</body>
</html>`,
          bodyText: `Thank you for your donation to {{churchName}}

Dear {{donorName}},

Thank you for your generous donation to {{churchName}}. Your support helps us continue our mission and serve our community.

Donation Details:
Amount: $\{{amount}}
Date: {{date}}
Payment Method: {{paymentMethod}}

Your contribution makes a difference in the lives of those we serve. We are grateful for your continued support of our ministry.

Blessings,
{{churchName}} Team

---
This is an automated email. Please do not reply to this message.
© {{currentYear}} {{churchName}}. All rights reserved.`,
          churchId: churchId
        });
        
        templates.push(donationTemplate);
      }
      
      // Create count report template if it doesn't exist
      if (!existingTypes.includes('COUNT_REPORT')) {
        const countReportTemplate = await storage.createEmailTemplate({
          templateType: 'COUNT_REPORT',
          subject: '{{churchName}} Donation Count Report - {{date}}',
          bodyHtml: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Donation Count Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .logo {
      max-width: 150px;
      max-height: 80px;
      margin-bottom: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 1px solid #eee;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #777;
      border-top: 1px solid #eee;
      padding-top: 20px;
    }
    .report-details {
      background-color: #f9f9f9;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
    .total {
      font-weight: bold;
      color: #4caf50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
  </style>
</head>
<body>
  <div class="header">
    {{#if churchLogoUrl}}
    <img src="{{churchLogoUrl}}" alt="{{churchName}} Logo" class="logo">
    {{/if}}
    <h2>{{churchName}} - Donation Count Report</h2>
  </div>
  
  <p>Hello,</p>
  
  <p>Please find attached the donation count report for {{date}} at {{churchName}}.</p>
  
  <div class="report-details">
    <p><strong>Service:</strong> {{serviceType}}</p>
    <p><strong>Total Amount:</strong> <span class="total">$\{{totalAmount}}</span></p>
    <p><strong>Total Donations:</strong> {{totalDonations}}</p>
    <p><strong>Counters:</strong> {{counterNames}}</p>
  </div>
  
  <p>This count has been finalized and recorded in the system. If you have any questions or notice any discrepancies, please contact your administrator.</p>
  
  <p>Thank you for your service to {{churchName}}.</p>
  
  <p>Blessings,<br>
  {{churchName}} Team</p>
  
  <div class="footer">
    <p>This is an automated email. Please do not reply to this message.</p>
    <p>&copy; {{currentYear}} {{churchName}}. All rights reserved.</p>
  </div>
</body>
</html>`,
          bodyText: `{{churchName}} - Donation Count Report

Hello,

Please find attached the donation count report for {{date}} at {{churchName}}.

Report Details:
Service: {{serviceType}}
Total Amount: $\{{totalAmount}}
Total Donations: {{totalDonations}}
Counters: {{counterNames}}

This count has been finalized and recorded in the system. If you have any questions or notice any discrepancies, please contact your administrator.

Thank you for your service to {{churchName}}.

Blessings,
{{churchName}} Team

---
This is an automated email. Please do not reply to this message.
© {{currentYear}} {{churchName}}. All rights reserved.`,
          churchId: churchId
        });
        
        templates.push(countReportTemplate);
      }
      
      // Return the results with properly created templates
      return res.json({ 
        success: true, 
        message: 'Email templates initialized successfully', 
        templates: templates 
      });
    } catch (error) {
      console.error('Error initializing email templates:', error);
      res.status(500).json({ message: 'Failed to initialize email templates' });
    }
  });
  
  // System Email Template Routes (for Global Admin)
  
  // Initialize system email templates (if needed)
  async function initializeSystemTemplates() {
    try {
      console.log('Checking if system templates need to be initialized...');
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      // Check if templates exist
      let templates = await storage.getEmailTemplates(systemChurchId);
      
      if (templates.length === 0) {
        console.log('No system templates found. Creating default templates...');
        
        // Create welcome email template
        await storage.createEmailTemplate({
          templateType: 'WELCOME_EMAIL',
          subject: 'Welcome to PlateSync',
          bodyText: `
Dear {{firstName}} {{lastName}},

Welcome to PlateSync! You have been added as a user for {{churchName}}.

Please verify your email and set up your password by clicking the following link:
{{verificationUrl}}?token={{verificationToken}}

This link will expire in 48 hours.

If you did not request this account, you can safely ignore this email.

Sincerely,
The PlateSync Team
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Welcome to {{churchName}}</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>{{firstName}} {{lastName}}</strong>,</p>
    
    <p>Welcome to PlateSync! You have been added as a user for <strong>{{churchName}}</strong>.</p>
    
    <p>To complete your account setup, please verify your email and create a password by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}?token={{verificationToken}}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Verify Email & Set Password
      </a>
    </div>
    
    <p>This link will expire in 48 hours for security reasons.</p>
    
    <p>Once verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.</p>
    
    <p>If you did not request this account, you can safely ignore this email.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
          `,
          churchId: systemChurchId
        });
        
        // Create password reset template
        await storage.createEmailTemplate({
          templateType: 'PASSWORD_RESET',
          subject: 'PlateSync Password Reset Request',
          bodyText: `
Hello,

We received a request to reset your password for your PlateSync account.

Please click on the following link to reset your password:
{{resetUrl}}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.

Sincerely,
The PlateSync Team
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Password Reset Request</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Hello,</p>
    
    <p>We received a request to reset the password for your PlateSync account.</p>
    
    <p>To set a new password, please click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{resetUrl}}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    
    <p>If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
          `,
          churchId: systemChurchId
        });

        // Create email verification template
        await storage.createEmailTemplate({
          templateType: 'EMAIL_VERIFICATION',
          subject: 'Verify Your PlateSync Account',
          bodyText: `
Hello {{USER_NAME}},

Welcome to PlateSync! To complete your account setup and start using our donation management system, please verify your email address.

{{churchName}} has added you to their PlateSync system to help manage donations and offerings.

To verify your email and set up your password, please click on the link below:
{{verificationUrl}}

What happens next:
- Click the verification link to confirm your email
- Create a secure password for your account  
- Access the PlateSync system to help manage donations

SECURITY NOTE: This verification link will expire in 48 hours for security reasons.

If you did not expect this invitation or have questions, please contact your church administrator.

Sincerely,
The PlateSync Team
          `,
          bodyHtml: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <!-- Logo Section -->
  <div style="padding: 40px 20px; text-align: center; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="{{plateSyncLogoUrl}}" alt="PlateSync Logo" style="max-width: 300px; height: auto; display: block; margin: 0 auto;" />
    </div>
    <h1 style="margin: 0 0 10px 0; font-size: 32px; font-weight: bold; color: #2d3748; text-align: center;">Email Verification</h1>
    <p style="margin: 0; font-size: 18px; color: #4a5568; text-align: center;">Complete your PlateSync account setup</p>
  </div>
  
  <div style="padding: 30px;">
    <div style="margin-bottom: 25px;">
      <h2 style="color: #2d3748; margin: 0 0 15px 0; font-size: 20px;">Hello {{USER_NAME}},</h2>
      <p style="color: #4a5568; margin: 0 0 15px 0; font-size: 16px; line-height: 1.6;">
        Welcome to PlateSync! To complete your account setup and start using our donation management system, please verify your email address.
      </p>
      
      <p style="color: #4a5568; margin: 0 0 25px 0; font-size: 16px; line-height: 1.6;">
        {{churchName}} has added you to their PlateSync system to help manage donations and offerings.
      </p>
    </div>
    
    <!-- Call to Action Button -->
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{verificationUrl}}" 
         style="background-color: #69ad4c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
        Verify Email & Set Password
      </a>
    </div>
    
    <div style="margin: 25px 0;">
      <p style="color: #4a5568; margin: 0 0 10px 0; font-size: 14px;">
        Or copy and paste this link into your browser:
      </p>
      <p style="word-break: break-all; background-color: #f8f9fa; padding: 12px; border-radius: 4px; font-size: 13px; color: #495057; margin: 0 0 20px 0;">
        {{verificationUrl}}
      </p>
    </div>
    
    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
      <p style="margin: 0 0 10px 0; color: #495057; font-size: 14px; font-weight: bold;">
        What happens next:
      </p>
      <ul style="margin: 0; padding-left: 20px; color: #495057; font-size: 14px; line-height: 1.5;">
        <li>Click the verification link to confirm your email</li>
        <li>Create a secure password for your account</li>
        <li>Access the PlateSync system to help manage donations</li>
      </ul>
    </div>
    
    <div style="margin: 25px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>Security Note:</strong> This verification link will expire in 48 hours for security reasons.
      </p>
    </div>
    
    <p style="color: #4a5568; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
      If you did not expect this invitation or have questions, please contact your church administrator.
    </p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
      <p style="color: #4a5568; margin: 0; font-size: 16px;">
        Sincerely,<br>
        <strong>The PlateSync Team</strong>
      </p>
    </div>
  </div>
</div>
          `,
          churchId: systemChurchId
        });
        
        console.log('System templates initialized successfully');
      } else {
        console.log(`Found ${templates.length} existing system templates`);
      }
    } catch (error) {
      console.error('Error initializing system templates:', error);
    }
  }

  // Test endpoint to check templates without auth
  app.get('/api/test-templates', async (req: any, res) => {
    console.log('🔍 TEST: API endpoint called!');
    try {
      const systemChurchId = 'SYSTEM_TEMPLATES';
      console.log('🔍 TEST: Calling storage.getEmailTemplates with:', systemChurchId);
      let templates = await storage.getEmailTemplates(systemChurchId);
      console.log(`🔍 TEST: Found ${templates.length} system templates:`, templates.map(t => `ID ${t.id}: ${t.templateType} (churchId: ${t.churchId})`));
      const result = { success: true, templates, count: templates.length };
      console.log('🔍 TEST: Returning result:', result);
      res.json(result);
    } catch (error) {
      console.error('🔍 TEST: Error fetching system email templates:', error);
      res.status(500).json({ message: 'Failed to fetch system email templates', error: String(error) });
    }
  });

  // Get system-wide email templates
  app.get('/api/email-templates/system', requireGlobalAdmin, async (req: any, res) => {
    try {
      // System templates use the special SYSTEM_TEMPLATES churchId
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      // Get the correct system templates (IDs 30, 31, and 32)
      let templates = await storage.getEmailTemplates(systemChurchId);
      console.log(`Found ${templates.length} system templates before filtering`);
      
      // Filter to only get the correct templates (should be IDs 30, 31, and 32)
      templates = templates.filter(t => 
        t.churchId === 'SYSTEM_TEMPLATES' && 
        (t.id === 30 || t.id === 31 || t.id === 32)
      );
      
      console.log(`Returning ${templates.length} filtered system templates:`, templates.map(t => `ID ${t.id}: ${t.templateType}`));
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching system email templates:', error);
      res.status(500).json({ message: 'Failed to fetch system email templates' });
    }
  });
  
  // Get specific system email template by ID
  app.get('/api/email-templates/system/:id', requireGlobalAdmin, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      console.log(`🔍 Looking for template ID: ${templateId}`);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const systemChurchId = 'SYSTEM_TEMPLATES';
      console.log(`🔍 Searching with church ID: ${systemChurchId}`);
      
      const template = await storage.getEmailTemplateById(templateId, systemChurchId);
      console.log(`🔍 Template found:`, template ? `YES - ID ${template.id}, Type: ${template.templateType}` : 'NO');
      
      if (!template) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(template);
    } catch (error) {
      console.error('Error fetching system email template:', error);
      res.status(500).json({ message: 'Failed to fetch system email template' });
    }
  });
  
  // Fix S3 logo URLs in email templates
  app.post('/api/email-templates/fix-logo-urls', requireGlobalAdmin, async (req: any, res) => {
    try {
      const correctS3Url = 'https://repl-plates-image-repo.s3.amazonaws.com/logos/logo-with-text.png';
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      // Get all system templates
      const templates = await storage.getEmailTemplates(systemChurchId);
      let updatedCount = 0;
      
      for (const template of templates) {
        if (template.bodyHtml) {
          let updatedHtml = template.bodyHtml;
          let hasChanges = false;
          
          // Replace old Replit domain URLs with S3 URL
          const oldPatterns = [
            'https://plate-sync-jspivey.replit.app/logo-with-text.png',
            '/logo-with-text.png',
            '/assets/logo-with-text.png',
            '/logos/logo-with-text.png'
          ];
          
          for (const pattern of oldPatterns) {
            if (updatedHtml.includes(pattern)) {
              updatedHtml = updatedHtml.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), correctS3Url);
              hasChanges = true;
            }
          }
          
          if (hasChanges) {
            await storage.updateEmailTemplate(template.id, systemChurchId, {
              subject: template.subject,
              bodyHtml: updatedHtml,
              bodyText: template.bodyText
            });
            updatedCount++;
          }
        }
      }
      
      res.json({ message: `Updated ${updatedCount} email templates with correct S3 logo URLs` });
    } catch (error) {
      console.error('Error fixing logo URLs:', error);
      res.status(500).json({ message: 'Failed to fix logo URLs' });
    }
  });

  // Update system email template
  app.put('/api/email-templates/system/:id', requireGlobalAdmin, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const systemChurchId = 'SYSTEM_TEMPLATES';
      const { subject, bodyHtml, bodyText } = req.body;
      
      if (!subject || !bodyHtml || !bodyText) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if templates need to be initialized
      await initializeSystemTemplates();
      
      // Check if template exists after initialization
      const existingTemplate = await storage.getEmailTemplateById(templateId);
      
      if (!existingTemplate) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      console.log(`Updating system template ${templateId} with subject: ${subject.substring(0, 20)}...`);
      
      // Update the template
      const updatedTemplate = await storage.updateEmailTemplate(templateId, {
        subject,
        bodyHtml,
        bodyText
      }, systemChurchId);
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Failed to update email template' });
      }
      
      console.log(`Successfully updated template ${updatedTemplate.id}`);
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating system email template:', error);
      res.status(500).json({ message: 'Failed to update system email template' });
    }
  });
  
  // Initialize system email templates
  app.post('/api/email-templates/initialize-system', requireGlobalAdmin, async (req: any, res) => {
    try {
      // Call our initialization function
      await initializeSystemTemplates();
      
      // Return success
      res.json({ success: true, message: 'System templates initialized successfully' });
    } catch (error) {
      console.error('Error initializing system templates:', error);
      res.status(500).json({ success: false, message: 'Failed to initialize system templates' });
    }
  });
  
  // Create new system email templates if needed - internal helper function
  app.post('/api/email-templates/create-system-templates', requireGlobalAdmin, async (req: any, res) => {
    try {
      // System templates use the special SYSTEM_TEMPLATES churchId
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      // Create welcome email template
      const welcomeTemplate = await storage.createEmailTemplate({
        templateType: 'WELCOME_EMAIL',
        subject: 'Welcome to {{churchName}} - Your Account Has Been Created',
        bodyHtml: `<p>Hello {{userName}},</p>
<p>Welcome to {{churchName}}! Your account has been created successfully.</p>
<p>You can now log in using your email address and the temporary password we provided.</p>
<p>Please log in and change your password as soon as possible.</p>
<p>Sincerely,<br/>{{churchName}} Team</p>`,
        bodyText: `Hello {{userName}},

Welcome to {{churchName}}! Your account has been created successfully.

You can now log in using your email address and the temporary password we provided.

Please log in and change your password as soon as possible.

Sincerely,
{{churchName}} Team`,
        churchId: systemChurchId
      });
      
      // Create password reset template
      const passwordResetTemplate = await storage.createEmailTemplate({
        templateType: 'PASSWORD_RESET',
        subject: 'Password Reset Request for {{churchName}}',
        bodyHtml: `<p>Hello {{userName}},</p>
<p>We received a request to reset your password for your account at {{churchName}}.</p>
<p>Please click the link below to reset your password. This link will expire in 24 hours.</p>
<p><a href="{{resetLink}}">Reset your password</a></p>
<p>If you did not request a password reset, please ignore this email or contact your administrator.</p>
<p>Sincerely,<br/>{{churchName}} Team</p>`,
        bodyText: `Hello {{userName}},

We received a request to reset your password for your account at {{churchName}}.

Please click the link below to reset your password. This link will expire in 24 hours.

{{resetLink}}

If you did not request a password reset, please ignore this email or contact your administrator.

Sincerely,
{{churchName}} Team`,
        churchId: systemChurchId
      });
      
      // Return the created templates
      res.status(201).json([welcomeTemplate, passwordResetTemplate]);
    } catch (error) {
      console.error('Error initializing system email templates:', error);
      res.status(500).json({ message: 'Failed to initialize system email templates' });
    }
  });
  
  // Update system email template
  app.put('/api/email-templates/system/:id', requireGlobalAdmin, async (req: any, res) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
      }
      
      const { subject, bodyHtml, bodyText } = req.body;
      
      if (!subject || !bodyHtml || !bodyText) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      const updatedTemplate = await storage.updateEmailTemplate(templateId, {
        subject,
        bodyHtml,
        bodyText
      }, systemChurchId);
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: 'Email template not found' });
      }
      
      res.json(updatedTemplate);
    } catch (error) {
      console.error('Error updating system email template:', error);
      res.status(500).json({ message: 'Failed to update system email template' });
    }
  });
  
  // Public endpoint to get Stripe payment links for expired subscription page
  app.get('/api/stripe/payment-links', async (req, res) => {
    try {
      console.log('Fetching Stripe payment links for expired subscription...');
      
      // Direct SQL query to get payment links from system config
      const query = `SELECT * FROM system_config WHERE key IN ('STRIPE_MONTHLY_PAYMENT_LINK', 'STRIPE_ANNUAL_PAYMENT_LINK')`;
      const { rows } = await db.$client.query(query);
      
      console.log('Found payment link entries:', rows.length);
      
      // Convert rows to a map for easier access
      const configMap = {};
      rows.forEach(row => {
        configMap[row.key] = row.value;
      });
      
      const response = {
        monthlyPaymentLink: configMap['STRIPE_MONTHLY_PAYMENT_LINK'] || '',
        annualPaymentLink: configMap['STRIPE_ANNUAL_PAYMENT_LINK'] || ''
      };
      
      console.log('Returning payment links:', response);
      res.json(response);
    } catch (error) {
      console.error('Error fetching Stripe payment links:', error);
      res.status(500).json({ message: 'Error fetching payment links' });
    }
  });

  // Church registration endpoint
  app.post('/api/register-church', async (req, res) => {
    try {
      // Validate request data
      const registerData = registerChurchSchema.parse(req.body);
      const { email, password, churchName, firstName, lastName } = registerData;
      
      // Check if email already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "A user with this email already exists" });
      }
      
      // Generate a unique ID for the user (which will also be the church ID)
      const userId = crypto.randomBytes(8).toString('hex');
      
      // Hash the password
      const hashedPassword = await scryptHash(password);
      
      console.log(`Creating church account with ID: ${userId}`);
      
      // Generate a base username from email
      const usernameBase = email.split('@')[0];
      let username = usernameBase;
      
      // Check if username already exists
      const checkUsername = async (name: string) => {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.username, name));
        return result.length > 0;
      };
      
      // If username exists, add a random suffix
      let counter = 0;
      while (await checkUsername(username)) {
        counter++;
        username = `${usernameBase}${counter}`;
      }
      
      console.log(`Using username: ${username}`);
      
      // Create user record first
      const [user] = await db.insert(users)
        .values({
          id: userId,
          username: username,
          email: email,
          password: hashedPassword,
          firstName: firstName,
          lastName: lastName,
          role: "ACCOUNT_OWNER",
          churchName: churchName,
          churchId: userId,
          isAccountOwner: true
        })
        .returning();
        
      console.log(`Created user record with ID: ${user.id}`);
      
      // Then create church record with the user as owner
      const [church] = await db.insert(churches)
        .values({
          id: userId,
          name: churchName,
          contactEmail: email,
          accountOwnerId: userId
        })
        .returning();
        
      console.log(`Created church record with ID: ${church.id}`);
      
      // Service options will be created only by user choice during onboarding
      // No automatic default service options are created during registration
      console.log(`Registration complete for church: ${userId} - service options will be added during onboarding`);
      
      // Create a trial subscription for this church
      // Since userId is used as churchId in our registration flow
      await createTrialSubscriptionForOnboarding(userId, churchName);
      console.log(`Created trial subscription for church: ${userId}`);
      
      return res.status(201).json({
        message: "Church registered successfully!",
        onboarding: {
          churchId: userId,
          churchName: churchName,
          email: email
        }
      });
      
    } catch (error: any) {
      console.error("Error registering church:", error);
      
      // Handle Zod validation errors
      if (error.issues) {
        return res.status(400).json({ 
          message: error.issues[0].message || "Validation error",
          field: error.issues[0].path?.join('.') 
        });
      }
      
      return res.status(500).json({ message: "Failed to register church" });
    }
  });
  
  // Endpoint to get Stripe payment link
  app.post('/api/checkout/payment-link', async (req: any, res) => {
    try {
      // Get user ID from session
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - no user ID' });
      }
      
      // Get plan from request body
      const { plan } = req.body;
      if (!plan || (plan !== 'MONTHLY' && plan !== 'ANNUAL')) {
        return res.status(400).json({ message: 'Invalid plan specified' });
      }
      
      console.log(`Redirecting user ${userId} to Stripe payment link for ${plan} plan`);
      
      // Get the direct payment link based on the plan
      const paymentLink = plan === 'MONTHLY' 
        ? process.env.STRIPE_MONTHLY_PAYMENT_LINK 
        : process.env.STRIPE_ANNUAL_PAYMENT_LINK;
      
      if (!paymentLink) {
        throw new Error(`Payment link for ${plan} plan not found`);
      }
      
      // Generate a session token
      const sessionToken = Math.random().toString(36).substring(2, 15);
      
      // Store the token in the user's session
      req.session.checkoutToken = sessionToken;
      req.session.checkoutPlan = plan;
      
      // Save session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) console.error('Error saving session:', err);
          resolve();
        });
      });
      
      // Build redirect URLs using current host
      const hostName = req.get('host');
      const protocolName = req.headers['x-forwarded-proto'] || req.protocol;
      
      // Create success and cancel URLs with token for verification
      const successUrl = `${protocolName}://${hostName}/subscription?success=true&token=${sessionToken}`;
      const cancelUrl = `${protocolName}://${hostName}/subscription?canceled=true`;
      
      // Append success_url and cancel_url parameters to override payment link defaults
      const urlWithRedirects = `${paymentLink}${paymentLink.includes('?') ? '&' : '?'}success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
      
      console.log(`Using payment link with custom redirect URLs`);
      
      // Return the payment link with redirect parameters
      res.json({ url: urlWithRedirects });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        message: 'Error creating checkout session',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test endpoint for Stripe subscription verification
  app.get('/api/subscription/test-stripe-verification', isAuthenticated, async (req: any, res) => {
    try {
      // Get the subscription ID from query parameters
      const subscriptionId = req.query.subscriptionId;
      
      if (!subscriptionId) {
        return res.status(400).json({ message: 'Subscription ID is required' });
      }
      
      // Call the verification function with the provided subscription ID
      const verificationResult = await verifyStripeSubscription(subscriptionId as string);
      
      // Return the verification result
      res.json({
        verificationResult,
        message: 'Stripe subscription verification test completed'
      });
    } catch (error) {
      console.error('Error testing Stripe verification:', error);
      res.status(500).json({ message: 'Error testing Stripe verification' });
    }
  });
  
  // Get subscription status
  app.get('/api/subscription/status', isAuthenticated, async (req: any, res) => {
    try {
      let userId;
      
      // Handle both authentication methods
      if (req.user) {
        // Passport-based auth
        userId = req.user.id || (req.user.claims && req.user.claims.sub);
      } else if (req.session?.user?.userId) {
        // Session-based auth
        userId = req.session.user.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - User ID not found' });
      }
      
      console.log(`Fetching subscription status for user: ${userId}`);
      
      const user = await storage.getUserById(userId);
      
      if (!user || !user.churchId) {
        console.log(`User ${userId} not found or has no church ID`);
        return res.status(200).json({ 
          isActive: false,
          status: "NO_SUBSCRIPTION",
          daysRemaining: null,
          trialEndDate: null,
          isTrialExpired: true
        });
      }
      
      console.log(`Found user with churchId: ${user.churchId}, checking subscription status`);
      
      const statusData = await storage.checkSubscriptionStatus(user.churchId);
      
      // Get additional subscription details like plan
      const subscription = await storage.getSubscription(user.churchId);
      
      console.log(`Found subscription status: ${statusData.status}, active: ${statusData.isActive}`);
      
      // Check if there's a Stripe subscription ID in the database
      let stripeVerified = false;
      let stripeData: any = null;
      
      if (subscription && subscription.stripeSubscriptionId) {
        try {
          console.log(`Verifying Stripe subscription: ${subscription.stripeSubscriptionId}`);
          
          // Verify the subscription with Stripe
          stripeData = await verifyStripeSubscription(subscription.stripeSubscriptionId);
          
          if (stripeData && stripeData.isActive) {
            stripeVerified = true;
            console.log('Stripe subscription verified as active');
            
            // Update our local subscription data if needed
            if (subscription.status !== 'ACTIVE' || subscription.plan !== stripeData.plan) {
              console.log(`Updating local subscription data to match Stripe verification`);
              await updateSubscriptionFromStripe(user.churchId, subscription.stripeSubscriptionId);
            }
          } else {
            console.log('Stripe subscription is not active or verification failed');
          }
        } catch (stripeError) {
          console.error('Error verifying Stripe subscription:', stripeError);
        }
      } else {
        console.log('No Stripe subscription ID in database record');
      }
      
      // Also check session verification as a backup
      let sessionVerified = false;
      try {
        if (req.session.paymentVerified) {
          sessionVerified = true;
          console.log('Found payment verification in session');
        }
      } catch (verifyError) {
        console.error('Error checking session payment verification:', verifyError);
      }
      
      // Determine final subscription status
      const isVerified = stripeVerified || sessionVerified;
      
      // Generate the appropriate response
      let response;
      
      if (stripeVerified && stripeData) {
        // Use data directly from Stripe
        response = {
          ...statusData,
          status: stripeData.status,
          isActive: stripeData.isActive,
          isTrialExpired: true, // Paid subscription, not a trial
          plan: stripeData.plan,
          nextBillingDate: stripeData.currentPeriodEnd?.toISOString(),
          canceledAt: stripeData.canceledAt?.toISOString()
        };
      } else if (isVerified) {
        // Use session verification
        response = {
          ...statusData,
          status: "ACTIVE",
          isActive: true,
          isTrialExpired: false,
          plan: 'MONTHLY',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        };
      } else {
        // Use the actual trial status from statusData calculation
        response = {
          ...statusData,
          plan: subscription?.plan || 'TRIAL'
        };
      }
      
      console.log(`Returning subscription data:`, response);
      
      res.json(response);
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      res.status(500).json({
        message: 'Error fetching subscription status',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Initialize subscription upgrade with direct payment links and custom redirect URLs
  app.post('/api/subscription/init-upgrade', isAuthenticated, isAccountOwner, async (req: any, res) => {
    try {
      const { plan } = req.body;
      
      if (!plan || !['MONTHLY', 'ANNUAL'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      const userId = req.user.claims.sub;
      console.log(`Redirecting user ${userId} to Stripe payment link for ${plan} plan upgrade`);
      
      // Get the direct payment link based on the plan
      const paymentLink = plan === 'MONTHLY' 
        ? process.env.STRIPE_MONTHLY_PAYMENT_LINK 
        : process.env.STRIPE_ANNUAL_PAYMENT_LINK;
      
      if (!paymentLink) {
        throw new Error(`Payment link for ${plan} plan not found`);
      }
      
      // Generate a session token
      const sessionToken = Math.random().toString(36).substring(2, 15);
      
      // Store the token in the user's session
      req.session.checkoutToken = sessionToken;
      req.session.checkoutPlan = plan;
      
      // Save session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) console.error('Error saving session:', err);
          resolve();
        });
      });
      
      // Build redirect URLs using current host
      const hostName = req.get('host');
      const protocolName = req.headers['x-forwarded-proto'] || req.protocol;
      
      // Create success and cancel URLs with token for verification
      const successUrl = `${protocolName}://${hostName}/subscription?success=true&token=${sessionToken}`;
      const cancelUrl = `${protocolName}://${hostName}/subscription?canceled=true`;
      
      // Append success_url and cancel_url parameters to override payment link defaults
      const urlWithRedirects = `${paymentLink}${paymentLink.includes('?') ? '&' : '?'}success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
      
      console.log(`Using payment link with custom redirect URLs for upgrade`);
      
      // Return the payment link with redirect parameters
      return res.json({ url: urlWithRedirects });
    } catch (error) {
      console.error('Error generating payment link for upgrade:', error);
      res.status(500).json({
        message: 'Error generating payment link for upgrade',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Create checkout session endpoint - matches the client expectation
  app.post('/api/subscription/create-checkout-session', async (req: any, res) => {
    try {
      // Check authentication
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const { plan } = req.body;
      
      console.log(`Creating checkout session for plan: ${plan}`);
      
      // Validate plan type
      if (!plan || !['MONTHLY', 'ANNUAL'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      // Get user info
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - User ID not found' });
      }
      
      // Get the direct payment link based on the plan
      const paymentLink = plan === 'MONTHLY' 
        ? process.env.STRIPE_MONTHLY_PAYMENT_LINK 
        : process.env.STRIPE_ANNUAL_PAYMENT_LINK;
      
      if (!paymentLink) {
        return res.status(500).json({ message: `Payment link for ${plan} plan not configured` });
      }
      
      // Generate a unique session token
      const randomBytes = await crypto.randomBytes(24);
      const sessionToken = randomBytes.toString('hex');
      
      // Store additional checkout information in session
      req.session.checkoutInfo = {
        token: sessionToken,
        plan: plan,
        userId: userId,
        timestamp: Date.now()
      };
      
      // Save session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) console.error('Error saving session:', err);
          resolve();
        });
      });
      
      // Store checkout token in database for later verification
      // This helps ensure we can verify even if session is lost
      try {
        await db.insert(verificationTokens).values({
          token: sessionToken,
          userId: userId,
          type: 'PAYMENT',
          expires: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
          metadata: JSON.stringify({ plan })
        });
        console.log(`Stored checkout token in database: ${sessionToken.substring(0, 8)}...`);
      } catch (tokenError) {
        console.error('Error storing token in database:', tokenError);
        // Continue anyway - we have the session as backup
      }
      
      // Build redirect URLs using current host
      const hostName = req.get('host');
      const protocolName = req.headers['x-forwarded-proto'] || req.protocol;
      
      // Create success and cancel URLs with token for verification
      const successUrl = `${protocolName}://${hostName}/subscription?success=true&token=${sessionToken}`;
      const cancelUrl = `${protocolName}://${hostName}/subscription?canceled=true`;
      
      // Check Stripe API key environment to log configuration
      const stripeKeyType = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ? 'TEST' : 
                            process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'LIVE' : 'UNKNOWN';
      console.log(`Using ${stripeKeyType} mode Stripe API for checkout`);
      
      // Safety check: make sure payment link environment matches API key environment
      const paymentLinkEnv = paymentLink.includes('test') ? 'TEST' : 'LIVE';
      if (stripeKeyType !== 'UNKNOWN' && paymentLinkEnv !== stripeKeyType) {
        console.warn(`⚠️ WARNING: Payment link environment (${paymentLinkEnv}) doesn't match Stripe API key environment (${stripeKeyType})`);
      } else {
        console.log(`✓ Payment link environment (${paymentLinkEnv}) matches Stripe API key environment (${stripeKeyType})`);
      }
      
      // Append success_url and cancel_url parameters to override payment link defaults
      const urlWithRedirects = `${paymentLink}${paymentLink.includes('?') ? '&' : '?'}success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
      
      console.log(`Redirecting to payment link: ${urlWithRedirects}`);
      
      // Return the payment link with redirect parameters
      return res.json({ url: urlWithRedirects });
    } catch (error) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({
        message: 'Error creating checkout session',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Email verification code sending endpoint
  app.post('/api/send-verification-code', async (req, res) => {
    try {
      const { email, churchId, churchName, firstName, lastName } = req.body;
      
      if (!email || !churchId) {
        return res.status(400).json({ message: 'Email and churchId are required' });
      }
      
      // Use church name from request or fall back to a default
      const nameToUse = churchName || 'Your Church';
      
      // Try to find a user with this email to get their name if not provided
      let userFirstName = firstName || '';
      let userLastName = lastName || '';
      
      // If firstName/lastName weren't provided, try to find the user
      if (!userFirstName || !userLastName) {
        try {
          const userResult = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
            
          if (userResult.length > 0) {
            userFirstName = userFirstName || userResult[0].firstName || '';
            userLastName = userLastName || userResult[0].lastName || '';
          }
        } catch (error) {
          console.log('Error finding user for email personalization:', error);
          // Continue without user data
        }
      }
      
      const result = await sendVerificationEmail(
        email, 
        churchId, 
        nameToUse, 
        userFirstName, 
        userLastName
      );
      
      if (result) {
        return res.status(200).json({ message: 'Verification email sent successfully' });
      } else {
        return res.status(500).json({ message: 'Failed to send verification email' });
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Verify email verification code
  app.post('/api/verify-code', async (req, res) => {
    try {
      const { email, churchId, code } = req.body;
      
      if (!email || !churchId || !code) {
        return res.status(400).json({ message: 'Email, churchId, and code are required' });
      }
      
      const result = await verifyCode(email, churchId, code);
      
      if (result) {
        // Mark user as verified if successful
        try {
          await db
            .update(users)
            .set({ isVerified: true })
            .where(and(
              eq(users.email, email),
              eq(users.churchId, churchId)
            ));
        } catch (dbError) {
          console.error('Error updating user verification status:', dbError);
          // Continue anyway, verification was successful
        }
        
        // Auto-login the user after successful verification
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(and(
              eq(users.email, email),
              eq(users.churchId, churchId)
            ));
            
          if (user) {
            // Log the user in by setting up the session - use promise wrapper
            await new Promise<void>((resolve, reject) => {
              req.login(user, (err) => {
                if (err) {
                  console.error('Error auto-logging in user:', err);
                  reject(err);
                } else {
                  console.log('User auto-logged in after verification:', user.id);
                  resolve();
                }
              });
            });
          }
        } catch (loginError) {
          console.error('Error auto-logging in user:', loginError);
          // Continue anyway, verification was successful
        }
        
        return res.status(200).json({ message: 'Verification successful', verified: true });
      } else {
        return res.status(400).json({ message: 'Invalid or expired verification code', verified: false });
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Create a trial subscription during onboarding (no auth required)
  app.post('/api/subscription/onboarding-trial', async (req, res) => {
    try {
      const { churchId, churchName } = req.body;
      
      if (!churchId) {
        return res.status(400).json({ message: 'Church ID is required' });
      }
      
      console.log(`Onboarding trial request for churchId: ${churchId}, churchName: ${churchName || 'not provided'}`);
      
      // Call the subscription helper function to create a trial
      // The helper will check for existing subscriptions
      const subscription = await createTrialSubscriptionForOnboarding(churchId, churchName);
      
      console.log(`Subscription created/found: ${JSON.stringify(subscription)}`);
      res.status(201).json(subscription);
    } catch (error) {
      console.error('Error creating trial subscription during onboarding:', error);
      res.status(500).json({ 
        message: 'Error creating trial subscription',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Payment verification endpoint with token validation
  // POST endpoint for manual verification (requires authentication)
  app.post('/api/subscription/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      const { token } = req.body;
      
      console.log('Manually verifying payment for authenticated user:', userId);
      
      // Validate the token if provided
      if (token && req.session.checkoutInfo?.token) {
        if (token !== req.session.checkoutInfo.token) {
          console.warn(`Token mismatch: ${token} vs ${req.session.checkoutInfo.token}`);
          // Continue anyway since we're already authenticated
        } else {
          console.log('Token verified successfully');
        }
      }
      
      // Get church for this user
      const user = await storage.getUser(userId);
      
      if (!user?.churchId) {
        throw new Error('User has no associated church');
      }
      
      const churchId = user.churchId;
      
      // Get plan from session if available
      const plan = req.session.checkoutInfo?.plan || 'MONTHLY';
      const periodDays = plan === 'MONTHLY' ? 30 : 365;
      
      // Create an update object for the subscription
      const updateData: any = {
        status: 'ACTIVE',
        plan: plan,
        startDate: new Date(),
        endDate: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
        canceledAt: null
      };

      // If we have Stripe subscription info in session, include it
      if (req.session.stripeData) {
        console.log('Including Stripe subscription data:', req.session.stripeData);
        updateData.stripeCustomerId = req.session.stripeData.customerId;
        updateData.stripeSubscriptionId = req.session.stripeData.subscriptionId;
        
        // Clean up Stripe data from session
        delete req.session.stripeData;
      }
      
      // Update subscription status to active paid plan
      const updatedSubscription = await storage.updateSubscriptionStatus(churchId, updateData);
      
      console.log('Updated subscription:', updatedSubscription);
      
      // Clean up session checkout info
      delete req.session.checkoutInfo;
      
      // Save the session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Error saving session:', err);
          } else {
            console.log('Session saved after payment verification');
          }
          resolve();
        });
      });
      
      res.json({ 
        success: true, 
        message: 'Payment verification updated',
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ 
        message: 'Failed to verify payment',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // GET endpoint for automatic verification (public, used for redirects from Stripe)
  app.get('/api/subscription/verify-payment', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).json({ message: 'Missing verification token' });
      }
      
      console.log(`Verifying payment with token: ${token.substring(0, 8)}...`);
      
      // First check if token exists in the database
      const [verificationRecord] = await db
        .select()
        .from(verificationTokens)
        .where(eq(verificationTokens.token, token));
      
      if (!verificationRecord) {
        console.log('No verification token found in database');
        
        // Check session as fallback if database lookup fails
        if (!req.session?.checkoutInfo?.token || req.session.checkoutInfo.token !== token) {
          // If not in session, redirect to subscription page with error flag
          return res.redirect('/subscription?error=invalid_token');
        }
        
        // Use session data as fallback
        const checkoutInfo = req.session.checkoutInfo;
        const userId = checkoutInfo.userId;
        const plan = checkoutInfo.plan;
        
        // Clear checkout info from session
        delete req.session.checkoutInfo;
        await new Promise<void>((resolve) => {
          req.session.save((err: any) => {
            if (err) console.error('Error saving session after verification:', err);
            resolve();
          });
        });
        
        // Get user and church info
        const user = await storage.getUser(userId);
        if (!user?.churchId) {
          return res.redirect('/subscription?error=church_not_found');
        }
        
        // Update subscription status
        const subscription = await storage.updateSubscriptionStatus(user.churchId, {
          status: 'ACTIVE',
          plan: plan,
          startDate: new Date(),
          endDate: plan === 'MONTHLY'
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });
        
        console.log(`Updated subscription for church ${user.churchId} using session data:`, subscription);
        return res.redirect('/subscription?success=true');
      }
      
      // Token found in database, use it
      const { userId, type, metadata, usedAt } = verificationRecord;
      
      // Check if this is a payment token
      if (type !== 'PAYMENT') {
        return res.redirect('/subscription?error=invalid_token_type');
      }
      
      // Check if token has already been used
      if (usedAt) {
        return res.redirect('/subscription?success=true&already_processed=true');
      }
      
      // Parse metadata to get the plan
      let plan;
      try {
        const parsedMetadata = JSON.parse(metadata || '{}');
        plan = parsedMetadata.plan;
      } catch (e) {
        console.error('Error parsing token metadata:', e);
        return res.redirect('/subscription?error=invalid_metadata');
      }
      
      if (!plan || !['MONTHLY', 'ANNUAL'].includes(plan)) {
        return res.redirect('/subscription?error=invalid_plan');
      }
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user?.churchId) {
        return res.redirect('/subscription?error=church_not_found');
      }
      
      // Mark token as used
      await db
        .update(verificationTokens)
        .set({ usedAt: new Date() })
        .where(eq(verificationTokens.token, token));
      
      // Update subscription status
      const subscription = await storage.updateSubscriptionStatus(user.churchId, {
        status: 'ACTIVE',
        plan: plan,
        startDate: new Date(),
        endDate: plan === 'MONTHLY'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      });
      
      console.log(`Updated subscription for church ${user.churchId}:`, subscription);
      
      // Redirect back to subscription page with success parameter
      return res.redirect('/subscription?success=true');
    } catch (error) {
      console.error('Error verifying payment:', error);
      return res.redirect('/subscription?error=server_error');
    }
  });

  // Local authentication endpoints
  // Register authentication routes for password reset functionality
  app.use('/api/auth', authRoutes);
  
  // Local login endpoint
  app.post('/api/login-local', async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }
      
      console.log(`Login attempt for email: ${username}`);
      
      // Look up user by email (username is actually the email in the client)
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, username));
      
      if (!user) {
        console.log(`User not found for email: ${username}`);
        return res.status(401).json({ message: 'No user found with the provided credentials.' });
      }
      
      console.log(`User found: ${user.id}, verifying password...`);
      
      // Verify password
      const passwordValid = await verifyPassword(password, user.password || '');
      if (!passwordValid) {
        console.log(`Invalid password for user: ${user.id}`);
        return res.status(401).json({ message: 'No user found with the provided credentials.' });
      }
      
      console.log(`Password verified successfully for user: ${user.id}`);
      
      // Check subscription status for trial expiration
      if (user.churchId) {
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.churchId, user.churchId));
        
        if (subscription) {
          const now = new Date();
          const trialEndDate = new Date(subscription.trialEndDate);
          const isTrialExpired = subscription.status === 'TRIAL' && now > trialEndDate;
          
          console.log(`Subscription check for church ${user.churchId}:`, {
            status: subscription.status,
            trialEndDate: subscription.trialEndDate,
            isExpired: isTrialExpired,
            userRole: user.role
          });
          
          // If trial is expired and user is not Account Owner, block login
          if (isTrialExpired && user.role !== 'ACCOUNT_OWNER') {
            console.log(`Trial expired login blocked for non-owner: ${user.id}, role: ${user.role}`);
            return res.status(403).json({ 
              message: 'Account suspended due to trial expiration. Please contact your Account Owner to upgrade to a paid subscription.',
              trialExpired: true,
              userRole: user.role
            });
          }
        }
        
        // If church is suspended, check if the user is a global admin
        const [church] = await db
          .select()
          .from(churches)
          .where(eq(churches.id, user.churchId));
          
        if (church && church.status === 'SUSPENDED' && user.role !== 'GLOBAL_ADMIN') {
          return res.status(403).json({ 
            message: 'Your account has been suspended. Please contact support.' 
          });
        }
      }
      
      // Use passport login() function to handle session creation
      req.login(user, (err) => {
        if (err) {
          console.error('Login error:', err);
          return res.status(500).json({ message: 'Failed to create session' });
        }
        
        console.log(`User logged in with passport.login(): ${user.id}`);
        
        // Remove password from returned user object
        const { password: _, ...userWithoutPassword } = user;
        
        // Return user data
        res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'An error occurred during login',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Consolidated /api/auth/user endpoint - supports both passport and session auth
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // CASE 1: Check for passport auth
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        console.log("User authenticated via passport:", req.user.id);
        
        // Otherwise, get full user data using the ID
        const userId = req.user.id;
        console.log(`Getting full user data for ID: ${userId}`);
        
        let user = await storage.getUserById(userId);
        
        if (!user) {
          console.log("User not found in database:", userId);
          return res.status(200).json(null);
        }
        
        // CRITICAL FIX: Do NOT automatically sync logos during authentication
        // This was causing new registrations to show existing church logos
        // Users should only have logos that they explicitly uploaded during their own registration
        // 
        // Previous code here was automatically pulling logos from other users, causing data integrity issues
        // where new church registrations would display logos from completely different churches
        console.log(`Skipping automatic logo sync for user ${userId} to prevent data contamination`);
        
        // Only sync church name if missing, but NEVER sync logos automatically
        if (user.churchId && !user.churchName) {
          try {
            const [churchAdmin] = await db
              .select()
              .from(users)
              .where(eq(users.id, user.churchId));
              
            if (churchAdmin && churchAdmin.churchName) {
              await db
                .update(users)
                .set({ 
                  churchName: churchAdmin.churchName,
                  updatedAt: new Date()
                })
                .where(eq(users.id, userId));
                
              user.churchName = churchAdmin.churchName;
              console.log(`Updated user ${userId} with church name only (no logo sync)`);
            }
          } catch (syncError) {
            console.error(`Error syncing church name for user ${userId}:`, syncError);
          }
        }
        
        // Remove sensitive data
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      }
      
      // CASE 2: Check for legacy session format
      const userData = req.session?.user;
      
      if (!userData || !userData.userId) {
        return res.status(200).json(null); // Return null instead of error for unauthenticated users
      }
      
      console.log(`Auth check for user ID from session: ${userData.userId}`);
      
      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userData.userId));
      
      if (!user) {
        console.log(`User with ID ${userData.userId} not found in database`);
        return res.status(200).json(null); // Return null instead of error
      }
      
      console.log(`User found: ${user.id}`);
      
      // Remove password before sending
      const { password, ...userWithoutPassword } = user;
      return res.status(200).json(userWithoutPassword);
      
    } catch (err) {
      console.error('Error in /api/auth/user:', err);
      return res.status(200).json(null); // Return null instead of error on failure
    }
  });

  // User management endpoints
  
  // Delete user endpoint
  app.delete('/api/users/:userId', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Don't allow deleting self
      if (req.user.id === userId) {
        return res.status(400).json({ message: 'You cannot delete your own account' });
      }
      
      // Check if the user exists first
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't allow deleting account owners unless current user is master admin
      if ((userToDelete.role === 'ACCOUNT_OWNER' || userToDelete.isAccountOwner) && !req.user.isMasterAdmin) {
        return res.status(403).json({ message: 'You cannot delete an account owner' });
      }
      
      // Delete the user
      await storage.deleteUser(userId);
      
      // If we get here without an error being thrown, assume success
      console.log(`Successfully deleted user: ${userId}`);
      return res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });
  
  // Create new user
  app.post('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email, firstName, lastName, role, churchId } = req.body;
      
      // Get the current user's church ID if not provided
      const currentUser = req.user;
      const userChurchId = churchId || currentUser.churchId || currentUser.id;
      
      if (!email || !firstName || !lastName || !role) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'A user with this email already exists' });
      }
      
      // Get church details from the current user (since churchId references users.id)
      let churchName = 'Your Church';
      let churchLogoUrl = null;
      
      if (userChurchId) {
        try {
          const churchUser = await storage.getUser(userChurchId);
          if (churchUser) {
            churchName = churchUser.churchName || 'Your Church';
            churchLogoUrl = churchUser.churchLogoUrl || null;
          }
        } catch (err) {
          console.log('Could not get church details, using defaults');
        }
      }

      // Create the user with the church details
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        role,
        churchId: userChurchId,
        churchName: churchName,
        churchLogoUrl: churchLogoUrl,
        isAccountOwner: false
      });
      
      // Send welcome email with verification/password setup link
      try {
        // Create verification URL for password setup - corrected to use /verify instead of /verify-email
        const verificationUrl = `${req.protocol}://${req.get('host')}/verify`;
        
        await sendWelcomeEmail({
          to: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          churchName: churchName,
          churchId: userChurchId,
          verificationToken: newUser.passwordResetToken || '',
          verificationUrl: verificationUrl,
          role: newUser.role
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Continue with user creation even if email fails
      }
      
      console.log(`Created new user: ${newUser.id} with role ${role}`);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });
  
  // Test users endpoint - used by the User Management page
  app.get('/api/test-users', async (req: any, res) => {
    try {
      if (!req.isAuthenticated()) {
        console.log('User not authenticated on /api/test-users');
        // Return a more helpful message
        return res.status(401).json({ message: 'Please log in to access this feature' });
      }

      // Get the userId from the req.user object
      let userId = req.user.id;
      
      // For Replit Auth compatibility
      if (!userId && req.user.claims && req.user.claims.sub) {
        userId = req.user.claims.sub;
      }
      
      console.log(`User ID for /api/test-users: ${userId}`);
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found in session' });
      }
      
      try {
        // Get the current user's data directly based on session ID
        const currentUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        
        if (!currentUser || currentUser.length === 0) {
          console.log(`User ID ${userId} not found in database`);
          
          // If we can't find the user, return just the current user from session
          const userData = {
            id: userId,
            username: req.user.username || "current-user",
            email: req.user.email || "user@example.com",
            firstName: req.user.firstName || req.user.first_name || "Current",
            lastName: req.user.lastName || req.user.last_name || "User",
            role: "ADMIN",
            isAccountOwner: true,
            createdAt: new Date().toISOString()
          };
          
          console.log('Returning single user for account owner');
          return res.status(200).json([userData]);
        }
        
        // Get church ID to ensure proper data sharing between admins and users
        const churchId = currentUser[0].churchId || userId;
        console.log(`Filtering users by churchId: ${churchId}`);
        
        // Get users from the database
        const allUsers = await db.select().from(users);
        
        // Filter by church_id to only show users from the same organization
        // Explicitly remove Global Admin accounts from church user management view
        const churchUsers = allUsers.filter(user => {
          // Only include users that belong to this church  
          const isChurchMember = user.churchId === churchId;
          
          // Filter out any users with INACTIVE_ prefix in email (these are deleted users)
          // Debug the email filtering
          if (user.email && typeof user.email === 'string' && user.email.startsWith('INACTIVE_')) {
            console.log(`Filtering out inactive user: ${user.id} (${user.email})`);
            return false;
          }
          
          // Filter out any users where role is GLOBAL_ADMIN, MASTER_ADMIN, or any other admin type
          const isNotGlobalAdmin = 
            user.role !== "GLOBAL_ADMIN" && 
            user.role !== "MASTER_ADMIN" &&
            !(user.id !== userId && user.id !== churchId && user.role === "ADMIN");
          
          // Only include users that are church members and not global admins
          return isChurchMember && isNotGlobalAdmin;
        });
        
        // Remove password field before sending response
        const safeUsers = churchUsers.map(user => {
          const { password, ...userWithoutPassword } = user;
          return userWithoutPassword;
        });
        
        if (safeUsers.length === 0) {
          // If no users found, at least return the current user
          const userData = {
            id: userId,
            username: req.user.username || "current-user",
            email: req.user.email || "user@example.com",
            firstName: req.user.firstName || req.user.first_name || "Current",
            lastName: req.user.lastName || req.user.last_name || "User",
            role: "ADMIN",
            isAccountOwner: true,
            createdAt: new Date().toISOString()
          };
          
          console.log('No users found, returning account owner only');
          return res.status(200).json([userData]);
        }
        
        console.log(`Returning ${safeUsers.length} users`);
        return res.status(200).json(safeUsers);
      } catch (dbError) {
        console.error('Database error in /api/test-users:', dbError);
        
        // If database access fails, at least return the current user
        const userData = {
          id: userId,
          username: req.user.username || "current-user",
          email: req.user.email || "user@example.com",
          firstName: req.user.firstName || req.user.first_name || "Current",
          lastName: req.user.lastName || req.user.last_name || "User",
          role: "ADMIN",
          isAccountOwner: true,
          createdAt: new Date().toISOString()
        };
        
        console.log('Database error, returning fallback user');
        return res.status(200).json([userData]);
      }
    } catch (error) {
      console.error('Error in /api/test-users:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  });
  
  // Endpoint to programmatically link a Stripe subscription to a user account
  app.post('/api/subscription/link-stripe', isAuthenticated, async (req: any, res) => {
    try {
      const { stripeSubscriptionId } = req.body;
      
      if (!stripeSubscriptionId) {
        return res.status(400).json({ message: 'Stripe subscription ID is required' });
      }
      
      let userId;
      
      // Handle both authentication methods
      if (req.user) {
        // Passport-based auth
        userId = req.user.id || (req.user.claims && req.user.claims.sub);
      } else if (req.session?.user?.userId) {
        // Session-based auth
        userId = req.session.user.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - User ID not found' });
      }
      
      const user = await storage.getUserById(userId);
      
      if (!user || !user.churchId) {
        return res.status(404).json({ message: 'User or church not found' });
      }
      
      // Verify the subscription with Stripe
      const verificationResult = await verifyStripeSubscription(stripeSubscriptionId);
      
      if (!verificationResult || !verificationResult.isActive) {
        return res.status(400).json({ 
          message: 'Invalid or inactive Stripe subscription', 
          verificationResult 
        });
      }
      
      // Update the subscription in the database
      const updated = await storage.upgradeSubscription(user.churchId, verificationResult.plan, {
        stripeCustomerId: '',  // Set this if available
        stripeSubscriptionId
      });
      
      if (!updated) {
        return res.status(500).json({ message: 'Failed to update subscription' });
      }
      
      res.status(200).json({ 
        message: 'Stripe subscription linked successfully',
        subscription: updated
      });
    } catch (error) {
      console.error('Error linking Stripe subscription:', error);
      res.status(500).json({ 
        message: 'Error linking Stripe subscription',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Endpoint to cancel a subscription
  app.post('/api/subscription/cancel', isAuthenticated, async (req: any, res) => {
    try {
      let userId;
      
      // Handle both authentication methods
      if (req.user) {
        // Passport-based auth
        userId = req.user.id || (req.user.claims && req.user.claims.sub);
      } else if (req.session?.user?.userId) {
        // Session-based auth
        userId = req.session.user.userId;
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized - User ID not found' });
      }
      
      const user = await storage.getUserById(userId);
      
      if (!user || !user.churchId) {
        return res.status(404).json({ message: 'User or church not found' });
      }
      
      // Get the subscription from database
      const subscription = await storage.getSubscription(user.churchId);
      
      if (!subscription) {
        return res.status(404).json({ message: 'No subscription found' });
      }
      
      if (subscription.status === 'CANCELED') {
        return res.status(400).json({ message: 'Subscription is already canceled' });
      }
      
      if (!subscription.stripeSubscriptionId) {
        // If no Stripe subscription ID, just update our database directly
        const updated = await storage.cancelSubscription(user.churchId);
        
        return res.status(200).json({
          message: 'Subscription canceled successfully',
          subscription: updated
        });
      }
      
      // Cancel the subscription in Stripe
      const canceled = await cancelStripeSubscription(
        subscription.stripeSubscriptionId, 
        user.churchId
      );
      
      if (!canceled) {
        return res.status(500).json({ message: 'Failed to cancel subscription' });
      }
      
      // Get the updated subscription
      const updatedSubscription = await storage.getSubscription(user.churchId);
      
      res.status(200).json({
        message: 'Subscription canceled successfully',
        subscription: updatedSubscription
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({
        message: 'Error canceling subscription',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Simple diagnostic endpoint - just returns JSON with no dependencies
  app.get('/api/stripe-diagnostic', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({ 
      message: 'This is a diagnostic endpoint', 
      timestamp: new Date().toISOString() 
    });
  });

  // Test Stripe Connection endpoint - completely rewritten
  app.get('/api/test-stripe', async (req, res) => {
    // Force content type to be application/json
    res.set('Content-Type', 'application/json');
    
    try {
      // Get Stripe configuration from database - use direct SQL to avoid any issues
      let isLiveMode = true;
      let secretKey = '';
      
      try {
        const modeResult = await db.$client.query('SELECT value FROM system_config WHERE key = $1', ['STRIPE_LIVE_MODE']);
        isLiveMode = modeResult.rows[0]?.value !== 'false';
        
        const keyName = isLiveMode ? 'STRIPE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
        const keyResult = await db.$client.query('SELECT value FROM system_config WHERE key = $1', [keyName]);
        secretKey = keyResult.rows[0]?.value || '';
      } catch (dbError) {
        console.error('Database error fetching Stripe config:', dbError);
        return res.status(200).json({ 
          success: false,
          message: 'Could not retrieve Stripe configuration from database',
          error: dbError instanceof Error ? dbError.message : String(dbError)
        });
      }
      
      if (!secretKey) {
        return res.status(200).json({ 
          success: false,
          message: `No Stripe ${isLiveMode ? 'live' : 'test'} secret key found. Please configure your API keys.`
        });
      }
      
      // Initialize Stripe with the secret key
      const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
      
      try {
        // Test the Stripe connection by making a simple API call
        const balance = await stripe.balance.retrieve();
        
        // If we get here, the connection is valid
        return res.status(200).json({ 
          success: true,
          message: 'Stripe connection successful', 
          mode: isLiveMode ? 'live' : 'test'
        });
      } catch (stripeError) {
        console.error('Stripe API error:', stripeError);
        return res.status(200).json({
          success: false,
          message: stripeError instanceof Error ? stripeError.message : 'Invalid Stripe API key or configuration',
          mode: isLiveMode ? 'live' : 'test'
        });
      }
    } catch (error) {
      console.error('Stripe test connection error:', error);
      // Always return a 200 status with success flag instead of error status
      return res.status(200).json({ 
        success: false,
        message: error instanceof Error ? error.message : 'Error testing Stripe connection'
      });
    }
  });

  // Global Admin: Planning Center Integration - GET endpoint
  app.get('/api/global-admin/integrations/planning-center', requireGlobalAdmin, async (req, res) => {
    try {
      // Get Planning Center configuration from system settings
      const clientId = await storage.getSystemConfig('PLANNING_CENTER_CLIENT_ID');
      const clientSecret = await storage.getSystemConfig('PLANNING_CENTER_CLIENT_SECRET');
      const callbackUrl = await storage.getSystemConfig('PLANNING_CENTER_CALLBACK_URL');
      
      res.status(200).json({
        clientId: clientId || '',
        clientSecret: clientSecret ? 'present' : '',
        callbackUrl: callbackUrl || `${req.protocol}://${req.get('host')}/api/planning-center/callback`,
        isAuthenticated: Boolean(clientId && clientSecret)
      });
    } catch (error) {
      console.error('Error fetching Planning Center config:', error);
      res.status(500).json({ 
        message: 'Failed to fetch Planning Center configuration',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Global Admin: Planning Center Integration - POST endpoint
  app.post('/api/global-admin/integrations/planning-center', requireGlobalAdmin, async (req, res) => {
    try {
      const { clientId, clientSecret, callbackUrl } = req.body;
      
      // Validate inputs
      if (!clientId) {
        return res.status(400).json({ message: 'Client ID is required' });
      }
      
      // Update system configuration using the proper format
      const configItems = [
        { key: 'PLANNING_CENTER_CLIENT_ID', value: clientId }
      ];
      
      // Only update client secret if it was provided (not masked)
      if (clientSecret !== null) {
        configItems.push({ key: 'PLANNING_CENTER_CLIENT_SECRET', value: clientSecret });
      }
      
      if (callbackUrl) {
        configItems.push({ key: 'PLANNING_CENTER_CALLBACK_URL', value: callbackUrl });
      }
      
      await storage.updateSystemConfig(configItems);
      
      // Set environment variables so they're available to the current process
      process.env.PLANNING_CENTER_CLIENT_ID = clientId;
      if (clientSecret !== null) {
        process.env.PLANNING_CENTER_CLIENT_SECRET = clientSecret;
      }
      if (callbackUrl) {
        process.env.PLANNING_CENTER_CALLBACK_URL = callbackUrl;
      }
      
      res.status(200).json({ 
        message: 'Planning Center configuration updated successfully' 
      });
    } catch (error) {
      console.error('Error updating Planning Center config:', error);
      res.status(500).json({ 
        message: 'Failed to update Planning Center configuration',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Global Admin: Stripe Integration - GET endpoint
  app.get('/api/global-admin/integrations/stripe', requireGlobalAdmin, async (req, res) => {
    try {
      console.log('Fetching Stripe configuration using direct SQL...');
      
      // Direct SQL query to bypass any potential ORM issues
      const query = `SELECT * FROM system_config WHERE key IN ('STRIPE_SECRET_KEY', 'VITE_STRIPE_PUBLIC_KEY', 'STRIPE_TEST_SECRET_KEY', 'STRIPE_TEST_PUBLIC_KEY', 'STRIPE_MONTHLY_PRICE_ID', 'STRIPE_ANNUAL_PRICE_ID', 'STRIPE_MONTHLY_PAYMENT_LINK', 'STRIPE_ANNUAL_PAYMENT_LINK', 'STRIPE_LIVE_MODE')`;
      const { rows } = await db.$client.query(query);
      
      console.log('Found Stripe configuration entries:', rows.length);
      console.log('Raw DB rows:', rows);
      
      // Convert rows to a map for easier access
      const configMap = {};
      rows.forEach(row => {
        configMap[row.key] = row.value;
      });
      
      // Debug to see what we found
      console.log('Stripe config map:', configMap);
      
      // Create the response object with proper values and masking
      const response = {
        // Mask secret keys for security, but indicate they exist
        liveSecretKey: !!configMap['STRIPE_SECRET_KEY'],
        testSecretKey: !!configMap['STRIPE_TEST_SECRET_KEY'],
        
        // Get the actual public values from configMap
        livePublicKey: configMap['VITE_STRIPE_PUBLIC_KEY'] || '',
        testPublicKey: configMap['STRIPE_TEST_PUBLIC_KEY'] || '',
        monthlyPriceId: configMap['STRIPE_MONTHLY_PRICE_ID'] || '',
        annualPriceId: configMap['STRIPE_ANNUAL_PRICE_ID'] || '',
        monthlyPaymentLink: configMap['STRIPE_MONTHLY_PAYMENT_LINK'] || '',
        annualPaymentLink: configMap['STRIPE_ANNUAL_PAYMENT_LINK'] || '',
        // Default to true (LIVE mode) if not explicitly set to 'false'
        isLiveMode: configMap['STRIPE_LIVE_MODE'] !== 'false',
      };
      
      console.log('Returning Stripe config to client:', response);
      res.json(response);
    } catch (error) {
      console.error('Error fetching Stripe configuration:', error);
      res.status(500).json({ message: 'Error fetching Stripe configuration' });
    }
  });
  
  // Special debug endpoint to test direct database access for Stripe config
  app.get('/api/global-admin/dev/stripe-test', requireGlobalAdmin, async (req, res) => {
    try {
      console.log('Debugging Stripe configuration with direct SQL...');
      
      // Direct SQL query to access exactly one field
      const priceIdQuery = `SELECT value FROM system_config WHERE key = 'STRIPE_MONTHLY_PRICE_ID'`;
      const priceIdResult = await db.$client.query(priceIdQuery);
      
      // Get the raw rows from the database
      const allStripeQuery = `SELECT * FROM system_config WHERE key LIKE 'STRIPE_%' OR key LIKE 'VITE_STRIPE_%'`;
      const allStripeResult = await db.$client.query(allStripeQuery);
      
      // Format the response with just what we want to see
      const response = {
        monthlyPriceId: priceIdResult.rows.length > 0 ? priceIdResult.rows[0].value : 'not found',
        rawData: allStripeResult.rows
      };
      
      console.log('Debug response:', response);
      res.json(response);
    } catch (error) {
      console.error('Error in Stripe debug endpoint:', error);
      res.status(500).json({ 
        message: 'Error in debug endpoint',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Global Admin: Stripe Integration - POST endpoint
  app.post('/api/global-admin/integrations/stripe', requireGlobalAdmin, async (req, res) => {
    try {
      console.log('Saving Stripe configuration using direct SQL...');
      const { 
        liveSecretKey, 
        livePublicKey, 
        testSecretKey, 
        testPublicKey,
        monthlyPriceId,
        annualPriceId,
        monthlyPaymentLink,
        annualPaymentLink,
        isLiveMode
      } = req.body;
      
      // Using direct SQL queries for more reliable updates like the SendGrid integration
      const updateOrInsert = async (key, value) => {
        const checkQuery = `SELECT * FROM system_config WHERE key = $1`;
        const result = await db.$client.query(checkQuery, [key]);
        
        if (result.rows.length > 0) {
          await db.$client.query(
            `UPDATE system_config SET value = $1 WHERE key = $2`,
            [value, key]
          );
        } else {
          await db.$client.query(
            `INSERT INTO system_config (key, value) VALUES ($1, $2)`,
            [key, value]
          );
        }
      };
      
      try {
        // Only update secret keys if they're not masked (not null)
        if (liveSecretKey !== null) {
          await updateOrInsert('STRIPE_SECRET_KEY', liveSecretKey);
          process.env.STRIPE_SECRET_KEY = liveSecretKey;
        }
        
        if (testSecretKey !== null) {
          await updateOrInsert('STRIPE_TEST_SECRET_KEY', testSecretKey);
          process.env.STRIPE_TEST_SECRET_KEY = testSecretKey;
        }
        
        // Always update all public keys and IDs, even with empty values
        await updateOrInsert('VITE_STRIPE_PUBLIC_KEY', livePublicKey || '');
        await updateOrInsert('STRIPE_TEST_PUBLIC_KEY', testPublicKey || '');
        await updateOrInsert('STRIPE_MONTHLY_PRICE_ID', monthlyPriceId || '');
        await updateOrInsert('STRIPE_ANNUAL_PRICE_ID', annualPriceId || '');
        await updateOrInsert('STRIPE_MONTHLY_PAYMENT_LINK', monthlyPaymentLink || '');
        await updateOrInsert('STRIPE_ANNUAL_PAYMENT_LINK', annualPaymentLink || '');
        await updateOrInsert('STRIPE_LIVE_MODE', isLiveMode ? 'true' : 'false');
        
        // Update environment variables for the current process
        process.env.VITE_STRIPE_PUBLIC_KEY = livePublicKey || '';
        process.env.STRIPE_TEST_PUBLIC_KEY = testPublicKey || '';
        process.env.STRIPE_MONTHLY_PRICE_ID = monthlyPriceId || '';
        process.env.STRIPE_ANNUAL_PRICE_ID = annualPriceId || '';
        process.env.STRIPE_MONTHLY_PAYMENT_LINK = monthlyPaymentLink || '';
        process.env.STRIPE_ANNUAL_PAYMENT_LINK = annualPaymentLink || '';
        process.env.STRIPE_LIVE_MODE = isLiveMode ? 'true' : 'false';
        
        // Reinitialize Stripe if needed
        if ((isLiveMode && liveSecretKey) || (!isLiveMode && testSecretKey)) {
          const keyToUse = isLiveMode ? liveSecretKey : testSecretKey;
          if (keyToUse) {
            console.log(`Stripe client reinitialized with ${isLiveMode ? 'live' : 'test'} mode`);
          }
        }
        
        console.log('Stripe configuration updated successfully with SQL');
        res.status(200).json({ message: 'Stripe configuration updated successfully' });
      } catch (dbError) {
        console.error('Database error saving Stripe config:', dbError);
        res.status(500).json({ message: 'Database error: Failed to save Stripe configuration' });
      }
    } catch (error) {
      console.error('Error updating Stripe configuration:', error);
      res.status(500).json({ 
        message: 'Failed to update Stripe configuration',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Email verification endpoint (for setting password)
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      console.log("Verifying email with token:", token.substring(0, 10) + "...");
      
      // Find user with matching token, using SQL query to handle column name mismatch
      const users_with_token = await db.execute(
        sql`SELECT * FROM users WHERE password_reset_token = ${token}`
      );
      
      const users = users_with_token.rows;
      const user = users.length > 0 ? users[0] : null;
      
      if (!user) {
        console.log("No user found with this token");
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      // Check if token is expired
      const now = new Date();
      if (user.passwordResetExpires && now > user.passwordResetExpires) {
        console.log("Token expired for user:", user.id);
        return res.status(400).json({ message: "Verification token has expired" });
      }
      
      // Validate password (at least 8 characters)
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      try {
        // Hash the password
        const hashedPassword = await scryptHash(password);
        
        console.log("Updating user with ID:", user.id);
        
        // First get the user's church information to ensure logo is preserved
        const churchId = user.churchId;
        if (churchId) {
          console.log("Finding church details with ID:", churchId);
          
          try {
            // Get church details from the user record (since churchId references users.id)
            const church = await storage.getUser(churchId);
            
            if (church) {
              console.log("Found church details for logo sync:", church.name);
              
              // Update user with both verification and church logo details
              await db.$client.query(
                `UPDATE users 
                SET 
                  password = $1,
                  is_verified = true, 
                  password_reset_token = NULL,
                  password_reset_expires = NULL,
                  church_logo_url = $3,
                  church_name = $4,
                  updated_at = NOW()
                WHERE id = $2`,
                [
                  hashedPassword, 
                  user.id, 
                  church.logoUrl || null, 
                  church.name || null
                ]
              );
            } else {
              console.log("No church details found, proceeding with basic verification");
              // Use direct SQL query to update the user to avoid ORM typing issues
              await db.$client.query(
                `UPDATE users 
                SET 
                  password = $1,
                  is_verified = true, 
                  password_reset_token = NULL,
                  password_reset_expires = NULL,
                  updated_at = NOW()
                WHERE id = $2`,
                [hashedPassword, user.id]
              );
            }
          } catch (churchError) {
            console.error("Error fetching church details:", churchError);
            // Fallback to basic verification if church fetch fails
            await db.$client.query(
              `UPDATE users 
              SET 
                password = $1,
                is_verified = true, 
                password_reset_token = NULL,
                password_reset_expires = NULL,
                updated_at = NOW()
              WHERE id = $2`,
              [hashedPassword, user.id]
            );
          }
        } else {
          // No church ID, just do basic verification
          await db.$client.query(
            `UPDATE users 
            SET 
              password = $1,
              is_verified = true, 
              password_reset_token = NULL,
              password_reset_expires = NULL,
              updated_at = NOW()
            WHERE id = $2`,
            [hashedPassword, user.id]
          );
        }
        
        console.log("User updated successfully");
      } catch (updateError) {
        console.error("Error updating user:", updateError);
        return res.status(500).json({ 
          message: "Failed to update user password",
          error: updateError instanceof Error ? updateError.message : String(updateError)
        });
      }
      
      console.log("Email verified and password set for user:", user.id);
      
      res.status(200).json({ 
        message: "Email verified and password set successfully",
        userId: user.id 
      });
      
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ 
        message: "An error occurred while verifying your email",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
