import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { validateFileOnServer, secureLog } from '@shared/security';

const router = express.Router();

// Configure avatar upload
const avatarsDir = path.resolve(process.cwd(), 'public/avatars');

// Create directory if it doesn't exist
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log(`Created avatars directory at: ${avatarsDir}`);
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `avatar-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    secureLog.info('Avatar upload attempt', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // Use enhanced security validation
    const validation = validateFileOnServer(file);
    if (!validation.valid) {
      secureLog.warn('Avatar upload rejected', { reason: validation.error });
      return cb(new Error(validation.error), false);
    }

    secureLog.info('Avatar upload accepted');
    return cb(null, true);
  }
});

// Upload profile picture
router.post('/avatar', (req, res) => {
  // Handle file upload
  upload.single('avatar')(req, res, async (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(400).json({ success: false, message: err.message });
    }
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        console.error('No user ID found');
        return res.status(401).json({ success: false, message: 'User not authenticated' });
      }
      
      console.log(`Processing avatar upload for user: ${userId}`);
      console.log(`File saved at: ${req.file.path}`);
      
      // Get relative path for storing in database
      const relativePath = `/avatars/${req.file.filename}`;
      
      // Update user in database
      await db
        .update(users)
        .set({ 
          profileImageUrl: relativePath,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
      
      console.log(`Updated user profile with new avatar: ${relativePath}`);
      
      // Return success
      res.json({
        success: true,
        message: 'Profile picture updated successfully',
        profileImageUrl: relativePath
      });
    } catch (error) {
      console.error('Error saving profile picture:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
});

// Update profile information
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { firstName, lastName, churchName, role, emailNotificationsEnabled } = req.body;
    
    // Log update request for debugging
    console.log(`Profile update request for user ${userId}:`, {
      firstName,
      lastName,
      churchName,
      role,
      emailNotificationsEnabled
    });
    
    await db
      .update(users)
      .set({ 
        firstName: firstName ?? undefined,
        lastName: lastName ?? undefined,
        churchName: churchName ?? undefined,
        role: role ?? undefined,
        emailNotificationsEnabled: emailNotificationsEnabled ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // No need to re-fetch user data since we already have exact values from request
    console.log('Updating user profile with', { 
      firstName, 
      lastName, 
      churchName,
      role,
      emailNotificationsEnabled 
    });
    
    // Update user in session directly from the request data
    // This ensures values match exactly what user submitted
    if (req.user) {
      console.log('Current user in session before update:', { 
        firstName: req.user.firstName, 
        lastName: req.user.lastName 
      });
      
      // Only update fields that were provided in the request
      if (firstName !== undefined) req.user.firstName = firstName;
      if (lastName !== undefined) req.user.lastName = lastName;
      if (churchName !== undefined) req.user.churchName = churchName;
      if (emailNotificationsEnabled !== undefined) req.user.emailNotificationsEnabled = emailNotificationsEnabled;
      if (role !== undefined) req.user.role = role;
      
      console.log('User data in session after update:', { 
        firstName: req.user.firstName, 
        lastName: req.user.lastName 
      });
            
      // Save the session
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
            } else {
              console.log('Session saved successfully');
              resolve();
            }
          });
        });
      } catch (sessionError) {
        console.error('Error saving session:', sessionError);
      }
    }
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove profile picture
router.post('/avatar/remove', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Get current user from database to check if they have a profile image
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // If user has a profile image, remove it from filesystem
    if (user.profileImageUrl) {
      try {
        const avatarPath = path.join(process.cwd(), 'public', user.profileImageUrl);
        
        // Check if file exists before attempting to delete
        if (fs.existsSync(avatarPath)) {
          fs.unlinkSync(avatarPath);
          console.log(`Deleted avatar file: ${avatarPath}`);
        }
      } catch (fileError) {
        console.error('Error deleting avatar file:', fileError);
        // Continue even if file deletion fails
      }
    }
    
    // Update user in database to remove profile image URL
    await db
      .update(users)
      .set({ 
        profileImageUrl: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // Update the user session as well
    if (req.user && req.user.profileImageUrl) {
      req.user.profileImageUrl = null;
      
      // Save the session
      try {
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
            } else {
              console.log('Session saved successfully after removing profile picture');
              resolve();
            }
          });
        });
      } catch (sessionError) {
        console.error('Error saving session:', sessionError);
      }
    }
    
    console.log(`Removed profile picture for user: ${userId}`);
    
    res.json({ success: true, message: 'Profile picture removed successfully' });
  } catch (error) {
    console.error('Error removing profile picture:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update password
router.post('/password', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Get current user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user || !user.password) {
      return res.status(400).json({ success: false, message: 'User not found or no password set' });
    }
    
    // Verify current password
    const { verifyPassword, scryptHash } = await import('../util');
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await scryptHash(newPassword);
    
    // Update password in database
    await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    console.log(`Updated password for user: ${userId}`);
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;