import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { isAdmin, isAccountOwner, isMasterAdmin } from "./middleware/roleMiddleware";
import { sendDonationNotification, testSendGridConfiguration, sendWelcomeEmail, sendPasswordResetEmail, sendCountReport } from "./sendgrid";
import { sendVerificationEmail, verifyCode } from "./verification";
import { setupTestEndpoints } from "./test-endpoints";
import { setupPlanningCenterRoutes } from "./planning-center";
import { requireGlobalAdmin, restrictSuspendedChurchAccess } from "./middleware/globalAdminMiddleware";
import globalAdminRoutes from "./api/globalAdmin";
import { eq, sql, and, or, inArray } from "drizzle-orm";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import { generateCountReportPDF } from "./pdf-generator";
import Stripe from "stripe";
import { createTrialSubscriptionForOnboarding } from "./subscription-helper";
import { 
  batches, 
  churches, 
  donations, 
  members, 
  reportRecipients, 
  serviceOptions, 
  subscriptions, 
  users 
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup auth middleware and routes
  await setupAuth(app);
  
  // Set up global admin routes
  app.use('/api/global-admin', globalAdminRoutes);
  
  // Set up Planning Center routes
  setupPlanningCenterRoutes(app);
  
  // If in development, add test endpoints
  if (process.env.NODE_ENV === 'development') {
    setupTestEndpoints(app);
  }
  
  // Add user auth endpoint that also works for non-authenticated users
  app.get('/api/auth/user', async (req: any, res) => {
    // If not authenticated, return null (not an error)
    if (!req.isAuthenticated() || !req.user) {
      return res.status(200).json(null);
    }
    try {
      // Get user ID from session
      const userId = req.user.claims.sub;
      
      try {
        // First try to get user data from database with all fields including is_master_admin
        const userQuery = await db.execute(
          sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
        );
        
        if (userQuery.rows.length > 0) {
          // Transform snake_case database column names to camelCase for the API
          const dbUser = userQuery.rows[0];
          const user = {
            id: dbUser.id,
            username: dbUser.username,
            email: dbUser.email,
            firstName: dbUser.first_name,
            lastName: dbUser.last_name,
            bio: dbUser.bio,
            profileImageUrl: dbUser.profile_image_url,
            role: dbUser.role,
            password: dbUser.password,
            isVerified: dbUser.is_verified,
            passwordResetToken: dbUser.password_reset_token,
            passwordResetExpires: dbUser.password_reset_expires,
            createdAt: dbUser.created_at,
            updatedAt: dbUser.updated_at,
            churchName: dbUser.church_name,
            churchLogoUrl: dbUser.church_logo_url,
            emailNotificationsEnabled: dbUser.email_notifications_enabled,
            churchId: dbUser.church_id,
            isAccountOwner: dbUser.is_account_owner,
            // Add virtual properties
            isActive: typeof dbUser.email === 'string' ? !dbUser.email.startsWith('INACTIVE_') : true
          };
          
          // If this user has a churchId association, fetch church settings from that church's account owner
          if (user.churchId) {
            try {
              console.log(`User ${userId} has churchId ${user.churchId} directly assigned`);
              
              // Get the Account Owner for this church to inherit settings from
              // First, look for the account with the same ID as the churchId (which is usually the admin/owner)
              let accountOwnerQuery = await db.execute(
                sql`SELECT * FROM users 
                    WHERE id = ${user.churchId}
                    LIMIT 1`
              );
              
              // If no results, try to find the account owner through role-based lookup
              if (accountOwnerQuery.rows.length === 0) {
                accountOwnerQuery = await db.execute(
                  sql`SELECT * FROM users 
                      WHERE church_id = ${user.churchId} 
                      AND role IN ('ACCOUNT_OWNER', 'ADMIN') 
                      AND is_account_owner = true
                      LIMIT 1`
                );
              }
              
              if (accountOwnerQuery.rows.length > 0) {
                const adminUser = accountOwnerQuery.rows[0];
                console.log(`Found admin user for church: ${adminUser.id}`);
                
                // Copy church settings from the admin
                if (adminUser.church_name) {
                  user.churchName = adminUser.church_name;
                  console.log(`Inherited church name: ${user.churchName}`);
                }
                
                if (adminUser.church_logo_url) {
                  user.churchLogoUrl = adminUser.church_logo_url;
                  console.log(`Inherited church logo: ${user.churchLogoUrl}`);
                }
              } else {
                console.log(`No admin user found for church ID: ${user.churchId}`);
              }
            } catch (churchError) {
              console.error("Error fetching church info:", churchError);
              // Continue with the user's original data
            }
          }
          
          res.json(user);
        } else {
          // No user found
          res.status(404).json({ message: "User not found" });
        }
      } catch (dbError) {
        console.error("Database error in /api/auth/user:", dbError);
        
        // Return error since user was not found in database
        res.status(500).json({ message: "Database error fetching user" });
      }
    } catch (error) {
      console.error("Error in /api/auth/user:", error);
      res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Use direct payment links for subscription
  app.post('/api/subscription/create-checkout-session', isAuthenticated, isAccountOwner, async (req: any, res) => {
    try {
      const { plan } = req.body;
      
      if (!plan || !['MONTHLY', 'ANNUAL'].includes(plan)) {
        return res.status(400).json({ message: 'Invalid plan selected' });
      }
      
      const userId = req.user.claims.sub;
      console.log(`Redirecting user ${userId} to Stripe payment link for ${plan} plan`);
      
      // Get the direct payment link based on the plan
      const paymentLink = plan === 'MONTHLY' 
        ? process.env.STRIPE_MONTHLY_PAYMENT_LINK 
        : process.env.STRIPE_ANNUAL_PAYMENT_LINK;
      
      if (!paymentLink) {
        throw new Error(`Payment link for ${plan} plan not found`);
      }
      
      console.log(`Using payment link for ${plan} plan`);
      
      // Return the payment link URL
      res.json({ url: paymentLink });
    } catch (error) {
      console.error('Error generating payment link:', error);
      res.status(500).json({
        message: 'Error generating payment link',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Get subscription status
  app.get('/api/subscription/status', async (req: any, res) => {
    try {
      // If the user is not logged in, return 401
      if (!req.isAuthenticated() || !req.user || !req.user.claims || !req.user.claims.sub) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.claims.sub;
      console.log(`Fetching subscription status for user: ${userId}`);
      
      const user = await storage.getUser(userId);
      
      if (!user || !user.churchId) {
        return res.status(400).json({ message: 'User or church not found' });
      }
      
      console.log(`Found user with churchId: ${user.churchId}, checking subscription status`);
      
      const statusData = await storage.checkSubscriptionStatus(user.churchId);
      
      // Get additional subscription details like plan
      const subscription = await storage.getSubscription(user.churchId);
      
      console.log(`Found subscription status: ${statusData.status}, active: ${statusData.isActive}`);
      
      // Proper implementation would check Stripe subscription status
      // For now, check for a local file marker that payment was completed
      let paymentVerified = false;
      
      try {
        // Check if user has made a payment in this session
        if (req.session.paymentVerified) {
          paymentVerified = true;
          console.log('Found payment verification in session');
        }
      } catch (verifyError) {
        console.error('Error checking payment verification:', verifyError);
      }
      
      const response = paymentVerified ? 
        {
          ...statusData,
          status: "ACTIVE",
          isActive: true,
          isTrialExpired: false,
          plan: 'MONTHLY',
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        } : 
        {
          ...statusData,
          status: "TRIAL",     // Show as a trial
          isActive: true,      // Still active
          isTrialExpired: true, // But trial has expired
          daysRemaining: 0,     // 0 days remaining
          trialEndDate: new Date().toISOString(), // Trial ends today
          plan: 'TRIAL'        // Trial plan
        };
      
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

  // Initialize subscription upgrade with Stripe direct payment links
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
      
      console.log(`Using payment link for ${plan} plan upgrade`);
      
      // Return the payment link URL - client will redirect to this URL
      return res.json({ url: paymentLink });
    } catch (error) {
      console.error('Error generating payment link for upgrade:', error);
      res.status(500).json({
        message: 'Error generating payment link for upgrade',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Manual verification endpoint for payment
  app.post('/api/subscription/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.claims.sub;
      console.log('Manually marking payment as verified for user:', userId);
      
      // Get church for this user
      const user = await storage.getUserById(userId);
      
      if (!user?.churchId) {
        throw new Error('User has no associated church');
      }
      
      const churchId = user.churchId;
      
      // Update subscription status to active paid plan (using the same logic from stripe webhook)
      // Note: In production, this would be triggered by Stripe webhook, not manual verification
      const updatedSubscription = await storage.updateSubscriptionStatus(churchId, {
        isActive: true,
        status: 'ACTIVE',
        plan: 'MONTHLY', // Default to monthly plan for manual verification
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        canceledAt: null
      });
      
      console.log('Updated subscription:', updatedSubscription);
      
      // Update session to mark payment as verified
      req.session.paymentVerified = true;
      
      // Save the session
      await new Promise<void>((resolve) => {
        req.session.save((err: any) => {
          if (err) {
            console.error('Error saving session:', err);
          } else {
            console.log('Session saved with payment verification');
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

  const httpServer = createServer(app);
  return httpServer;
}
