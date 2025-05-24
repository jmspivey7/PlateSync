import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the absolute path to the avatars directory
const avatarsDir = path.resolve(process.cwd(), 'public', 'avatars');

// Create the avatars directory if it doesn't exist
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
  console.log(`Created avatars directory at: ${avatarsDir}`);
}

// Check write permissions
try {
  const testFile = path.join(avatarsDir, '.write-test');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log(`Write permissions confirmed for: ${avatarsDir}`);
} catch (error) {
  console.error(`ERROR: No write permissions for ${avatarsDir}`, error);
}

// Configure storage for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    console.log(`Saving avatar to: ${avatarsDir}`);
    cb(null, avatarsDir);
  },
  filename: function(req, file, cb) {
    // Generate a unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `avatar-${uniqueSuffix}${extension}`;
    console.log(`Generated filename: ${filename}`);
    cb(null, filename);
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
    const allowedTypes = /jpeg|jpg|png|gif/i;
    
    // Check mime type
    const mimeTypeValid = allowedTypes.test(file.mimetype);
    
    // Check file extension
    const extname = path.extname(file.originalname).toLowerCase();
    const extValid = allowedTypes.test(extname);
    
    if (mimeTypeValid && extValid) {
      console.log(`Valid file type: ${file.mimetype}, extension: ${extname}`);
      return cb(null, true);
    } else {
      console.log(`Invalid file type: ${file.mimetype}, extension: ${extname}`);
      return cb(new Error('Only image files (JPG, PNG, GIF) are allowed'));
    }
  }
});