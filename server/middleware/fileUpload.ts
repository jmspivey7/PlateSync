import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure avatars directory exists
const avatarsDir = path.join(process.cwd(), 'public', 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure storage for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, avatarsDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${extension}`);
  }
});

// Create multer instance for avatar uploads
export const avatarUpload = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function(req, file, cb) {
    // Accept only images
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});