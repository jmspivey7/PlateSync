import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
// Import our direct finalized counts router
const directFinalizedCounts = require('./fix/direct-finalized-counts');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Direct database access route that completely bypasses middleware
app.get('/emergency-direct/church-40829937-finalized-batches', async (req, res) => {
  try {
    const { Pool } = require('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query(`
      SELECT id, name, date, status, total_amount as "totalAmount", church_id as "churchId", service
      FROM batches 
      WHERE church_id = '40829937' AND status = 'FINALIZED' 
      ORDER BY date DESC
    `);
    
    console.log(`Found ${result.rows.length} finalized batches for church 40829937`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error in direct query:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Register our fix routes with direct database access before any other routes
app.use(directFinalizedCounts);
app.use(require('./fix-routes'));

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
  });
})();
