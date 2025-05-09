import { Express } from "express";
import axios from "axios";
import { storage } from "./storage";
import session from "express-session";
import { refreshPlanningCenterToken } from "./planning-center";

// Define session interface extension for passport
declare module "express-session" {
  interface SessionData {
    planningCenterChurchId?: string;
    passport?: {
      user: string;
    };
  }
}

// Environment variables will be needed for actual implementation
// Planning Center OAuth credentials (to be moved to environment variables)
const PLANNING_CENTER_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID || "";
const PLANNING_CENTER_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET || "";

// API base URLs - Using api.planningcenteronline.com as per official docs
const PC_OAUTH_BASE_URL = "https://api.planningcenteronline.com/oauth";
const PC_PEOPLE_API_URL = "https://api.planningcenteronline.com/people/v2";

// Type definitions for tokens
interface PlanningCenterTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  created_at: number;
  token_type: string;
  scope: string;
}

interface PlanningCenterCredentials {
  userId: string;
  churchId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Setup Planning Center OAuth routes
export function setupPlanningCenterAuth(app: Express) {
  // Initiate OAuth flow - redirect user to Planning Center for authorization
  app.get("/api/planning-center/auth", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to connect Planning Center" });
    }

    // Ensure the user has admin permissions
    const user: any = req.user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only administrators can connect to Planning Center" });
    }

    // Store the church ID in the session for use in callback
    if (!req.session) {
      return res.status(500).json({ message: "Session management error" });
    }
    
    req.session.planningCenterChurchId = user.churchId;

    // Redirect to Planning Center OAuth authorization
    const redirectUri = `${req.protocol}://${req.get("host")}/api/planning-center/callback`;
    const authUrl = `${PC_OAUTH_BASE_URL}/authorize?client_id=${PLANNING_CENTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=people`;
    
    res.redirect(authUrl);
  });

  // OAuth callback route - Planning Center redirects here after authorization
  app.get("/api/planning-center/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = `${req.protocol}://${req.get("host")}/api/planning-center/callback`;
    
    if (!code) {
      return res.status(400).json({ message: "Authorization code missing" });
    }

    if (!req.session || !req.session.planningCenterChurchId) {
      return res.status(400).json({ message: "Session data missing, please try again" });
    }

    try {
      // Exchange code for access token using URLSearchParams
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code as string);
      params.append('client_id', PLANNING_CENTER_CLIENT_ID);
      params.append('client_secret', PLANNING_CENTER_CLIENT_SECRET);
      params.append('redirect_uri', redirectUri);
      
      console.log("Planning Center token exchange params:", {
        grant_type: 'authorization_code',
        code: code,
        client_id: PLANNING_CENTER_CLIENT_ID,
        redirect_uri: redirectUri
      });
      
      const tokenResponse = await axios.post(`${PC_OAUTH_BASE_URL}/token`, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      const tokens: PlanningCenterTokens = tokenResponse.data;
      
      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokens.expires_in);

      // Store tokens in your database
      // Get the user ID from the session if available
      let userId;
      if (req.session && typeof req.session === 'object' && 'passport' in req.session) {
        // Safely access passport.user
        userId = (req.session as any).passport?.user;
      }
      
      if (!userId || !req.session.planningCenterChurchId) {
        throw new Error("Missing user ID or church ID in session");
      }
      
      await storage.savePlanningCenterTokens({
        userId,
        churchId: req.session.planningCenterChurchId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt
      });

      // Clear session data
      delete req.session.planningCenterChurchId;

      // Redirect to settings page with success message
      res.redirect("/settings?planningCenterConnected=true");
    } catch (error) {
      console.error("Planning Center token exchange error:", error);
      res.redirect("/settings?planningCenterError=true");
    }
  });

  // Endpoint to fetch members from Planning Center
  app.get("/api/planning-center/members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user: any = req.user;
    
    try {
      // Get stored credentials for this church
      const credentials = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
      if (!credentials) {
        return res.status(404).json({ message: "Planning Center not connected" });
      }

      // Check if token is expired and refresh if needed
      if (new Date() >= credentials.expiresAt) {
        await refreshPlanningCenterToken(credentials, user.id, user.churchId);
      }

      // Fetch members from Planning Center
      const membersResponse = await axios.get(`${PC_PEOPLE_API_URL}/people`, {
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`
        }
      });

      res.json(membersResponse.data);
    } catch (error) {
      console.error("Error fetching Planning Center members:", error);
      res.status(500).json({ message: "Failed to fetch members from Planning Center" });
    }
  });

  // Endpoint to import members from Planning Center
  app.post("/api/planning-center/import-members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user: any = req.user;
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only administrators can import members" });
    }
    
    try {
      // Implementation for importing members would go here
      // This would involve:
      // 1. Fetching members from Planning Center
      // 2. Processing them into our format
      // 3. Saving them to our database

      res.json({ message: "Member import initiated" });
    } catch (error) {
      console.error("Error importing Planning Center members:", error);
      res.status(500).json({ message: "Failed to import members" });
    }
  });
}