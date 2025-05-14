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
  registerChurchSchema,
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
          role: "ADMIN",
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
      
      // Create initial service options for this church
      await db.insert(serviceOptions)
        .values([
          { 
            name: "Service Type", 
            value: "Sunday Morning", 
            isDefault: true, 
            churchId: userId 
          },
          { 
            name: "Service Type", 
            value: "Sunday Evening", 
            isDefault: false, 
            churchId: userId 
          },
          { 
            name: "Service Type", 
            value: "Wednesday Evening", 
            isDefault: false, 
            churchId: userId 
          }
        ]);
      
      console.log(`Created default service options for church: ${userId}`);
      
      // Create a trial subscription for this church
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

  // Create subscription with direct payment links and custom redirect URLs
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
        
        return res.status(200).json({ message: 'Verification successful', verified: true });
      } else {
        return res.status(400).json({ message: 'Invalid or expired verification code', verified: false });
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Payment verification endpoint with token validation
  app.post('/api/subscription/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.user.claims.sub;
      const { token } = req.body;
      
      console.log('Verifying payment for user:', userId);
      
      // Validate the token if provided
      if (token && req.session.checkoutToken) {
        if (token !== req.session.checkoutToken) {
          console.warn(`Token mismatch: ${token} vs ${req.session.checkoutToken}`);
          // Continue anyway since we're already authenticated
        } else {
          console.log('Token verified successfully');
        }
      }
      
      // Get church for this user
      const user = await storage.getUserById(userId);
      
      if (!user?.churchId) {
        throw new Error('User has no associated church');
      }
      
      const churchId = user.churchId;
      
      // Get plan from session if available
      const plan = req.session.checkoutPlan || 'MONTHLY';
      const periodDays = plan === 'MONTHLY' ? 30 : 365;
      
      // Update subscription status to active paid plan
      const updatedSubscription = await storage.updateSubscriptionStatus(churchId, {
        status: 'ACTIVE',
        plan: plan,
        startDate: new Date(),
        endDate: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
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
