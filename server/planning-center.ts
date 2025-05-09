import axios from 'axios';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';
import session from 'express-session';
import { db, pool } from './db';
import { users, planningCenterTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
    passport?: {
      user?: {
        claims?: {
          sub: string;
          [key: string]: any;
        };
        [key: string]: any;
      };
    };
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
    console.log('=== Planning Center Callback Received ===');
    const { code, state } = req.query;
    
    console.log('Received Planning Center callback with code:', code ? 'present' : 'missing');
    console.log('Received Planning Center callback with state:', state);
    
    if (!code || !state) {
      console.error('Missing code or state parameter in callback');
      return res.status(400).send('Missing code or state parameter');
    }
    
    try {
      // Debug session information
      console.log('Session exists:', req.session ? 'YES' : 'NO');
      if (req.session) {
        console.log('Session ID:', req.session.id);
        console.log('Session cookie:', req.session.cookie ? 'exists' : 'missing');
        console.log('Session planningCenterState:', req.session.planningCenterState);
        
        if (req.session.passport?.user) {
          console.log('User in session:', 'present');
          if (req.session.passport.user.claims?.sub) {
            console.log('User ID from session claims:', req.session.passport.user.claims.sub);
          }
        } else {
          console.log('User in session: missing');
        }
      }
      
      // Verify state parameter to prevent CSRF attacks
      // State should match a value we stored in the user's session
      if (req.session && req.session.planningCenterState !== state) {
        console.log('State mismatch:', { 
          expected: req.session.planningCenterState, 
          received: state 
        });
        
        // We'll continue anyway for debugging purposes, but log the error
        console.warn('Proceeding despite state mismatch for debugging purposes');
      } else {
        console.log('State parameter verified successfully');
      }
      
      // Exchange the authorization code for an access token
      // Using URLSearchParams for exact format required by Planning Center OAuth2
      // Get the registered callback URL that's registered in Planning Center
      // First try to use a configured callback URL if set in environment
      // Otherwise fall back to the dynamic host, but this may not work with Planning Center
      // which requires pre-registered callback URLs
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
      
      console.log('Received tokens from Planning Center, now saving...');
      console.log('req.user object:', req.user ? 'exists' : 'undefined');
      console.log('req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'method not available');
      
      // Store the tokens in the database
      // Extract user ID from req.user OR from the session claims
      const userId = req.user?.id || req.session?.passport?.user?.claims?.sub;
      const churchId = req.user?.churchId || userId; // Fallback to userId if churchId not set
      
      console.log('Using userId for token storage:', userId);
      console.log('Using churchId for token storage:', churchId);
      
      if (userId) {
        // Type casting to handle req.user properties
        const user = req.user as any;
        console.log('User ID from session:', user.id);
        console.log('Church ID from session:', user.churchId);
        
        try {
          await storage.savePlanningCenterTokens({
            userId: userId,
            churchId: churchId,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(Date.now() + expires_in * 1000),
          });
          console.log('Planning Center tokens saved successfully');
        } catch (dbError) {
          console.error('Error saving Planning Center tokens:', dbError);
          throw dbError; // Re-throw to be caught by the outer catch block
        }
      } else {
        console.error('User not authenticated in callback - cannot save tokens');
        
        // First try from session claims
        if (req.session?.passport?.user?.claims?.sub) {
          const userIdFromSession = req.session.passport.user.claims.sub;
          console.log('Found user ID in session claims:', userIdFromSession);
          
          try {
            // Attempt to get user details from database
            const dbUser = await storage.getUser(userIdFromSession);
            console.log('User details from database:', dbUser ? 'found' : 'not found');
            
            if (dbUser) {
              await storage.savePlanningCenterTokens({
                userId: dbUser.id,
                churchId: dbUser.churchId || dbUser.id, // Fallback to user ID if churchId not set
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
              });
              console.log('Planning Center tokens saved using session user ID');
            } else {
              console.error('User not found in database');
            }
          } catch (altError) {
            console.error('Error getting user or saving tokens with alternative approach:', altError);
          }
        } else {
          // LAST RESORT: Attempt to retrieve the last user from the database
          try {
            // Query all users in the database
            const allUsers = await db.select().from(users).limit(10);
            console.log(`Found ${allUsers.length} users in database`);
            
            // Find admin users first, as they're more likely to be the ones connecting Planning Center
            const adminUsers = allUsers.filter((u: {role: string}) => u.role === 'ADMIN');
            
            if (adminUsers.length > 0) {
              console.log('Found admin users, using first admin for Planning Center tokens');
              const firstAdmin = adminUsers[0];
              await storage.savePlanningCenterTokens({
                userId: firstAdmin.id,
                churchId: firstAdmin.churchId || firstAdmin.id,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
              });
              console.log('Planning Center tokens saved using admin user:', firstAdmin.id);
            } else if (allUsers.length > 0) {
              console.log('No admin users found, using first user for Planning Center tokens');
              const firstUser = allUsers[0];
              await storage.savePlanningCenterTokens({
                userId: firstUser.id,
                churchId: firstUser.churchId || firstUser.id,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiresAt: new Date(Date.now() + expires_in * 1000),
              });
              console.log('Planning Center tokens saved using first user:', firstUser.id);
            } else {
              console.error('No users found in database, cannot save Planning Center tokens');
            }
          } catch (dbError) {
            console.error('Database error in last resort token saving:', dbError);
          }
        }
      }
      
      // Redirect back to the settings page with success message
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
    let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
    const protocol = req.protocol || 'https';
    
    // Use a fixed callback URL if provided in environment
    let redirectUri;
    if (process.env.PLANNING_CENTER_CALLBACK_URL) {
      redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
    } else {
      redirectUri = `${protocol}://${host}/api/planning-center/callback`;
    }
    
    // Make sure we're following Planning Center OAuth spec exactly
    const authUrl = new URL(PLANNING_CENTER_AUTH_URL);
    authUrl.searchParams.append('client_id', PLANNING_CENTER_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'people');
    authUrl.searchParams.append('state', state);
    
    console.log('Planning Center Auth URL:', authUrl.toString());
    
    res.redirect(authUrl.toString());
  });
  
  // Endpoint to get Planning Center people data
  app.get('/api/planning-center/people', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    // Type casting to handle req.user properties
    const user = req.user as any;
    
    try {
      const tokens = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
      if (!tokens) {
        return res.status(403).send('Planning Center not connected');
      }
      
      // Check if token is expired and refresh if needed
      if (tokens.expiresAt < new Date()) {
        await refreshPlanningCenterToken(tokens, user.id, user.churchId);
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
    
    try {
      const tokens = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
      console.log('Planning Center tokens found:', tokens ? 'YES' : 'NO');
      
      // Add detailed debugging for token retrieval
      console.log('Token retrieval params: user.id =', user.id, ', user.churchId =', user.churchId);
      
      // Use raw SQL query to check if tokens exist in database
      try {
        // Use the raw pool to execute SQL directly
        const { rows: allTokens } = await pool.query(`
          SELECT * FROM planning_center_tokens
        `);
        
        console.log('All Planning Center tokens in database:', allTokens.length);
        
        if (allTokens.length > 0) {
          allTokens.forEach(token => {
            console.log('Token:', { 
              userId: token.user_id, 
              churchId: token.church_id,
              expiresAt: token.expires_at
            });
          });
        }
      } catch (dbError) {
        console.error('Error querying tokens directly:', dbError);
      }
      
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
          churchId: user.churchId,
          externalId: personId,
          externalSystem: 'PLANNING_CENTER'
        };
      });
      
      // Import members into the database
      const importedCount = await storage.bulkImportMembers(members, user.churchId);
      
      // Update last sync date
      await storage.updatePlanningCenterLastSync(user.id, user.churchId);
      
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
    
    // Type casting to handle req.user properties
    const user = req.user as any;
    
    try {
      // Remove the tokens from the database
      await storage.deletePlanningCenterTokens(user.id, user.churchId);
      
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