import express from 'express';
import { avatarUpload } from '../middleware/fileUpload';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper function to verify global admin tokens
const verifyToken = (token: string): string | null => {
  try {
    if (!process.env.SESSION_SECRET) {
      throw new Error('SESSION_SECRET not set');
    }
    
    const decoded = jwt.verify(token, process.env.SESSION_SECRET) as { id: string };
    return decoded.id;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};

// Get global admin profile
router.get('/profile', async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const userId = verifyToken(token);
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't send password or other sensitive data
    const { password, ...userData } = user;
    
    res.status(200).json(userData);
  } catch (error) {
    console.error('Error getting global admin profile:', error);
    res.status(500).json({ message: 'Failed to get profile' });
  }
});

// Upload avatar
router.post('/profile/avatar', avatarUpload.single('avatar'), async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const token = authHeader.split(' ')[1];
    const userId = verifyToken(token);
    
    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get old profile image to delete later
    const oldProfileImageUrl = user.profileImageUrl;
    
    // Get the file path relative to the public directory
    const relativePath = `/avatars/${req.file.filename}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${relativePath}`;
    
    // Update user profile with new avatar URL
    await db
      .update(users)
      .set({ 
        profileImageUrl: relativePath, // Store the relative path
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
    
    // Delete old profile image if exists
    if (oldProfileImageUrl) {
      try {
        const oldFilePath = path.join(process.cwd(), 'public', oldProfileImageUrl);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      } catch (error) {
        console.error('Error deleting old profile image:', error);
        // Continue even if deletion fails
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      profileImageUrl: relativePath
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ message: 'Failed to upload avatar' });
  }
});

export default router;