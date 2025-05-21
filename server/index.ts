import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve the logos directory for uploaded church logos
app.use('/logos', express.static(path.join(process.cwd(), 'public/logos')));
console.log(`Serving logos from: ${path.join(process.cwd(), 'public/logos')}`);

// Serve the avatars directory for profile pictures
app.use('/avatars', express.static(path.join(process.cwd(), 'public/avatars')));
console.log(`Serving avatars from: ${path.join(process.cwd(), 'public/avatars')}`);

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
      // Get the base URL - use the exact production domain for emails to work properly
      // The domain must be plate-sync-jspivey.replit.app for logos to appear in emails
      const baseUrl = 'https://plate-sync-jspivey.replit.app';
      
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
