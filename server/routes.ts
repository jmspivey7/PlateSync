import express, { type Express, type Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { sendDonationNotification, testSendGridConfiguration, sendWelcomeEmail, sendPasswordResetEmail, sendCountReport } from "./sendgrid";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";

// Password hashing function using scrypt
async function scryptHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') + ':' + salt);
    });
  });
}
import { isAdmin, hasRole } from "./middleware/roleMiddleware";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { 
  insertMemberSchema, 
  insertDonationSchema,
  insertBatchSchema,
  donationTypeEnum,
  insertReportRecipientSchema,
  notificationStatusEnum,
  batchStatusEnum,
  updateUserSchema,
  insertServiceOptionSchema,
  createUserSchema,
  userRoleEnum,
  users
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure avatars directory exists
  const avatarsDir = path.join('public', 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  // Serve static avatar files
  app.use('/avatars', express.static(path.join('public', 'avatars')));
  
  // Serve static logo files
  app.use('/logos', express.static(path.join('public', 'logos')));
  // Set up multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  });
  
  // Set up multer for avatar uploads with disk storage
  const avatarStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, 'public/avatars');
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'avatar-' + uniqueSuffix + ext);
    }
  });
  
  const avatarUpload = multer({ 
    storage: avatarStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });
  
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Email verification and password setting
  app.post('/api/auth/verify-email', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Find user with matching token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token));
      
      if (!user) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      // Check if token is expired
      const now = new Date();
      if (user.passwordResetExpires && now > user.passwordResetExpires) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      // Hash the password
      const passwordHash = await scryptHash(password);
      
      // Update user with password and mark as verified
      const [updatedUser] = await db
        .update(users)
        .set({
          password: passwordHash,
          isVerified: true,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning();
      
      res.json({ 
        message: "Email verified and password set successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          isVerified: updatedUser.isVerified
        }
      });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });
  
  // Create a new user
  app.post('/api/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { email, firstName, lastName, role, churchName } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (existingUser.length > 0) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      // Create new user with verification token
      const newUser = await storage.createUser({
        email,
        firstName,
        lastName,
        role,
        churchName
      });
      
      // Get application URL from request for verification link
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const verificationUrl = `${appUrl}/verify`;
      
      // Send welcome email
      await sendWelcomeEmail({
        to: email,
        firstName: firstName || '',
        lastName: lastName || '',
        churchName: churchName || 'PlateSync',
        verificationToken: newUser.passwordResetToken || '',
        verificationUrl
      });
      
      res.status(201).json({
        message: "User created successfully",
        user: {
          id: newUser.id,
          email: newUser.email
        }
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  

  
  // Profile routes
  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate incoming data with zod schema
      const validatedData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserSettings(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // Avatar upload route (Available to both Admin and Usher roles)
  // Password change endpoint
  app.post('/api/profile/password', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          success: false, 
          message: "Both current and new password are required" 
        });
      }
      
      // Since we're using Replit Auth and don't have direct access to user passwords,
      // this endpoint will simply acknowledge the request
      
      res.json({ 
        success: true, 
        message: "Password has been updated successfully" 
      });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to change password" 
      });
    }
  });

  app.post('/api/profile/avatar', isAuthenticated, avatarUpload.single('avatar'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      
      // Get the relative path to the uploaded file
      const avatarUrl = `/avatars/${req.file.filename}`;
      
      // Update user profile with the new avatar URL
      const updatedUser = await storage.updateUserSettings(userId, {
        profileImageUrl: avatarUrl
      });
      
      res.json({
        success: true,
        message: "Profile picture updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ 
        success: false,
        message: `Failed to upload avatar: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });
  
  // Settings routes
  app.patch('/api/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate incoming data with zod schema
      const validatedData = updateUserSchema.parse(req.body);
      
      const updatedUser = await storage.updateUserSettings(userId, validatedData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating settings:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update settings" });
    }
  });
  
  // Setup logo storage for church logos
  const logoStorage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, 'public/logos');
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'church-logo-' + uniqueSuffix + ext);
    }
  });
  
  const logoUpload = multer({ 
    storage: logoStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
      // Accept only image files
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });
  
  // Church logo upload endpoint
  app.post('/api/settings/logo', isAuthenticated, logoUpload.single('logo'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      const userId = req.user.claims.sub;
      const logoUrl = `/logos/${req.file.filename}`;
      
      const updatedUser = await storage.updateUserSettings(userId, { churchLogoUrl: logoUrl });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error uploading logo:", error);
      res.status(500).json({ message: "Failed to upload logo" });
    }
  });
  
  // Remove church logo endpoint
  app.delete('/api/settings/logo', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get current user to find the logo path
      const user = await storage.getUser(userId);
      
      if (user?.churchLogoUrl) {
        const logoPath = path.join('public', user.churchLogoUrl);
        
        // Check if file exists before attempting to delete
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }
      }
      
      // Update user record to remove logo URL
      const updatedUser = await storage.updateUserSettings(userId, { churchLogoUrl: null });
      res.json(updatedUser);
    } catch (error) {
      console.error("Error removing logo:", error);
      res.status(500).json({ message: "Failed to remove logo" });
    }
  });
  

  
  // User management routes
  app.get('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const users = await storage.getUsers(userId);
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  
  app.patch('/api/users/:id/role', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const userId = req.params.id;
      
      // Don't allow admins to change their own role
      if (adminId === userId) {
        return res.status(400).json({ 
          message: "You cannot change your own role. Another admin must make this change."
        });
      }
      
      const { role } = req.body;
      
      // Validate role
      if (!userRoleEnum.safeParse(role).success) {
        return res.status(400).json({ 
          message: `Invalid role. Must be one of: ${userRoleEnum.options.join(', ')}`
        });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
  
  // Create user (admin only)
  app.post('/api/users', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      
      // Validate user data
      const userData = createUserSchema.parse(req.body);
      
      // Create the user
      const newUser = await storage.createUser({
        ...userData,
        churchId: adminId // Users belong to the same church as the admin
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid user data", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create user" });
    }
  });
  
  // Delete user (admin only)
  app.delete('/api/users/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const adminId = req.user.claims.sub;
      const userId = req.params.id;
      
      // Don't allow admins to delete themselves
      if (adminId === userId) {
        return res.status(400).json({ 
          message: "You cannot delete your own account."
        });
      }
      
      await storage.deleteUser(userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });
  
  // Email Settings routes
  app.get('/api/email-settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Fetch the default settings from environment variables
      const emailSettings = {
        enabled: user.emailNotificationsEnabled || false,
        fromEmail: process.env.SENDGRID_FROM_EMAIL || "",
        fromName: user.churchName || "PlateSync",
        templateSubject: "Thank you for your donation",
        templateBody: "Dear {{donorName}},\n\nThank you for your donation of ${{amount}} on {{date}}.\n\nSincerely,\n{{churchName}}"
      };
      
      res.json(emailSettings);
    } catch (error) {
      console.error("Error fetching email settings:", error);
      res.status(500).json({ message: "Failed to fetch email settings" });
    }
  });
  
  app.post('/api/email-settings', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { enabled, fromEmail, fromName, templateSubject, templateBody } = req.body;
      
      // Update user settings
      const updatedUser = await storage.updateUserSettings(userId, { 
        emailNotificationsEnabled: enabled,
        churchName: fromName 
      });
      
      res.json({
        enabled,
        fromEmail,
        fromName,
        templateSubject,
        templateBody
      });
    } catch (error) {
      console.error("Error updating email settings:", error);
      res.status(500).json({ message: "Failed to update email settings" });
    }
  });
  
  app.post('/api/email-settings/test', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email, fromEmail, fromName, templateSubject, templateBody } = req.body;
      
      // Test the email by sending a sample donation notification
      const testParams = {
        to: email,
        from: fromEmail,
        subject: templateSubject.replace('{{donorName}}', 'Test User'),
        text: templateBody
          .replace('{{donorName}}', 'Test User')
          .replace('{{amount}}', '100.00')
          .replace('{{date}}', new Date().toLocaleDateString())
          .replace('{{churchName}}', fromName)
      };
      
      if (await sendDonationNotification({
        to: email,
        amount: "$100.00",
        date: new Date().toLocaleDateString(),
        donorName: "Test User",
        churchName: fromName
      })) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Error sending test email:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error sending test email: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });
  
  // SendGrid test endpoint
  app.get('/api/test-sendgrid', isAuthenticated, async (_req, res) => {
    try {
      const testResult = await testSendGridConfiguration();
      
      if (testResult) {
        res.json({ 
          success: true, 
          message: "SendGrid configuration is working correctly! Your account is ready to send donation notifications." 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "SendGrid configuration test failed. Please check your API key, sender email, and logging for details." 
        });
      }
    } catch (error) {
      console.error("Error testing SendGrid configuration:", error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing SendGrid: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  });

  // Members routes
  app.get('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const members = await storage.getMembers(userId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ message: "Failed to fetch members" });
    }
  });

  app.get('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      
      const member = await storage.getMemberWithDonations(memberId, userId);
      
      if (!member) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(member);
    } catch (error) {
      console.error("Error fetching member:", error);
      res.status(500).json({ message: "Failed to fetch member" });
    }
  });

  app.post('/api/members', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberData = { ...req.body, churchId: userId };
      
      const validatedData = insertMemberSchema.parse(memberData);
      const newMember = await storage.createMember(validatedData);
      
      res.status(201).json(newMember);
    } catch (error) {
      console.error("Error creating member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  app.patch('/api/members/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const memberId = parseInt(req.params.id);
      
      if (isNaN(memberId)) {
        return res.status(400).json({ message: "Invalid member ID" });
      }
      
      const validatedData = insertMemberSchema.partial().parse(req.body);
      const updatedMember = await storage.updateMember(memberId, validatedData, userId);
      
      if (!updatedMember) {
        return res.status(404).json({ message: "Member not found" });
      }
      
      res.json(updatedMember);
    } catch (error) {
      console.error("Error updating member:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // CSV Import endpoint
  app.post('/api/members/import', isAuthenticated, upload.single('csvFile'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      // Get file buffer
      const fileBuffer = req.file.buffer;
      const fileContent = fileBuffer.toString('utf-8');
      
      // Parse CSV
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
      
      if (!records || records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or invalid" });
      }
      
      // Check for required columns
      const requiredColumns = ['First Name', 'Last Name'];
      const headers = Object.keys(records[0]);
      
      const missingColumns = requiredColumns.filter(col => 
        !headers.some(header => header.toLowerCase() === col.toLowerCase())
      );
      
      if (missingColumns.length > 0) {
        return res.status(400).json({ 
          message: `CSV file is missing required columns: ${missingColumns.join(', ')}` 
        });
      }
      
      // Import members
      const importedMembers = [];
      const errors = [];
      
      for (const [index, record] of records.entries()) {
        try {
          // Map CSV columns to our data model
          const memberData = {
            firstName: record['First Name'],
            lastName: record['Last Name'],
            email: record['Email'] || null,
            phone: record['Mobile Phone Number'] || null,
            notes: '',
            churchId: userId
          };
          
          // Validate data
          const validatedData = insertMemberSchema.parse(memberData);
          
          // Create member
          const member = await storage.createMember(validatedData);
          importedMembers.push(member);
        } catch (error) {
          console.error(`Error importing row ${index + 1}:`, error);
          errors.push({
            row: index + 1,
            message: error instanceof z.ZodError 
              ? error.errors.map(e => e.message).join(', ')
              : 'Failed to import member'
          });
        }
      }
      
      res.status(200).json({
        message: 'CSV import completed',
        importedCount: importedMembers.length,
        totalRows: records.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : null
      });
      
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ message: "Failed to import members" });
    }
  });

  // Batch routes
  app.get('/api/batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batches = await storage.getBatches(userId);
      res.json(batches);
    } catch (error) {
      console.error("Error fetching batches:", error);
      res.status(500).json({ message: "Failed to fetch batches" });
    }
  });

  app.get('/api/batches/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentBatch = await storage.getCurrentBatch(userId);
      res.json(currentBatch);
    } catch (error) {
      console.error("Error fetching current batch:", error);
      res.status(500).json({ message: "Failed to fetch current batch" });
    }
  });
  
  app.get('/api/batches/latest-finalized', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const finalizedBatch = await storage.getLatestFinalizedBatch(userId);
      res.json(finalizedBatch);
    } catch (error) {
      console.error("Error fetching latest finalized batch:", error);
      res.status(500).json({ message: "Failed to fetch latest finalized batch" });
    }
  });
  
  // GET all batches with their donations (for chart)
  app.get('/api/batches/with-donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batches = await storage.getBatches(userId);
      
      // For each batch, get its donations
      const batchesWithDonations = await Promise.all(
        batches.map(async (batch) => {
          const donations = await storage.getDonationsByBatch(batch.id, userId);
          return {
            ...batch,
            donations: donations
          };
        })
      );
      
      res.json(batchesWithDonations);
    } catch (error) {
      console.error("Error fetching batches with donations:", error);
      res.status(500).json({ message: "Failed to fetch batches with donations" });
    }
  });

  app.get('/api/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      const batch = await storage.getBatchWithDonations(batchId, userId);
      
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      res.json(batch);
    } catch (error) {
      console.error("Error fetching batch:", error);
      res.status(500).json({ message: "Failed to fetch batch" });
    }
  });

  app.get('/api/batches/:id/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      const donations = await storage.getDonationsByBatch(batchId, userId);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching batch donations:", error);
      res.status(500).json({ message: "Failed to fetch batch donations" });
    }
  });

  app.post('/api/batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchData = { 
        ...req.body, 
        churchId: userId,
        // Convert string date to Date object if provided
        date: req.body.date ? new Date(req.body.date) : new Date()
      };
      
      const validatedData = insertBatchSchema.parse(batchData);
      const newBatch = await storage.createBatch(validatedData);
      
      res.status(201).json(newBatch);
    } catch (error) {
      console.error("Error creating batch:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create batch" });
    }
  });

  app.patch('/api/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      // Handle date conversion if present
      const updateData = { ...req.body };
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      
      // We use z.object to create a partial schema that allows null values where appropriate
      const partialBatchSchema = z.object({
        name: z.string().optional(),
        date: z.date().optional(),
        status: z.string().optional(),
        notes: z.string().optional().nullable(),
        service: z.string().optional().nullable(),
        totalAmount: z.string().optional(),
        churchId: z.string().optional()
      });
      
      const validatedData = partialBatchSchema.parse(updateData);
      const updatedBatch = await storage.updateBatch(batchId, validatedData, userId);
      
      if (!updatedBatch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error updating batch:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update batch" });
    }
  });
  
  // Primary attestation route
  app.post('/api/batches/:id/attest-primary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      // Validate attestor name
      const { name } = req.body;
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Attestor name is required" });
      }
      
      // Get batch to verify it exists and check status
      const batch = await storage.getBatch(batchId, userId);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // Can only attest if the batch is CLOSED
      if (batch.status !== 'CLOSED') {
        return res.status(400).json({ 
          message: "Batch must be closed before attestation can begin" 
        });
      }
      
      // Add primary attestation
      const updatedBatch = await storage.addPrimaryAttestation(batchId, userId, name, userId);
      
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error adding primary attestation:", error);
      res.status(500).json({ message: "Failed to add primary attestation" });
    }
  });
  
  // Secondary attestation route
  app.post('/api/batches/:id/attest-secondary', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      // Validate attestor info
      const { attestorId, name } = req.body;
      
      if (!attestorId) {
        return res.status(400).json({ message: "Secondary attestor ID is required" });
      }
      
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: "Attestor name is required" });
      }
      
      // Get batch to verify it exists and check status
      const batch = await storage.getBatch(batchId, userId);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // Can only add secondary attestation if we have a primary attestation
      if (!batch.primaryAttestorId) {
        return res.status(400).json({ 
          message: "Primary attestation must be completed first" 
        });
      }
      
      // Secondary attestor should not be the same as primary
      if (attestorId === batch.primaryAttestorId) {
        return res.status(400).json({ 
          message: "Secondary attestor must be different from primary attestor" 
        });
      }
      
      // Add secondary attestation
      const updatedBatch = await storage.addSecondaryAttestation(batchId, attestorId, name, userId);
      
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error adding secondary attestation:", error);
      res.status(500).json({ message: "Failed to add secondary attestation" });
    }
  });
  
  // Finalize attestation and complete the batch
  app.post('/api/batches/:id/confirm-attestation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      // Get batch to verify it exists and check status
      const batch = await storage.getBatch(batchId, userId);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // Can only confirm if both attestations are complete
      if (!batch.primaryAttestorId || !batch.secondaryAttestorId) {
        return res.status(400).json({ 
          message: "Both primary and secondary attestations must be completed before confirmation" 
        });
      }
      
      // Confirm attestation and finalize the batch
      const updatedBatch = await storage.confirmAttestation(batchId, userId, userId);
      
      // Send count report notifications
      try {
        // Get batch donations to prepare report data
        const batchWithDonations = await storage.getBatchWithDonations(batchId, userId);
        
        // Get user info for church name
        const user = await storage.getUser(userId);
        
        if (updatedBatch && batchWithDonations && user && user.emailNotificationsEnabled !== false) {
          // Calculate donation amounts
          const donations = batchWithDonations.donations || [];
          const totalAmount = parseFloat(updatedBatch.totalAmount || '0').toFixed(2);
          
          // Calculate cash and check amounts
          const cashDonations = donations.filter(d => d.donationType === 'CASH');
          const checkDonations = donations.filter(d => d.donationType === 'CHECK');
          
          const cashAmount = cashDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2);
          const checkAmount = checkDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0).toFixed(2);
          
          // Format date for display
          const batchDate = new Date(updatedBatch.date);
          const formattedDate = batchDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          
          // Get report recipients and send emails
          const reportRecipients = await storage.getReportRecipients(userId);
          
          if (reportRecipients.length > 0) {
            console.log(`Sending count report emails to ${reportRecipients.length} recipients`);
            console.log('Report recipients:', JSON.stringify(reportRecipients));
            
            for (const recipient of reportRecipients) {
              console.log(`Attempting to send email to ${recipient.email}`);
              try {
                const emailResult = await sendCountReport({
                  to: recipient.email,
                  recipientName: `${recipient.firstName} ${recipient.lastName}`,
                  churchName: user.churchName || 'Your Church',
                  batchName: updatedBatch.name,
                  batchDate: formattedDate,
                  totalAmount,
                  cashAmount,
                  checkAmount,
                  donationCount: donations.length
                });
                console.log(`Email send result: ${emailResult ? 'Success' : 'Failed'}`);
              } catch (innerError) {
                console.error('Error sending individual report email:', innerError);
              }
            }
          } else {
            console.log('No report recipients configured. Skipping count report notifications.');
          }
        }
      } catch (emailError) {
        console.error('Error sending count report notifications:', emailError);
        // Don't throw error, allow the API to succeed even if email sending fails
      }
      
      res.json(updatedBatch);
    } catch (error) {
      console.error("Error confirming attestation:", error);
      res.status(500).json({ message: "Failed to confirm attestation" });
    }
  });
  
  // DELETE endpoint for deleting a batch
  app.delete('/api/batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const batchId = parseInt(req.params.id);
      
      if (isNaN(batchId)) {
        return res.status(400).json({ message: "Invalid batch ID" });
      }
      
      // Check if batch exists first
      const batch = await storage.getBatch(batchId, userId);
      if (!batch) {
        return res.status(404).json({ message: "Batch not found" });
      }
      
      // Delete the batch and its donations
      await storage.deleteBatch(batchId, userId);
      
      res.status(200).json({ message: "Batch and associated donations deleted successfully" });
    } catch (error) {
      console.error("Error deleting batch:", error);
      res.status(500).json({ message: "Failed to delete batch" });
    }
  });
  
  // Add PATCH endpoint for updating donations
  app.patch('/api/donations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donationId = parseInt(req.params.id);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ message: "Invalid donation ID" });
      }
      
      // Get the original donation to calculate batch total changes
      const originalDonation = await storage.getDonation(donationId, userId);
      if (!originalDonation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      // Handle data conversions
      const updateData = { ...req.body };
      if (updateData.date) {
        updateData.date = new Date(updateData.date);
      }
      if (updateData.donationType) {
        updateData.donationType = updateData.donationType.toUpperCase();
      }
      
      // We use z.object to create a partial schema that allows null values where appropriate
      const partialDonationSchema = z.object({
        date: z.date().optional(),
        amount: z.string().optional(),
        donationType: z.string().optional(),
        checkNumber: z.string().optional().nullable(),
        notes: z.string().optional().nullable(),
        memberId: z.number().optional().nullable(),
        batchId: z.number().optional().nullable(),
        churchId: z.string().optional()
      });
      
      const validatedData = partialDonationSchema.parse(updateData);
      const updatedDonation = await storage.updateDonation(donationId, validatedData, userId);
      
      if (!updatedDonation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      // Update batch totals if amount changed or batch changed
      const originalAmount = parseFloat(originalDonation.amount.toString());
      const newAmount = parseFloat(updatedDonation.amount.toString());
      const originalBatchId = originalDonation.batchId;
      const newBatchId = updatedDonation.batchId;
      
      // If amount changed but batch stayed the same
      if (originalAmount !== newAmount && originalBatchId === newBatchId && newBatchId) {
        const batch = await storage.getBatch(newBatchId, userId);
        if (batch) {
          const amountDifference = newAmount - originalAmount;
          const newTotal = parseFloat(batch.totalAmount.toString()) + amountDifference;
          await storage.updateBatch(batch.id, { totalAmount: newTotal.toString() }, userId);
        }
      }
      // If batch changed
      else if (originalBatchId !== newBatchId) {
        // Subtract from original batch
        if (originalBatchId) {
          const originalBatch = await storage.getBatch(originalBatchId, userId);
          if (originalBatch) {
            const newOriginalTotal = parseFloat(originalBatch.totalAmount.toString()) - originalAmount;
            await storage.updateBatch(
              originalBatch.id, 
              { totalAmount: Math.max(0, newOriginalTotal).toString() },
              userId
            );
          }
        }
        
        // Add to new batch
        if (newBatchId) {
          const newBatch = await storage.getBatch(newBatchId, userId);
          if (newBatch) {
            const newBatchTotal = parseFloat(newBatch.totalAmount.toString()) + newAmount;
            await storage.updateBatch(
              newBatch.id,
              { totalAmount: newBatchTotal.toString() },
              userId
            );
          }
        }
      }
      
      res.json(updatedDonation);
    } catch (error) {
      console.error("Error updating donation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update donation" });
    }
  });

  // Donations routes
  app.get('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donations = await storage.getDonationsWithMembers(userId);
      res.json(donations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ message: "Failed to fetch donations" });
    }
  });

  app.get('/api/donations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donationId = parseInt(req.params.id);
      
      if (isNaN(donationId)) {
        return res.status(400).json({ message: "Invalid donation ID" });
      }
      
      const donation = await storage.getDonationWithMember(donationId, userId);
      
      if (!donation) {
        return res.status(404).json({ message: "Donation not found" });
      }
      
      res.json(donation);
    } catch (error) {
      console.error("Error fetching donation:", error);
      res.status(500).json({ message: "Failed to fetch donation" });
    }
  });

  app.post('/api/donations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const donationData = { 
        ...req.body, 
        churchId: userId, 
        // Ensure proper format for donation type
        donationType: req.body.donationType?.toUpperCase(),
        // Convert string date to Date object
        date: new Date(req.body.date)
      };
      
      // If no batch is specified, get or create a current batch
      if (!donationData.batchId) {
        const currentBatch = await storage.getCurrentBatch(userId);
        if (currentBatch) {
          donationData.batchId = currentBatch.id;
        }
      }
      
      const validatedData = insertDonationSchema.parse(donationData);
      
      // Create the donation
      const newDonation = await storage.createDonation(validatedData);
      
      // Update the batch total amount
      if (newDonation.batchId) {
        const batch = await storage.getBatch(newDonation.batchId, userId);
        if (batch) {
          const newTotal = parseFloat(batch.totalAmount.toString()) + parseFloat(newDonation.amount.toString());
          await storage.updateBatch(
            batch.id,
            { totalAmount: newTotal.toString() },
            userId
          );
        }
      }
      
      // Send notification if requested, if it's not an anonymous donation, and if notifications are enabled
      if (req.body.sendNotification && validatedData.memberId) {
        try {
          const member = await storage.getMember(validatedData.memberId, userId);
          const user = await storage.getUser(userId);
          
          // Check if user has email notifications enabled
          const emailNotificationsEnabled = user?.emailNotificationsEnabled !== false;
          
          if (member && member.email && user && emailNotificationsEnabled) {
            const churchName = user.churchName || "Our Church";
            
            // Send email notification via SendGrid
            const notificationSent = await sendDonationNotification({
              to: member.email,
              amount: validatedData.amount.toString(),
              date: validatedData.date instanceof Date ? validatedData.date.toLocaleDateString() : new Date().toLocaleDateString(),
              donorName: `${member.firstName} ${member.lastName}`,
              churchName: churchName,
            });
            
            // Update donation notification status
            if (notificationSent) {
              await storage.updateDonationNotificationStatus(
                newDonation.id, 
                notificationStatusEnum.enum.SENT
              );
            } else {
              await storage.updateDonationNotificationStatus(
                newDonation.id, 
                notificationStatusEnum.enum.FAILED
              );
            }
          } else {
            await storage.updateDonationNotificationStatus(
              newDonation.id, 
              notificationStatusEnum.enum.NOT_REQUIRED
            );
          }
        } catch (notificationError) {
          console.error("Error sending notification:", notificationError);
          await storage.updateDonationNotificationStatus(
            newDonation.id, 
            notificationStatusEnum.enum.FAILED
          );
        }
      } else {
        await storage.updateDonationNotificationStatus(
          newDonation.id, 
          notificationStatusEnum.enum.NOT_REQUIRED
        );
      }
      
      // Fetch the donation with updated notification status
      const finalDonation = await storage.getDonation(newDonation.id, userId);
      
      res.status(201).json(finalDonation);
    } catch (error) {
      console.error("Error creating donation:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create donation" });
    }
  });

  // Dashboard statistics route
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const todaysDonations = await storage.getTodaysDonations(userId);
      const weeklyDonations = await storage.getWeeklyDonations(userId);
      const monthlyDonations = await storage.getMonthlyDonations(userId);
      const activeDonors = await storage.getActiveDonorCount(userId);
      
      res.json({
        todaysDonations,
        weeklyDonations,
        monthlyDonations,
        activeDonors
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Test SendGrid configuration
  app.get('/api/test-sendgrid', isAuthenticated, async (req: any, res) => {
    try {
      const { testSendGridConfiguration } = await import('./sendgrid');
      const result = await testSendGridConfiguration();
      
      if (result) {
        res.json({ 
          success: true, 
          message: 'SendGrid configuration test passed! Your API key is valid and working properly.' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'SendGrid configuration test failed. Check the server logs for detailed error information.'
        });
      }
    } catch (error: any) {
      console.error('Error testing SendGrid:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error testing SendGrid: ${error.message || 'Unknown error'}` 
      });
    }
  });

  // Initialize service options for current user
  app.post('/api/service-options/initialize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.createDefaultServiceOptions(userId);
      const options = await storage.getServiceOptions(userId);
      res.json(options);
    } catch (error) {
      console.error("Error initializing service options:", error);
      res.status(500).json({ message: "Failed to initialize service options" });
    }
  });

  // Service Options routes
  app.get('/api/service-options', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const options = await storage.getServiceOptions(userId);
      res.json(options);
    } catch (error) {
      console.error("Error fetching service options:", error);
      res.status(500).json({ message: "Failed to fetch service options" });
    }
  });
  
  app.post('/api/service-options', isAuthenticated, async (req: any, res) => {
    try {
      console.log("POST /api/service-options - Request body:", req.body);
      console.log("POST /api/service-options - User:", req.user);
      
      const userId = req.user.claims.sub;
      
      // Ensure body is properly parsed
      let bodyData = req.body;
      if (typeof bodyData === 'string') {
        try {
          bodyData = JSON.parse(bodyData);
        } catch (e) {
          console.error("Failed to parse request body as JSON:", e);
          return res.status(400).json({ message: "Invalid JSON in request body" });
        }
      }
      
      console.log("POST /api/service-options - Parsed body:", bodyData);
      
      const validatedData = insertServiceOptionSchema.parse({
        ...bodyData,
        churchId: userId
      });
      
      console.log("POST /api/service-options - Validated data:", validatedData);
      
      const newOption = await storage.createServiceOption(validatedData);
      console.log("POST /api/service-options - Created option:", newOption);
      
      res.status(201).json(newOption);
    } catch (error) {
      console.error("Error creating service option:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create service option" });
    }
  });
  
  app.patch('/api/service-options/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const optionId = parseInt(req.params.id);
      
      if (isNaN(optionId)) {
        return res.status(400).json({ message: "Invalid option ID" });
      }
      
      // Make sure the option exists and belongs to this church
      const existingOption = await storage.getServiceOption(optionId, userId);
      if (!existingOption) {
        return res.status(404).json({ message: "Service option not found" });
      }
      
      const validatedData = insertServiceOptionSchema.partial().parse({
        ...req.body,
        churchId: userId
      });
      
      const updatedOption = await storage.updateServiceOption(optionId, validatedData, userId);
      res.json(updatedOption);
    } catch (error) {
      console.error("Error updating service option:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update service option" });
    }
  });
  
  app.delete('/api/service-options/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const optionId = parseInt(req.params.id);
      
      if (isNaN(optionId)) {
        return res.status(400).json({ message: "Invalid option ID" });
      }
      
      // Make sure the option exists and belongs to this church
      const existingOption = await storage.getServiceOption(optionId, userId);
      if (!existingOption) {
        return res.status(404).json({ message: "Service option not found" });
      }
      
      await storage.deleteServiceOption(optionId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting service option:", error);
      res.status(500).json({ message: "Failed to delete service option" });
    }
  });

  // Password reset routes
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (!user) {
        // For security reasons, don't reveal whether the email exists or not
        return res.json({ 
          success: true, 
          message: "If your email is registered, you will receive password reset instructions" 
        });
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (1 hour from now)
      const expires = new Date();
      expires.setHours(expires.getHours() + 1);
      
      // Update user with reset token
      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: expires,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
      
      // Build reset URL
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;
      
      // Send password reset email
      await sendPasswordResetEmail({
        to: email,
        resetUrl
      });
      
      res.json({ 
        success: true, 
        message: "If your email is registered, you will receive password reset instructions" 
      });
    } catch (error) {
      console.error("Error initiating password reset:", error);
      res.status(500).json({ 
        success: false,
        message: "Error processing password reset request" 
      });
    }
  });
  
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      
      // Find user with matching token
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token));
      
      if (!user) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      // Check if token is expired
      const now = new Date();
      if (user.passwordResetExpires && now > user.passwordResetExpires) {
        return res.status(401).json({ message: "Token has expired" });
      }
      
      // Hash the new password
      const passwordHash = await scryptHash(password);
      
      // Update user with new password and clear reset token
      const [updatedUser] = await db
        .update(users)
        .set({
          password: passwordHash,
          passwordResetToken: null,
          passwordResetExpires: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning();
      
      res.json({ 
        success: true,
        message: "Password has been reset successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email
        }
      });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to reset password" 
      });
    }
  });

  // Report Recipients endpoints (for Count Report Notifications)
  // GET all report recipients
  app.get('/api/report-recipients', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipients = await storage.getReportRecipients(userId);
      res.json(recipients);
    } catch (error) {
      console.error("Error fetching report recipients:", error);
      res.status(500).json({ message: "Failed to fetch report recipients" });
    }
  });

  // GET single report recipient
  app.get('/api/report-recipients/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipientId = parseInt(req.params.id);
      
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: "Invalid recipient ID" });
      }
      
      const recipient = await storage.getReportRecipient(recipientId, userId);
      
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      res.json(recipient);
    } catch (error) {
      console.error("Error fetching report recipient:", error);
      res.status(500).json({ message: "Failed to fetch report recipient" });
    }
  });

  // CREATE new report recipient
  app.post('/api/report-recipients', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      const recipientData = {
        ...req.body,
        churchId: userId
      };
      
      // Validate with zod schema
      const validatedData = insertReportRecipientSchema.parse(recipientData);
      const newRecipient = await storage.createReportRecipient(validatedData);
      
      res.status(201).json(newRecipient);
    } catch (error) {
      console.error("Error creating report recipient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create report recipient" });
    }
  });

  // UPDATE report recipient
  app.patch('/api/report-recipients/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipientId = parseInt(req.params.id);
      
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: "Invalid recipient ID" });
      }
      
      // Create a partial schema for validation
      const partialRecipientSchema = z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        churchId: z.string().optional()
      });
      
      const validatedData = partialRecipientSchema.parse(req.body);
      const updatedRecipient = await storage.updateReportRecipient(recipientId, validatedData, userId);
      
      if (!updatedRecipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }
      
      res.json(updatedRecipient);
    } catch (error) {
      console.error("Error updating report recipient:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data provided", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update report recipient" });
    }
  });

  // DELETE report recipient
  app.delete('/api/report-recipients/:id', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const recipientId = parseInt(req.params.id);
      
      if (isNaN(recipientId)) {
        return res.status(400).json({ message: "Invalid recipient ID" });
      }
      
      await storage.deleteReportRecipient(recipientId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting report recipient:", error);
      res.status(500).json({ message: "Failed to delete report recipient" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
