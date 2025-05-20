import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { syncChurchInfoToMembers } from '../storage';
import { isAuthenticated } from '../middleware/auth';

const router = express.Router();

// Configure logo upload directory
const logosDir = path.resolve(process.cwd(), 'public/logos');

// Create directory if it doesn't exist
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
  console.log(`Created logos directory at: ${logosDir}`);
}

// Configure storage for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, logosDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `church-logo-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Configure multer
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

// Upload church logo endpoint
router.post('/logo', isAuthenticated, (req: any, res) => {
  // Use multer to handle the file upload
  const logoUpload = upload.single('logo');
  
  logoUpload(req, res, async (err) => {
    if (err) {
      console.error('Logo upload error:', err);
      return res.status(400).json({
        message: err.message || 'Error uploading logo'
      });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      console.error('No logo file in request');
      return res.status(400).json({
        message: 'No logo file uploaded'
      });
    }
    
    try {
      // Get user ID from session
      const userId = req.user.id || (req.user.claims && req.user.claims.sub);
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found in session' });
      }
      
      console.log(`Processing logo upload for user ${userId}`, {
        filename: req.file.filename,
        path: req.file.path
      });
      
      // Get user from database
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get church ID - either the user's own ID or their churchId
      const churchId = user.churchId || userId;
      
      // Create the full absolute URL for the uploaded logo (for email templates)
      const baseUrl = req.protocol + '://' + req.get('host');
      const logoUrl = `${baseUrl}/logos/${req.file.filename}`;
      console.log(`Setting logo URL: ${logoUrl} for church ${churchId}`);
      
      // Update the user's record first (always update the user who uploaded)
      await db
        .update(users)
        .set({ 
          churchLogoUrl: logoUrl,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
        
      // Use our synchronization function to update all users in this church
      const syncResult = await syncChurchInfoToMembers(db, churchId);
      console.log(`Church logo synchronization result: ${syncResult ? 'Success' : 'Failed'}`);
      
      // Return success
      res.status(200).json({
        message: 'Logo uploaded successfully',
        logoUrl: logoUrl
      });
    } catch (error) {
      console.error('Logo processing error:', error);
      res.status(500).json({
        message: 'Server error while processing logo upload',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
});

// Delete church logo endpoint
router.delete('/logo', isAuthenticated, async (req: any, res) => {
  try {
    // Get user ID from session
    const userId = req.user.id || (req.user.claims && req.user.claims.sub);
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in session' });
    }
    
    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get church ID - either the user's own ID or their churchId
    const churchId = user.churchId || userId;
    
    // Get current logo URL
    const currentLogoUrl = user.churchLogoUrl;
    
    if (!currentLogoUrl) {
      return res.status(404).json({ message: 'No logo found to delete' });
    }
    
    console.log(`Removing logo ${currentLogoUrl} for church ${churchId}`);
    
    // Try to delete the physical file if it exists
    try {
      // Extract filename from URL and build full path
      const filename = currentLogoUrl.split('/').pop();
      if (filename) {
        const filePath = path.join(logosDir, filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted logo file: ${filePath}`);
        }
      }
    } catch (fileError) {
      console.error('Error deleting logo file:', fileError);
      // Continue anyway - we'll still update the database records
    }
    
    // Update all users with this churchId to clear the logo URL
    await db
      .update(users)
      .set({ 
        churchLogoUrl: null,
        updatedAt: new Date()
      })
      .where(eq(users.churchId, churchId));
    
    // Also update church owner/admin if they happen to not have their own churchId
    await db
      .update(users)
      .set({ 
        churchLogoUrl: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, churchId));
    
    res.status(200).json({ 
      message: 'Logo removed successfully'
    });
  } catch (error) {
    console.error('Error removing logo:', error);
    res.status(500).json({
      message: 'Server error while removing logo',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Fix church logo URLs - updates relative URLs to absolute URLs
router.post('/fix-logo-urls', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.id || (req.user.claims && req.user.claims.sub);
    if (!userId) {
      return res.status(401).json({ message: 'User ID not found in session' });
    }
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get church ID - either the user's own ID or their churchId
    const churchId = user.churchId || userId;
    
    // Get the base URL for constructing absolute URLs
    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Find all users in this church who have a logo URL that starts with /logos/
    const usersWithRelativeLogos = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.churchId, churchId),
          sql`${users.churchLogoUrl} IS NOT NULL`,
          sql`${users.churchLogoUrl} LIKE '/logos/%'`
        )
      );
    
    // Also check the church owner
    const [churchOwner] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.id, churchId),
          sql`${users.churchLogoUrl} IS NOT NULL`,
          sql`${users.churchLogoUrl} LIKE '/logos/%'`
        )
      );
    
    // Add the church owner to the list if they have a relative logo URL
    if (churchOwner && !usersWithRelativeLogos.some(u => u.id === churchOwner.id)) {
      usersWithRelativeLogos.push(churchOwner);
    }
    
    // Process found users
    const updatedUsers = [];
    
    if (usersWithRelativeLogos.length > 0) {
      console.log(`Found ${usersWithRelativeLogos.length} users with relative logo URLs`);
      
      // Update each user's logo URL to an absolute URL
      for (const userToUpdate of usersWithRelativeLogos) {
        if (userToUpdate.churchLogoUrl && userToUpdate.churchLogoUrl.startsWith('/logos/')) {
          const absoluteLogoUrl = `${baseUrl}${userToUpdate.churchLogoUrl}`;
          
          // Update the user record
          await db
            .update(users)
            .set({ 
              churchLogoUrl: absoluteLogoUrl,
              updatedAt: new Date()
            })
            .where(eq(users.id, userToUpdate.id));
          
          console.log(`Updated logo URL for user ${userToUpdate.id}:`);
          console.log(`  - From: ${userToUpdate.churchLogoUrl}`);
          console.log(`  - To: ${absoluteLogoUrl}`);
          
          updatedUsers.push({
            id: userToUpdate.id,
            oldUrl: userToUpdate.churchLogoUrl,
            newUrl: absoluteLogoUrl
          });
        }
      }
      
      // Also update any churches directly
      await db
        .update(churches)
        .set({ 
          logoUrl: sql`${baseUrl} || ${churches.logoUrl}`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(churches.id, churchId),
            sql`${churches.logoUrl} IS NOT NULL`,
            sql`${churches.logoUrl} LIKE '/logos/%'`
          )
        );
      
      return res.json({
        success: true,
        message: `Updated ${updatedUsers.length} logo URLs to absolute format`,
        updatedUsers
      });
    } else {
      return res.json({
        success: true,
        message: 'No relative logo URLs found that need updating'
      });
    }
  } catch (error) {
    console.error('Error fixing logo URLs:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fixing logo URLs',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;