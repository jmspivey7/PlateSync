import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer, Server } from 'http';
import session from 'express-session';
import pgConnect from 'connect-pg-simple';
import multer from 'multer';
import { storage } from './storage';
import crypto from 'crypto';
import util from 'util';
import { sendWelcomeEmail, sendPasswordResetEmail } from './sendgrid';

const scrypt = util.promisify(crypto.scrypt);
const PgSession = pgConnect(session);

// Set up session
declare module 'express-session' {
  interface SessionData {
    user?: {
      userId: string;
      churchId?: string;
      role?: string;
      isAccountOwner?: boolean;
    };
  }
}

// Auth middleware
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Password hashing function
async function scryptHash(password: string): Promise<string> {
  const salt = 'platesync-salt-value';
  const buffer = await scrypt(password, salt, 32) as Buffer;
  return buffer.toString('hex');
}

// Password verification
async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  const newHash = await scryptHash(password);
  return newHash === hashedPassword;
}

function setupSessionMiddleware(app: Express) {
  app.use(session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'sessions',
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'dev-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  }));
}

// Initialize system email templates (if needed)
async function initializeSystemTemplates() {
  try {
    console.log('Checking if system templates need to be initialized...');
    const systemChurchId = 'SYSTEM_TEMPLATES';
    
    // Check if templates exist
    const templates = await storage.getEmailTemplates(systemChurchId);
    
    if (templates.length === 0) {
      console.log('No system templates found. Creating default templates...');
      
      // Create welcome email template
      await storage.createEmailTemplate({
        templateType: 'WELCOME_EMAIL',
        subject: 'Welcome to PlateSync',
        bodyText: `Dear {{firstName}} {{lastName}},\n\nWelcome to PlateSync! We're excited to have you join {{churchName}}.\n\nTo complete your account setup, please verify your email and create a password by clicking on the link below:\n{{verificationUrl}}?token={{verificationToken}}\n\nThis link will expire in 48 hours for security reasons.\n\nOnce verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.\n\nIf you did not request this account, you can safely ignore this email.\n\nSincerely,\nThe PlateSync Team`,
        bodyHtml: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Welcome to PlateSync</title><style>body{font-family:Arial,sans-serif;line-height:1.6;color:#333}a.button{display:inline-block;background-color:#4CAF50;color:white!important;padding:10px 20px;text-decoration:none;border-radius:5px}</style></head><body><div style="max-width:600px;margin:0 auto;padding:20px"><div style="text-align:center;padding:20px"><h1>Welcome to PlateSync!</h1></div><div><p>Dear {{firstName}} {{lastName}},</p><p>Welcome to PlateSync! We're excited to have you join {{churchName}}.</p><p>To complete your account setup, please verify your email and create a password:</p><p style="text-align:center"><a href="{{verificationUrl}}?token={{verificationToken}}" class="button">Verify Email & Set Password</a></p><p>This link will expire in 48 hours for security reasons.</p><p>Sincerely,<br>The PlateSync Team</p></div></div></body></html>`,
        churchId: systemChurchId
      });
      
      console.log('Default system templates created successfully');
    } else {
      console.log(`Found ${templates.length} existing system templates`);
    }
  } catch (error) {
    console.error('Error initializing system templates:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  setupSessionMiddleware(app);
  
  // Set up file uploads
  const upload = multer({
    dest: 'uploads/',
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    }
  });
  
  // Initialize system templates on startup
  await initializeSystemTemplates();
  
  // System Email Template Routes (for Global Admin)
  app.post('/api/email-templates/initialize-system', async (req: Request, res: Response) => {
    try {
      // Call our initialization function
      await initializeSystemTemplates();
      
      res.json({ success: true, message: 'System templates initialized' });
    } catch (error) {
      console.error('Error initializing system templates via API:', error);
      res.status(500).json({ error: 'Failed to initialize system templates' });
    }
  });

  app.get('/api/email-templates/system', async (req: Request, res: Response) => {
    try {
      const templates = await storage.getEmailTemplates('SYSTEM_TEMPLATES');
      res.json(templates);
    } catch (error) {
      console.error('Error fetching system templates:', error);
      res.status(500).json({ error: 'Failed to fetch system templates' });
    }
  });
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  return httpServer;
}