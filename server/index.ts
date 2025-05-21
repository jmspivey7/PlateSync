import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve the logos directory for uploaded church logos with proper permissions
const logosDir = path.join(process.cwd(), 'public/logos');

// Set permissions and verify writability for logos directory
try {
  // Create the logos directory if it doesn't exist
  if (!fs.existsSync(logosDir)) {
    fs.mkdirSync(logosDir, { recursive: true, mode: 0o777 });
    console.log(`Created logos directory: ${logosDir}`);
  }
  
  // Set permissions on the logos directory
  fs.chmodSync(logosDir, 0o777);
  console.log(`Set permissions on logos directory: ${logosDir}`);
  
  // Test write permissions by creating a test file
  const testFile = path.join(logosDir, 'test-write-permissions.txt');
  fs.writeFileSync(testFile, 'Write permissions confirmed!');
  console.log(`Successfully wrote test file to: ${testFile}`);
} catch (error) {
  console.error(`❌ Error setting up logos directory: ${error}`);
}

// Serve logo files with proper cache headers and public access
app.use('/logos', express.static(logosDir, {
  maxAge: '1d',           // Cache for 1 day
  etag: true,             // Enable ETag for caching
  lastModified: true,     // Send Last-Modified header
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
console.log(`Serving logos from: ${logosDir}`);

// Set up avatars directory with proper permissions
const avatarsDir = path.join(process.cwd(), 'public/avatars');
try {
  // Create the avatars directory if it doesn't exist
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true, mode: 0o777 });
    console.log(`Created avatars directory: ${avatarsDir}`);
  }
  
  // Set permissions on the avatars directory
  fs.chmodSync(avatarsDir, 0o777);
  console.log(`Set permissions on avatars directory: ${avatarsDir}`);
  
  // Test write permissions by creating a test file
  const testFile = path.join(avatarsDir, 'test-write-permissions.txt');
  fs.writeFileSync(testFile, `Write permissions confirmed for: ${avatarsDir}`);
  console.log(`Successfully wrote test file to: ${testFile}`);
} catch (error) {
  console.error(`❌ Error setting up avatars directory: ${error}`);
}

// Serve the avatars directory for profile pictures
app.use('/avatars', express.static(avatarsDir, {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));
console.log(`Serving avatars from: ${avatarsDir}`);

// Serve specific directories with custom configurations
const assetsDir = path.join(process.cwd(), 'public/assets');
app.use('/assets', express.static(assetsDir, { maxAge: '7d' }));
console.log(`Serving application assets from: ${assetsDir}`);

const emailTemplatesDir = path.join(process.cwd(), 'public/email-templates');
app.use('/email-templates', express.static(emailTemplatesDir));
console.log(`Serving email template assets from: ${emailTemplatesDir}`);

const imagesDir = path.join(process.cwd(), 'public/images');
app.use('/images', express.static(imagesDir, { maxAge: '7d' }));
console.log(`Serving images from: ${imagesDir}`);

// Serve the entire public directory for direct access to all assets
app.use(express.static(path.join(process.cwd(), 'public')));
console.log(`Serving all static files from: ${path.join(process.cwd(), 'public')}`);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Import the logo URL fix migration
import { fixLogoUrls } from './migrations/fix-logo-urls';

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Run database migrations after server starts
    try {
      // CRITICAL: NEVER use Replit domain URLs for emails - they will not work!
      // Use S3 bucket URLs directly instead
      const baseUrl = process.env.AWS_S3_BUCKET ? 
        `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com` : 
        '';
      
      console.log(`🚀 Running database migrations with base URL: ${baseUrl}`);
      
      // Fix church logo URLs in the database (run async)
      fixLogoUrls(baseUrl).then(result => {
        console.log(`✅ Logo URL migration results: Fixed ${result.usersFixed} user records and ${result.churchesFixed} church records`);
      }).catch(error => {
        console.error('❌ Error running logo URL migration:', error);
      });
    } catch (error) {
      console.error('Error initializing migrations:', error);
    }
  });
})();
