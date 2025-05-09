import axios from 'axios';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';
import session from 'express-session';

// Extend Express.User interface to include properties we need
declare global {
  namespace Express {
    interface User {
      id: string;
      churchId: string;
    }
  }
}

// Extend express-session to include our custom properties
declare module 'express-session' {
  interface SessionData {
    planningCenterState?: string;
  }
}

// Planning Center OAuth constants
// Updated URLs for Planning Center OAuth
const PLANNING_CENTER_AUTH_URL = 'https://login.planningcenteronline.com/oauth/authorize';
const PLANNING_CENTER_TOKEN_URL = 'https://api.planningcenteronline.com/oauth/token';
const PLANNING_CENTER_API_BASE = 'https://api.planningcenteronline.com';

// Load credentials from environment variables
const PLANNING_CENTER_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID || '';
const PLANNING_CENTER_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET || '';

// Export the setup function to be called from routes.ts
export function setupPlanningCenterRoutes(app: Express) {
  // OAuth callback endpoint
  app.get('/api/planning-center/callback', async (req: Request, res: Response) => {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }
    
    try {
      // Verify state parameter to prevent CSRF attacks
      // State should match a value we stored in the user's session
      if (req.session && req.session.planningCenterState !== state) {
        console.log('State mismatch:', { 
          expected: req.session.planningCenterState, 
          received: state 
        });
        return res.status(403).send('Invalid state parameter');
      }
      
      // Exchange the authorization code for an access token
      const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, {
        grant_type: 'authorization_code',
        code,
        client_id: PLANNING_CENTER_CLIENT_ID,
        client_secret: PLANNING_CENTER_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/planning-center/callback`
      });
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Store the tokens in the database
      if (req.user?.id) {
        await storage.savePlanningCenterTokens({
          userId: req.user.id,
          churchId: req.user.churchId,
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
        });
      }
      
      // Redirect back to the settings page with success message
      res.redirect('/settings?planningCenterConnected=true');
    } catch (error) {
      console.error('Planning Center OAuth error:', error);
      res.redirect('/settings?planningCenterError=true');
    }
  });
  
  // Endpoint to initiate the OAuth flow
  app.get('/api/planning-center/authorize', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    // Generate and store a random state parameter to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    if (req.session) {
      req.session.planningCenterState = state;
      // Save session to ensure state is properly stored
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Redirect to Planning Center's authorization page
    const authUrl = `${PLANNING_CENTER_AUTH_URL}?client_id=${PLANNING_CENTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/planning-center/callback`)}&response_type=code&scope=people&state=${state}`;
    
    res.redirect(authUrl);
  });
  
  // Endpoint to get Planning Center people data
  app.get('/api/planning-center/people', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    try {
      const tokens = await storage.getPlanningCenterTokens(req.user.id, req.user.churchId);
      
      if (!tokens) {
        return res.status(403).send('Planning Center not connected');
      }
      
      // Check if token is expired and refresh if needed
      if (tokens.expiresAt < new Date()) {
        await refreshPlanningCenterToken(tokens, req.user.id, req.user.churchId);
      }
      
      // Make API request to get people
      const peopleResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        }
      });
      
      res.json(peopleResponse.data);
    } catch (error) {
      console.error('Error fetching Planning Center people:', error);
      res.status(500).send('Error fetching Planning Center data');
    }
  });
  
  // Endpoint to get Planning Center connection status
  app.get('/api/planning-center/status', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    try {
      const tokens = await storage.getPlanningCenterTokens(req.user.id, req.user.churchId);
      
      if (!tokens) {
        return res.status(403).json({ connected: false });
      }
      
      // Check if token is expired and refresh if needed
      if (tokens.expiresAt < new Date()) {
        await refreshPlanningCenterToken(tokens, req.user.id, req.user.churchId);
      }
      
      // Make API request to get people count
      const peopleResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        },
        params: {
          per_page: 1
        }
      });
      
      // Return connection status with people count if available
      res.json({
        connected: true,
        lastSyncDate: tokens.updatedAt?.toISOString(),
        peopleCount: peopleResponse.data.meta?.total_count || 0
      });
    } catch (error) {
      console.error('Error fetching Planning Center status:', error);
      // Still return a valid response structure, just with connected: false
      res.status(403).json({ connected: false });
    }
  });

  app.post('/api/planning-center/import', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    try {
      const tokens = await storage.getPlanningCenterTokens(req.user.id, req.user.churchId);
      
      if (!tokens) {
        return res.status(403).send('Planning Center not connected');
      }
      
      // Fetch people from Planning Center
      const peopleResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        },
        params: {
          include: 'emails,phone_numbers',
          per_page: 100
        }
      });
      
      const people = peopleResponse.data.data;
      
      // Convert Planning Center people to PlateSync members
      const members = people.map((person: any) => {
        const attributes = person.attributes;
        
        // Extract first email
        let email = null;
        if (person.included && person.included.emails && person.included.emails.length > 0) {
          email = person.included.emails[0].attributes.address;
        }
        
        // Extract first phone
        let phone = null;
        if (person.included && person.included.phone_numbers && person.included.phone_numbers.length > 0) {
          phone = person.included.phone_numbers[0].attributes.number;
        }
        
        return {
          firstName: attributes.first_name,
          lastName: attributes.last_name,
          email,
          phone,
          isVisitor: false,
          churchId: req.user.churchId,
          externalId: person.id,
          externalSystem: 'PLANNING_CENTER'
        };
      });
      
      // Import members into the database
      const importedCount = await storage.bulkImportMembers(members, req.user.churchId);
      
      // Update last sync date
      await storage.updatePlanningCenterLastSync(req.user.id, req.user.churchId);
      
      res.json({ success: true, importedCount });
    } catch (error) {
      console.error('Error importing Planning Center members:', error);
      res.status(500).send('Error importing Planning Center members');
    }
  });
  
  // Endpoint to disconnect from Planning Center
  app.post('/api/planning-center/disconnect', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    try {
      // Remove the tokens from the database
      await storage.deletePlanningCenterTokens(req.user.id, req.user.churchId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting from Planning Center:', error);
      res.status(500).send('Error disconnecting from Planning Center');
    }
  });
  
  // Check if credentials are configured
  app.use((req, res, next) => {
    if (!PLANNING_CENTER_CLIENT_ID || !PLANNING_CENTER_CLIENT_SECRET) {
      console.warn('Planning Center credentials not properly configured');
    }
    next();
  });
}

// Helper function to refresh an expired token
async function refreshPlanningCenterToken(
  tokens: { refreshToken: string },
  userId: string,
  churchId: string
) {
  try {
    const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, {
      grant_type: 'refresh_token',
      refresh_token: tokens.refreshToken,
      client_id: PLANNING_CENTER_CLIENT_ID,
      client_secret: PLANNING_CENTER_CLIENT_SECRET
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Save the new tokens
    await storage.savePlanningCenterTokens({
      userId,
      churchId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: new Date(Date.now() + expires_in * 1000),
    });
    
    return access_token;
  } catch (error) {
    console.error('Error refreshing Planning Center token:', error);
    throw error;
  }
}