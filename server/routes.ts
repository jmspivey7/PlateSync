import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import session from 'express-session';
import passport from 'passport';
import connectPg from 'connect-pg-simple';

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
import { verifyStripeSubscription, updateSubscriptionFromStripe, cancelStripeSubscription } from "./stripe-helper";
import { 
  batches, 
  churches, 
  donations, 
  members, 
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
  // Set up app.trustProxy before any middleware
  app.set("trust proxy", 1);
  
  // Setup auth middleware and routes
  setupSessionMiddleware(app);
  
  // Add logout routes (supports both GET and POST)
  const handleLogout = (req: Request, res: Response) => {
    // Completely destroy the session
    req.session.destroy((err) => {
      if (err) {
        console.error("Session destruction error:", err);
      }
      
      // Clear all cookies
      res.clearCookie('connect.sid');
      
      // For GET requests or if 'redirect' is true in the POST body, redirect to login
      const isGetRequest = req.method === 'GET';
      const wantsRedirect = isGetRequest || (req.body && req.body.redirect);
      
      if (wantsRedirect) {
        res.redirect('/login-local');
      } else {
        // For API calls that don't want redirect, just send a success response
        res.status(200).json({ success: true, message: "Logged out successfully" });
      }
    });
  };
  
  // Support both GET and POST for logout
  app.get("/api/logout", handleLogout);
  app.post("/api/logout", handleLogout);
  
  // Set up global admin routes
  app.use('/api/global-admin', globalAdminRoutes);
  
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
      const sgMail = require('@sendgrid/mail');
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
  
  // If in development, add test endpoints
  if (process.env.NODE_ENV === 'development') {
    setupTestEndpoints(app);
  }
  
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
  
  // Update email template
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
  
  // Initialize default email templates for a church
  app.post('/api/email-templates/initialize', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const churchId = req.user.churchId || userId;
      const church = await storage.getChurch(churchId);
      
      if (!church) {
        return res.status(404).json({ message: 'Church not found' });
      }
      
      // Check if templates already exist
      const existingTemplates = await storage.getEmailTemplates(churchId);
      const existingTypes = existingTemplates.map(t => t.templateType);
      
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
    <p><strong>Donation Amount:</strong> <span class="amount">${{amount}}</span></p>
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
Amount: ${{amount}}
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
    <p><strong>Total Amount:</strong> <span class="total">${{totalAmount}}</span></p>
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
Total Amount: ${{totalAmount}}
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
  
  // Get system-wide email templates
  app.get('/api/email-templates/system', requireGlobalAdmin, async (req: any, res) => {
    try {
      // System templates use the special SYSTEM_TEMPLATES churchId
      const systemChurchId = 'SYSTEM_TEMPLATES';
      
      // Check if templates exist
      let templates = await storage.getEmailTemplates(systemChurchId);
      
      res.json(templates);
    } catch (error) {
      console.error('Error fetching system email templates:', error);
      res.status(500).json({ message: 'Failed to fetch system email templates' });
    }
  });
  
  // Initialize system email templates
  app.post('/api/email-templates/initialize-system', requireGlobalAdmin, async (req: any, res) => {
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
        // Default to trial expired
        response = {
          ...statusData,
          status: "TRIAL",     // Show as a trial
          isActive: true,      // Still active 
          isTrialExpired: true, // But trial has expired
          daysRemaining: 0,     // 0 days remaining
          trialEndDate: new Date().toISOString(), // Trial ends today
          plan: 'TRIAL'        // Trial plan
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
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log(`User found: ${user.id}, verifying password...`);
      
      // Verify password
      const passwordValid = await verifyPassword(password, user.password || '');
      if (!passwordValid) {
        console.log(`Invalid password for user: ${user.id}`);
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      console.log(`Password verified successfully for user: ${user.id}`);
      
      // If church is suspended, check if the user is a global admin
      if (user.churchId) {
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
        
        // If req.user is already a complete user object from storage (via deserializer)
        if (req.user.email) {
          // Remove sensitive data
          const { password, ...userWithoutPassword } = req.user;
          return res.status(200).json(userWithoutPassword);
        }
        
        // Otherwise, get full user data using the ID
        const userId = req.user.id;
        console.log(`Getting full user data for ID: ${userId}`);
        
        const user = await storage.getUserById(userId);
        
        if (!user) {
          console.log("User not found in database:", userId);
          return res.status(200).json(null);
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
          
          // Filter out any users where role is MASTER_ADMIN
          const isNotGlobalAdmin = user.role !== "MASTER_ADMIN";
          
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

  const httpServer = createServer(app);
  return httpServer;
}
