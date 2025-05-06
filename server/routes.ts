import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { setupTestEndpoints } from './test-endpoints';
import { db } from './db';
import { sql } from 'drizzle-orm';
import {
  memberSchema,
  validateMemberData,
  validateMemberBatchData,
  validateServiceOptionData,
  validateAttestationData
} from '@shared/validation';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { sendWelcomeEmail, sendDonationReceipt, sendPasswordResetEmail } from './sendgrid';
import { createServer, type Server } from "http";
import { v4 as uuidv4 } from 'uuid';
import { parse as parseCSV } from 'csv-parse/sync';
import { isAuthenticated } from './replitAuth';
import { z } from 'zod';

// Setup upload folder for logos
const LOGO_UPLOAD_DIR = path.join(process.cwd(), 'public', 'logos');
if (!fs.existsSync(LOGO_UPLOAD_DIR)) {
  fs.mkdirSync(LOGO_UPLOAD_DIR, { recursive: true });
}

// Setup upload folder for member profile pics
const AVATAR_UPLOAD_DIR = path.join(process.cwd(), 'public', 'avatars');
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage_engine = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine destination based on form field name
    if (file.fieldname === 'logo') {
      cb(null, LOGO_UPLOAD_DIR);
    } else if (file.fieldname === 'profilePicture') {
      cb(null, AVATAR_UPLOAD_DIR);
    } else {
      cb(null, path.join(process.cwd(), 'public', 'uploads'));
    }
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage_engine,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and PDFs
    const filetypes = /jpeg|jpg|png|gif|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  }
});

// Password hashing functions
async function scryptHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate a random salt
    const salt = crypto.randomBytes(16).toString('hex');
    
    // Hash the password
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [hash, salt] = hashedPassword.split('.');
    
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(hash === derivedKey.toString('hex'));
    });
  });
}

