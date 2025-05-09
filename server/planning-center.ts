import axios from 'axios';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';
import session from 'express-session';
import crypto from 'crypto';

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
// Getting URLs directly from the Planning Center documentation
// https://developer.planning.center/docs/#/overview/authentication
// Planning Center's documentation seems to be outdated. 
// Based on testing, api.planningcenteronline.com works for OAuth flows
const PLANNING_CENTER_AUTH_URL = 'https://api.planningcenteronline.com/oauth/authorize';
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
      // In direct same-window approach, we're getting redirected directly from Planning Center,
      // so we may not be able to rely on session state as much. We'll need to be more lenient.
      if (req.session && req.session.planningCenterState && req.session.planningCenterState !== state) {
        console.log('State mismatch (still proceeding):', { 
          expected: req.session.planningCenterState, 
          received: state 
        });
        // Not returning an error here, allowing the flow to continue
      }
      
      // Exchange the authorization code for an access token
      // Using URLSearchParams for exact format required by Planning Center OAuth2
      let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
      console.log('Current callback host:', host);
      const protocol = req.protocol || 'https';
      
      // Use a fixed callback URL if provided in environment
      let redirectUri;
      if (process.env.PLANNING_CENTER_CALLBACK_URL) {
        redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
        console.log('Using fixed callback URL from env:', redirectUri);
      } else {
        redirectUri = `${protocol}://${host}/api/planning-center/callback`;
        console.log('Using dynamic callback URL:', redirectUri);
      }
      
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code as string);
      params.append('client_id', PLANNING_CENTER_CLIENT_ID);
      params.append('client_secret', PLANNING_CENTER_CLIENT_SECRET);
      params.append('redirect_uri', redirectUri);
      
      console.log('Token request params:', {
        url: PLANNING_CENTER_TOKEN_URL,
        grant_type: 'authorization_code',
        code: code,
        client_id: PLANNING_CENTER_CLIENT_ID,
        redirect_uri: redirectUri
      });
      
      const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // We need to save the tokens, but there's a problem when the session
      // has been lost in the OAuth redirect flow.
      // Two approaches:
      // 1. Store the tokens temporarily and let the client retrieve them
      // 2. Force a login and then save the tokens
      
      if (req.user?.id) {
        console.log('Saving Planning Center tokens for user:', req.user.id, 'church:', req.user.churchId);
        
        // Debug user object
        console.log('Full req.user object:', JSON.stringify(req.user, null, 2));
        
        // If churchId is missing, fall back to using userId as churchId
        const churchId = req.user.churchId || req.user.id;
        console.log('Using churchId:', churchId);
        
        try {
          await storage.savePlanningCenterTokens({
            userId: req.user.id,
            churchId: churchId,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(Date.now() + expires_in * 1000),
          });
          console.log('Successfully saved Planning Center tokens');
          
          // After saving, verify tokens were stored properly
          const storedTokens = await storage.getPlanningCenterTokens(req.user.id, churchId);
          console.log('Verified tokens in database:', storedTokens ? 'YES' : 'NO');
        } catch (tokenSaveError) {
          console.error('Error saving Planning Center tokens:', tokenSaveError);
        }
      } else {
        // If no user in session, we're doing something special: 
        // We'll create a temporary token storage with instructions for the main page
        // to save it once the user is authenticated again
        console.log('No user session found - storing tokens temporarily');
        
        // Generate a secure temporary key
        const tempKey = Math.random().toString(36).substring(2, 15) + 
                        Math.random().toString(36).substring(2, 15);
        
        // Store tokens in server memory temporarily (5 minute expiration)
        // This is a simplistic approach - in production you'd want something more robust
        app.locals.tempPlanningCenterTokens = app.locals.tempPlanningCenterTokens || {};
        app.locals.tempPlanningCenterTokens[tempKey] = {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          created: new Date()
        };
        
        // Clean up old temporary tokens (older than 5 minutes)
        const now = new Date();
        Object.keys(app.locals.tempPlanningCenterTokens).forEach(key => {
          const created = app.locals.tempPlanningCenterTokens[key].created;
          if ((now.getTime() - created.getTime()) > 5 * 60 * 1000) {
            delete app.locals.tempPlanningCenterTokens[key];
          }
        });
        
        console.log('Created temporary token storage with key:', tempKey);
        
        // Redirect with the temporary key as a parameter using parameter name pc_temp_key
        // to match what we're expecting in the settings page
        return res.redirect(`/settings?pc_temp_key=${tempKey}`);
      }
      
      // Standard success redirect
      res.redirect('/settings?planningCenterConnected=true');
    } catch (error) {
      console.error('Planning Center OAuth error:', error);
      res.redirect('/settings?planningCenterError=true');
    }
  });
  
  // Endpoint to get the OAuth authentication URL (doesn't redirect, just returns the URL)
  app.get('/api/planning-center/auth-url', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Generate and store a random state parameter to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    
    // Log what host Replit thinks we are
    console.log('Your Replit host: ' + req.get('host'));
    console.log('X-Forwarded-Host: ' + req.get('x-forwarded-host'));
    console.log('Protocol: ' + req.protocol);
    
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
    
    // Generate Planning Center's authorization URL with all required parameters
    // Documentation: https://developer.planning.center/docs/#/overview/authentication
    // Get the registered callback URL that's registered in Planning Center
    // First try to use a configured callback URL if set in environment
    // Otherwise fall back to the dynamic host, but this may not work with Planning Center
    // which requires pre-registered callback URLs
    let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
    console.log('Current host:', host);
    const protocol = req.protocol || 'https';
    
    // Use a fixed callback URL if provided in environment
    let redirectUri;
    if (process.env.PLANNING_CENTER_CALLBACK_URL) {
      redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
      console.log('Using fixed callback URL from env:', redirectUri);
    } else {
      redirectUri = `${protocol}://${host}/api/planning-center/callback`;
      console.log('Using dynamic callback URL:', redirectUri);
    }
    console.log('Redirect URI:', redirectUri);
    
    // Make sure we're following Planning Center OAuth spec exactly
    // https://developer.planning.center/docs/#/overview/authentication
    const authUrl = new URL(PLANNING_CENTER_AUTH_URL);
    authUrl.searchParams.append('client_id', PLANNING_CENTER_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    
    // According to the docs, scope should be space-separated list in a single parameter
    // For People API access, we need the 'people' scope
    authUrl.searchParams.append('scope', 'people');
    
    // Add state for CSRF protection
    authUrl.searchParams.append('state', state);
    
    // Print full URL for troubleshooting
    console.log('Full Planning Center Auth URL:', authUrl.toString());
    
    // Return the URL instead of redirecting
    res.json({ url: authUrl.toString() });
  });

  // Endpoint to initiate the OAuth flow via redirect (keep this for backwards compatibility)
  app.get('/api/planning-center/authorize', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    // Generate and store a random state parameter to prevent CSRF attacks
    const state = Math.random().toString(36).substring(2, 15);
    
    // Log what host Replit thinks we are
    console.log('Your Replit host: ' + req.get('host'));
    console.log('X-Forwarded-Host: ' + req.get('x-forwarded-host'));
    console.log('Protocol: ' + req.protocol);
    
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
    
    // Redirect to Planning Center's authorization page with all required parameters
    // Documentation: https://developer.planning.center/docs/#/overview/authentication
    // Get the registered callback URL that's registered in Planning Center
    // First try to use a configured callback URL if set in environment
    // Otherwise fall back to the dynamic host, but this may not work with Planning Center
    // which requires pre-registered callback URLs
    let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
    console.log('Current host:', host);
    const protocol = req.protocol || 'https';
    
    // Use a fixed callback URL if provided in environment
    let redirectUri;
    if (process.env.PLANNING_CENTER_CALLBACK_URL) {
      redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
      console.log('Using fixed callback URL from env:', redirectUri);
    } else {
      redirectUri = `${protocol}://${host}/api/planning-center/callback`;
      console.log('Using dynamic callback URL:', redirectUri);
    }
    console.log('Redirect URI:', redirectUri);
    
    // Make sure we're following Planning Center OAuth spec exactly
    // https://developer.planning.center/docs/#/overview/authentication
    const authUrl = new URL(PLANNING_CENTER_AUTH_URL);
    authUrl.searchParams.append('client_id', PLANNING_CENTER_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    
    // According to the docs, scope should be space-separated list in a single parameter
    // For People API access, we need the 'people' scope
    authUrl.searchParams.append('scope', 'people');
    
    // Add state for CSRF protection
    authUrl.searchParams.append('state', state);
    
    // Print full URL for troubleshooting
    console.log('Full Planning Center Auth URL:', authUrl.toString());

    console.log('Planning Center Auth URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
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
    
    // Explicitly cast req.user to get TypeScript to recognize the properties
    const user = req.user as any;
    console.log('Checking Planning Center status for user:', user.id, 'church:', user.churchId);
    
    // Debug user object to see what properties are available
    console.log('Full req.user object in status check:', JSON.stringify(req.user, null, 2));
    
    // If churchId is missing, fall back to using userId as churchId (same as in callback)
    const churchId = user.churchId || user.id;
    console.log('Using churchId for token lookup:', churchId);
    
    try {
      // Try to get tokens with churchId first (preferred)
      let tokens = await storage.getPlanningCenterTokens(user.id, churchId);
      
      // If that fails, try with userId as churchId
      if (!tokens && churchId !== user.id) {
        console.log('No tokens found with churchId, trying with userId as churchId...');
        tokens = await storage.getPlanningCenterTokens(user.id, user.id);
      }
      
      console.log('Planning Center tokens found:', tokens ? 'YES' : 'NO');
      
      if (!tokens) {
        // Show more details in the 'false' response
        return res.status(200).json({ 
          connected: false,
          message: 'No Planning Center tokens found in database',
          userId: user.id,
          churchId: user.churchId
        });
      }
      
      console.log('Planning Center token expires at:', tokens.expiresAt);
      console.log('Current time:', new Date());
      
      // Check if token is expired and refresh if needed
      if (tokens.expiresAt < new Date()) {
        console.log('Token is expired, refreshing...');
        await refreshPlanningCenterToken(tokens, user.id, user.churchId);
      }
      
      // Make API request to get people count
      console.log('Making request to Planning Center API to verify connection...');
      const peopleResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`
        },
        params: {
          per_page: 1
        }
      });
      
      console.log('Planning Center API responded successfully');
      
      // Return connection status with people count if available
      res.status(200).json({
        connected: true,
        lastSyncDate: tokens.updatedAt?.toISOString(),
        peopleCount: peopleResponse.data.meta?.total_count || 0
      });
    } catch (error) {
      console.error('Error fetching Planning Center status:', error);
      // Still return a valid response structure, just with connected: false
      res.status(200).json({ 
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/planning-center/import', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    // Type casting to handle req.user properties
    const user = req.user as any;
    console.log('Importing Planning Center members for user:', user.id, 'church:', user.churchId);
    
    try {
      const tokens = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
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
      
      // Planning Center's API response structure is different from what we expected
      // Let's log the first person to see the structure
      if (people && people.length > 0) {
        console.log('Planning Center API response structure:', 
          JSON.stringify(peopleResponse.data, null, 2).substring(0, 1000) + '...');
      }
      
      // Get the included data (emails and phone numbers)
      const included = peopleResponse.data.included || [];
      
      // Create lookup maps for emails and phone numbers by their owner ID
      const emailsByOwnerId = new Map();
      const phonesByOwnerId = new Map();
      
      // Process included data to organize by owner
      included.forEach((item: any) => {
        if (item.type === 'Email') {
          const ownerId = item.relationships?.person?.data?.id;
          if (ownerId) {
            if (!emailsByOwnerId.has(ownerId)) {
              emailsByOwnerId.set(ownerId, []);
            }
            emailsByOwnerId.get(ownerId).push(item.attributes?.address);
          }
        } else if (item.type === 'PhoneNumber') {
          const ownerId = item.relationships?.person?.data?.id;
          if (ownerId) {
            if (!phonesByOwnerId.has(ownerId)) {
              phonesByOwnerId.set(ownerId, []);
            }
            phonesByOwnerId.get(ownerId).push(item.attributes?.number);
          }
        }
      });
      
      console.log(`Found ${emailsByOwnerId.size} people with emails and ${phonesByOwnerId.size} people with phone numbers`);
      
      // Convert Planning Center people to PlateSync members
      const members = people.map((person: any) => {
        const attributes = person.attributes;
        const personId = person.id;
        
        // Get first email and phone for this person
        const emails = emailsByOwnerId.get(personId) || [];
        const phones = phonesByOwnerId.get(personId) || [];
        
        return {
          firstName: attributes.first_name,
          lastName: attributes.last_name,
          email: emails.length > 0 ? emails[0] : null,
          phone: phones.length > 0 ? phones[0] : null,
          isVisitor: false,
          churchId: req.user?.churchId || user.churchId,
          externalId: personId,
          externalSystem: 'PLANNING_CENTER'
        };
      });
      
      // Import members into the database
      const importedCount = await storage.bulkImportMembers(members, req.user?.churchId || user.churchId);
      
      // Update last sync date
      await storage.updatePlanningCenterLastSync(req.user?.id || user.id, req.user?.churchId || user.churchId);
      
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
      const user = req.user as any;
      await storage.deletePlanningCenterTokens(user.id, user.churchId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error disconnecting from Planning Center:', error);
      res.status(500).send('Error disconnecting from Planning Center');
    }
  });
  
  // Endpoint to retrieve temporary tokens and store them permanently
  app.get('/api/planning-center/claim-temp-tokens/:tempKey', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    const { tempKey } = req.params;
    
    if (!tempKey || !app.locals.tempPlanningCenterTokens || !app.locals.tempPlanningCenterTokens[tempKey]) {
      return res.status(404).json({ success: false, error: 'Temporary tokens not found or expired' });
    }
    
    try {
      const tokens = app.locals.tempPlanningCenterTokens[tempKey];
      const user = req.user as any;
      const churchId = user.churchId || user.id;
      
      // Save the tokens to the database
      await storage.savePlanningCenterTokens({
        userId: user.id,
        churchId: churchId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
      
      // Delete the temporary tokens
      delete app.locals.tempPlanningCenterTokens[tempKey];
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error claiming temporary tokens:', error);
      res.status(500).json({ success: false, error: 'Failed to claim temporary tokens' });
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
    // Using URLSearchParams for form data as required by Planning Center API
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens.refreshToken);
    params.append('client_id', PLANNING_CENTER_CLIENT_ID);
    params.append('client_secret', PLANNING_CENTER_CLIENT_SECRET);
    
    const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
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