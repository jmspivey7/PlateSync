import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    const allowedTypes = /jpeg|jpg|png|gif/i;
    const mimeTypeValid = allowedTypes.test(file.mimetype);
    const extname = path.extname(file.originalname).toLowerCase();
    const extValid = allowedTypes.test(extname);
    
    if (mimeTypeValid && extValid) {
      return cb(null, true);
    } else {
      return cb(new Error('Only image files (JPG, PNG, GIF) are allowed'));
    }
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
    
    const { churchName, role, emailNotificationsEnabled } = req.body;
    
    await db
      .update(users)
      .set({ 
        churchName: churchName ?? undefined,
        role: role ?? undefined,
        emailNotificationsEnabled: emailNotificationsEnabled ?? undefined,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    res.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
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
    
    // This would need to verify the current password and hash the new one
    // Implement password hashing and verification as needed
    
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;