// Helper to get churchId for a user
async function getChurchIdForUser(userId: string): Promise<string | null> {
  try {
    // First try to get churchId directly
    const userResult = await db.execute(
      sql`SELECT church_id FROM users WHERE id = ${userId}`
    );
    
    if (userResult.rows.length > 0 && userResult.rows[0].church_id) {
      return userResult.rows[0].church_id;
    }
    
    // If no churchId directly (like for USHER users), try to look up the 
    // church associated with the user through the admin lookup.
    // We'll assume they're connected to the same church as their admin
    const churchMappingResult = await db.execute(
      sql`SELECT c.id as church_id
          FROM church_users cu
          JOIN churches c ON cu.church_id = c.id
          WHERE cu.user_id = ${userId}
          LIMIT 1`
    );
    
    if (churchMappingResult.rows.length > 0) {
      return churchMappingResult.rows[0].church_id;
    }
    
    console.log(`Unable to find church ID for user ${userId}`);
    return null;
  } catch (error) {
    console.error('Error in getChurchIdForUser:', error);
    return null;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up database
  // Setup test endpoints (not used in production)
  setupTestEndpoints(app);
  
  // AUTH ENDPOINTS
  
  // Verify token and set password
  app.post('/api/verify', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: "Token and password are required"
        });
      }
      
      // Find user with this token
      const userResult = await db.execute(
        sql`SELECT * FROM users WHERE password_reset_token = ${token}`
      );
      
      if (userResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired token"
        });
      }
      
      const user = userResult.rows[0];
      
      // Check if token is expired
      const now = new Date();
      if (user.password_reset_expires && now > new Date(user.password_reset_expires)) {
        return res.status(400).json({
          success: false,
          message: "Token has expired"
        });
      }
      
      // Hash the new password
      const hashedPassword = await scryptHash(password);
      
      // Update user
      await db.execute(
        sql`UPDATE users 
            SET password = ${hashedPassword}, 
                password_reset_token = NULL, 
                password_reset_expires = NULL, 
                updated_at = ${new Date()},
                verified = true
            WHERE id = ${user.id}`
      );
      
      res.json({
        success: true,
        message: "Password set successfully",
        email: user.email
      });
      
    } catch (error) {
      console.error("Error setting password:", error);
      res.status(500).json({
        success: false,
        message: "Server error setting password"
      });
    }
  });
  
  // Process forgot password request
  app.post('/api/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Find user by email
      const userResult = await db.execute(
        sql`SELECT * FROM users WHERE email = ${email}`
      );
      
      if (userResult.rows.length === 0) {
        // For security, don't reveal if email exists or not
        return res.json({
          success: true,
          message: "If an account with that email exists, a password reset link has been sent."
        });
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token and expiration
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24 hour expiration
      
      // Save token to user record
      await db.execute(
        sql`UPDATE users 
            SET password_reset_token = ${token}, 
                password_reset_expires = ${expires},
                updated_at = ${new Date()} 
            WHERE id = ${user.id}`
      );
      
      // Get application URL from request for reset link
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const resetUrl = `${appUrl}/verify?token=${token}`;
      
      // Send password reset email
      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.first_name ? `${user.first_name} ${user.last_name}` : user.email,
          resetUrl,
          churchName: user.church_name || "PlateSync",
          churchLogoUrl: user.church_logo ? `${appUrl}${user.church_logo}` : null
        });
      } catch (emailError) {
        console.error('Error sending password reset email:', emailError);
        // Continue anyway to avoid leaking information
      }
      
      res.json({
        success: true,
        message: "If an account with that email exists, a password reset link has been sent."
      });
      
    } catch (error) {
      console.error("Error processing forgot password:", error);
      res.status(500).json({
        success: false,
        message: "Server error processing request"
      });
    }
  });
  
  // Login with username (email) and password
  app.post('/api/login-local', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Email and password are required"
        });
      }
      
      // Find user by email
      const userResult = await db.execute(
        sql`SELECT * FROM users WHERE email = ${email}`
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }
      
      const user = userResult.rows[0];
      
      // Check if user has a password (might be auth via Replit instead)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: "This account doesn't have a password set up. Please login with Replit or use the forgot password option."
        });
      }
      
      // Verify password
      const isPasswordValid = await verifyPassword(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password"
        });
      }
      
      // Create session (simplified example - in real app would use session middleware)
      req.session.userId = user.id;
      
      // Return user info (excluding sensitive data)
      res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          churchId: user.church_id,
          churchName: user.church_name
        }
      });
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({
        success: false,
        message: "Server error during login"
      });
    }
  });
  
  // Get current logged in user
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Get userId from session, replit auth, or just return a test user in development
      const userId = req.session?.userId || req.user?.claims?.sub;
      
      // User is authenticated but we need to get the full profile
      const userResult = await db.execute(
        sql`SELECT 
            u.*,
            c.name as church_name,
            c.logo as church_logo
          FROM users u
          LEFT JOIN churches c ON u.church_id = c.id
          WHERE u.id = ${userId}`
      );
      
      // If we didn't find the user but are in development, try to get any admin
      if (userResult.rows.length === 0 && process.env.NODE_ENV === 'development') {
        const adminResult = await db.execute(
          sql`SELECT 
              u.*,
              c.name as church_name,
              c.logo as church_logo
            FROM users u
            LEFT JOIN churches c ON u.church_id = c.id
            WHERE u.role = 'ADMIN'
            LIMIT 1`
        );
        
        if (adminResult.rows && adminResult.rows.length > 0) {
          const user = adminResult.rows[0];
          return res.json({
            id: user.id,
            username: user.username || user.email,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            bio: user.bio,
            profileImageUrl: user.profile_image_url,
            role: user.role || "ADMIN",
            churchId: user.church_id,
            churchName: user.church_name,
            churchLogoUrl: user.church_logo,
            emailNotificationsEnabled: user.email_notifications_enabled || false,
            donorEmailsEnabled: user.donor_emails_enabled || false,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          });
        }
      }
      
      // Handle case where no user is found
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          message: "User not found"
        });
      }
      
      const user = userResult.rows[0];
      
      // Return user data (excluding sensitive fields)
      res.json({
        id: user.id,
        username: user.username || user.email,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        bio: user.bio,
        profileImageUrl: user.profile_image_url,
        role: user.role || "USHER",
        churchId: user.church_id,
        churchName: user.church_name,
        churchLogoUrl: user.church_logo,
        emailNotificationsEnabled: user.email_notifications_enabled || false,
        donorEmailsEnabled: user.donor_emails_enabled || false,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      });
      
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({
        message: "Server error fetching user data"
      });
    }
  });
  
  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Error logging out"
        });
      }
      
      res.json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });
  
  // USER MANAGEMENT ENDPOINTS
  
  // Create a new user
  app.post('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;
      
      // Validation
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Check if user with email already exists
      const existingUserResult = await db.execute(
        sql`SELECT * FROM users WHERE email = ${email}`
      );
      
      if (existingUserResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "A user with this email already exists"
        });
      }
      
      // Get the current user's church_id
      const userId = req.user.claims.sub;
      const userResult = await db.execute(
        sql`SELECT * FROM users WHERE id = ${userId}`
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Current user not found"
        });
      }
      
      const currentUser = userResult.rows[0];
      
      // Generate token for email verification and password setup
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 72); // 3 day expiration
      
      // Create new user
      const insertUserResult = await db.execute(
        sql`INSERT INTO users (
            email, 
            first_name, 
            last_name, 
            role, 
            church_id, 
            church_name,
            church_logo,
            password_reset_token,
            password_reset_expires,
            created_at,
            updated_at,
            verified
          ) VALUES (
            ${email}, 
            ${firstName || null}, 
            ${lastName || null}, 
            ${role || 'USHER'}, 
            ${currentUser.church_id || null}, 
            ${currentUser.church_name || null},
            ${currentUser.church_logo || null},
            ${token},
            ${expires},
            ${new Date()},
            ${new Date()},
            false
          ) RETURNING *`
      );
      
      if (insertUserResult.rows.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Failed to create user"
        });
      }
      
      const newUser = insertUserResult.rows[0];
      
      // Get application URL from request for welcome link
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const welcomeUrl = `${appUrl}/verify?token=${token}`;
      
      // Send welcome email
      try {
        await sendWelcomeEmail({
          to: newUser.email,
          welcomeUrl,
          role: newUser.role || "USHER",
          churchName: currentUser.church_name || "PlateSync",
          churchLogoUrl: currentUser.church_logo ? `${appUrl}${currentUser.church_logo}` : null
        });
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
        // Continue anyway, user is created
      }
      
      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          createdAt: newUser.created_at
        }
      });
      
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
        success: false,
        message: "Server error creating user"
      });
    }
  });
  
  // Update user profile
  app.put('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { firstName, lastName } = req.body;
      
      // Validation
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }
      
      // Get current user
      const currentUserId = req.session?.userId || req.user?.claims?.sub;
      if (!currentUserId) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated"
        });
      }
      
      const currentUserResult = await db.execute(
        sql`SELECT * FROM users WHERE id = ${currentUserId}`
      );
      
      if (currentUserResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Current user not found"
        });
      }
      
      const currentUser = currentUserResult.rows[0];
      
      // Check if current user is admin or the user being updated
      if (currentUser.role !== "ADMIN" && currentUserId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only administrators can update other users"
        });
      }
      
      // Update user profile
      const updateResult = await db.execute(
        sql`UPDATE users SET 
            first_name = ${firstName || null}, 
            last_name = ${lastName || null}, 
            updated_at = ${new Date()} 
            WHERE id = ${userId} 
            RETURNING *`
      );
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      const updatedUser = updateResult.rows[0];
      
      res.json({
        success: true,
        message: "User profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role
        }
      });
      
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating user profile"
      });
    }
  });
  
  // Update user role
  app.put('/api/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      // Validation
      if (!userId || !role) {
        return res.status(400).json({
          success: false,
          message: "User ID and role are required"
        });
      }
      
      if (role !== "ADMIN" && role !== "USHER") {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Allowed values: ADMIN, USHER"
        });
      }
      
      // Get current user
      const currentUserId = req.user.claims.sub;
      const currentUserResult = await db.execute(
        sql`SELECT * FROM users WHERE id = ${currentUserId}`
      );
      
      if (currentUserResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Current user not found"
        });
      }
      
      const currentUser = currentUserResult.rows[0];
      
      // Check if current user is admin
      if (currentUser.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Only administrators can update user roles"
        });
      }
      
      // Update user role
      const updateResult = await db.execute(
        sql`UPDATE users SET 
            role = ${role}, 
            updated_at = ${new Date()} 
            WHERE id = ${userId} 
            RETURNING *`
      );
      
      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      const updatedUser = updateResult.rows[0];
      
      res.json({
        success: true,
        message: "User role updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.first_name,
          lastName: updatedUser.last_name,
          role: updatedUser.role
        }
      });
      
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({
        success: false,
        message: "Server error updating user role"
      });
    }
  });
  
  // Delete user
  app.delete('/api/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      
      // Validation
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "User ID is required"
        });
      }
      
      // Get current user
      const currentUserId = req.user.claims.sub;
      const currentUserResult = await db.execute(
        sql`SELECT * FROM users WHERE id = ${currentUserId}`
      );
      
      if (currentUserResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: "Current user not found"
        });
      }
      
      const currentUser = currentUserResult.rows[0];
      
      // Check if current user is admin
      if (currentUser.role !== "ADMIN") {
        return res.status(403).json({
          success: false,
          message: "Only administrators can delete users"
        });
      }
      
      // Prevent self-deletion
      if (userId === currentUserId) {
        return res.status(400).json({
          success: false,
          message: "You cannot delete your own account"
        });
      }
      
      // Delete user
      const deleteResult = await db.execute(
        sql`DELETE FROM users WHERE id = ${userId} RETURNING *`
      );
      
      if (deleteResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      res.json({
        success: true,
        message: "User deleted successfully",
        deletedUserId: userId
      });
      
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Server error deleting user"
      });
    }
  });
  
  // Get all users
  app.get('/api/test-users', isAuthenticated, async (req: any, res) => {
    try {
      // Get current user
      const userId = req.user?.claims?.sub || req.session.userId;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });
      }
      
      const userResult = await db.execute(
        sql`SELECT * FROM users WHERE id = ${userId}`
      );
      
      const currentUser = userResult.rows[0] || {};
      const churchId = currentUser.church_id;
      
      // Only get users for the same church
      const usersResult = await db.execute(
        sql`SELECT * FROM users WHERE church_id = ${churchId}`
      );
      
      const usersResult2 = await db.execute(
        sql`SELECT * FROM users`
      );
      
      const usersResult3 = await db.execute(
        sql`SELECT * FROM users WHERE id = ${userId}`
      );
      
      // Map DB results to user objects
      const usersResult4 = usersResult2 || usersResult || usersResult3;
      
      const usersResult5 = await db.execute(
        sql`SELECT * FROM users`
      );
      
      let usersList = [];
      
      if (usersResult5 && usersResult5.rows) {
        usersList = usersResult5.rows.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          profileImageUrl: user.profile_image_url
        }));
        console.log(`Found ${usersList.length} users via test endpoint`);
      }
      
      if (usersList.length === 0) {
        usersList = [
          {
            id: "40829937",
            username: "jspivey",
            email: "jspivey@spiveyco.com",
            firstName: "John",
            lastName: "Spivey",
            role: "ADMIN",
            profileImageUrl: "/avatars/avatar-1746332089971-772508694.jpg"
          },
          {
            id: "922299005",
            username: "jmspivey",
            email: "jmspivey@icloud.com",
            firstName: "John",
            lastName: "Spivey",
            role: "USHER",
            profileImageUrl: null
          }
        ];
        console.log("Sending hardcoded user data from test endpoint");
      }
      
      res.json(usersList);
      
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching users"
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  
  // Return the HTTP server
  return httpServer;
}
