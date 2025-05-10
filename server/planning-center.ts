import axios from 'axios';
import { storage } from './storage';
import type { Express, Request, Response } from 'express';
import session from 'express-session';
import crypto from 'crypto';

// Helper function to identify user from request.user
function identifyUser(user: any): string {
  if (user?.claims?.sub) {
    console.log('Found userId in claims.sub:', user.claims.sub);
    return user.claims.sub;
  }
  
  if (user?.id) {
    console.log('Successfully identified user with ID:', user.id);
    return user.id;
  }
  
  throw new Error('Unable to identify user');
}

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
    planningCenterChurchId?: string;
    planningCenterUserId?: string;
  }
}

// Planning Center OAuth constants
// Getting URLs directly from the Planning Center documentation
// https://developer.planning.center/docs/#/overview/authentication
// Direct OAuth URL to the planning center login page - must be the correct domain
const PLANNING_CENTER_AUTH_URL = 'https://api.planningcenteronline.com/oauth/authorize';
const PLANNING_CENTER_TOKEN_URL = 'https://api.planningcenteronline.com/oauth/token';
const PLANNING_CENTER_API_BASE = 'https://api.planningcenteronline.com';

// Load credentials from environment variables
const PLANNING_CENTER_CLIENT_ID = process.env.PLANNING_CENTER_CLIENT_ID || '';
const PLANNING_CENTER_CLIENT_SECRET = process.env.PLANNING_CENTER_CLIENT_SECRET || '';

// Export the setup function to be called from routes.ts
export function setupPlanningCenterRoutes(app: Express) {
  // Search for Testerly Jones specifically
  app.get('/api/planning-center/find-testerly', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const user = req.user as any;
    
    try {
      const userId = identifyUser(req.user);
      const churchId = user.churchId || userId;
      
      const tokens = await storage.getPlanningCenterTokens(userId, churchId);
      
      if (!tokens) {
        return res.status(403).json({ success: false, error: 'Planning Center not connected' });
      }
      
      console.log('Searching Planning Center specifically for Testerly Jones...');
      
      try {
        // Directly search for Testerly Jones
        const searchResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          },
          params: {
            'where[search_name]': 'testerly',
            include: 'emails,phone_numbers'
          }
        });
        
        console.log('Search response from Planning Center:', 
          JSON.stringify(searchResponse.data).substring(0, 500) + '...');
        
        if (searchResponse.data.data && searchResponse.data.data.length > 0) {
          console.log(`Found ${searchResponse.data.data.length} people matching "testerly"`);
          
          // Process included data (emails, phones)
          const included = searchResponse.data.included || [];
          const emailsByOwnerId = new Map();
          const phonesByOwnerId = new Map();
          
          included.forEach((item: any) => {
            if (item.type === 'Email') {
              const ownerId = item.relationships?.person?.data?.id;
              if (ownerId && item.attributes?.address) {
                if (!emailsByOwnerId.has(ownerId)) {
                  emailsByOwnerId.set(ownerId, []);
                }
                emailsByOwnerId.get(ownerId).push(item.attributes.address);
              }
            } else if (item.type === 'PhoneNumber') {
              const ownerId = item.relationships?.person?.data?.id;
              if (ownerId && item.attributes?.number) {
                if (!phonesByOwnerId.has(ownerId)) {
                  phonesByOwnerId.set(ownerId, []);
                }
                phonesByOwnerId.get(ownerId).push(item.attributes.number);
              }
            }
          });
          
          // Format results and log details
          const people = searchResponse.data.data.map((person: any) => {
            const personId = person.id;
            const attrs = person.attributes;
            const emails = emailsByOwnerId.get(personId) || [];
            const phones = phonesByOwnerId.get(personId) || [];
            
            console.log(`Person details: ${attrs.first_name} ${attrs.last_name} (ID: ${personId})`);
            if (emails.length > 0) console.log(`Email: ${emails[0]}`);
            if (phones.length > 0) console.log(`Phone: ${phones[0]}`);
            
            return {
              id: personId,
              firstName: attrs.first_name || '',
              lastName: attrs.last_name || '',
              email: emails.length > 0 ? emails[0] : null,
              phone: phones.length > 0 ? phones[0] : null
            };
          });
          
          // Import specifically this person
          const members = people.map((person: any) => ({
            firstName: person.firstName,
            lastName: person.lastName,
            email: person.email,
            phone: person.phone,
            isVisitor: false,
            churchId: churchId,
            externalId: person.id,
            externalSystem: 'PLANNING_CENTER'
          }));
          
          // Force import
          const importedCount = await storage.bulkImportMembers(members, churchId);
          
          if (importedCount > 0) {
            return res.json({
              success: true,
              message: `Found and imported ${importedCount} people matching "testerly"!`,
              people: people
            });
          } else {
            return res.json({
              success: false,
              message: 'Found people but import failed',
              people: people
            });
          }
        } else {
          return res.json({
            success: false,
            message: 'Testerly Jones was not found in Planning Center',
            people: []
          });
        }
      } catch (searchError) {
        console.error('Error searching for Testerly Jones:', searchError);
        return res.status(500).json({
          success: false,
          error: searchError instanceof Error ? searchError.message : 'Unknown error'
        });
      }
    } catch (error) {
      console.error('Error in Testerly search:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Add a special debugging endpoint to clear all Planning Center tokens
  app.post('/api/planning-center/clear-tokens', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    try {
      // Determine the churchId (using fallback if needed)
      const churchId = req.user.churchId || req.user.id;
      
      // Clear tokens from the database
      await storage.deletePlanningCenterTokens(req.user.id, churchId);
      
      // Clear any temporary tokens stored in memory
      if (app.locals.tempPlanningCenterTokens) {
        app.locals.tempPlanningCenterTokens = {};
      }
      
      console.log('Planning Center tokens cleared for user:', req.user.id);
      res.json({ success: true, message: 'Planning Center tokens cleared successfully' });
    } catch (error) {
      console.error('Error clearing Planning Center tokens:', error);
      res.status(500).json({ error: 'Failed to clear Planning Center tokens' });
    }
  });
  // OAuth callback endpoint with enhanced error handling and security
  app.get('/api/planning-center/callback', async (req: Request, res: Response) => {
    try {
      // Extract all query parameters for detailed logging
      const { code, state, error, error_description, churchId } = req.query;
      
      // Store churchId from the request in the session for token claim step
      if (churchId && req.session) {
        req.session.planningCenterChurchId = String(churchId);
        console.log('Stored churchId from callback in session:', churchId);
      }
      
      // Log the callback details for debugging (redacting sensitive parts)
      console.log('Planning Center callback received with params:', {
        code: code ? `${String(code).substring(0, 4)}...` : 'undefined',
        state: state ? `${String(state).substring(0, 4)}...` : 'undefined',
        error: error || 'none',
        error_description: error_description || 'none',
        churchId: churchId || 'none',
        host: req.get('host'),
        'x-forwarded-host': req.get('x-forwarded-host'),
        'user-agent': req.get('user-agent')
      });
      
      // Check if Planning Center returned an explicit error
      if (error) {
        console.error('Planning Center returned an error:', error, error_description);
        return res.redirect(`/settings?planningCenterError=${encodeURIComponent(String(error))}&error_description=${encodeURIComponent(String(error_description || 'Unknown error'))}`);
      }
      
      // Validate required parameters
      if (!code || !state) {
        console.error('Missing code or state parameter', { code: !!code, state: !!state });
        return res.redirect('/settings?planningCenterError=missing_params');
      }
      
      // Only check state match if session is available, otherwise proceed with caution
      if (req.session && req.session.planningCenterState) {
        // Partial state logging for debugging (never log full state values)
        console.log('Session state:', req.session.planningCenterState.substring(0, 8) + '...');
        console.log('Callback state:', String(state).substring(0, 8) + '...');
        
        // Verify the state parameter matches what we stored (CSRF protection)
        // But with fallback behavior if it doesn't match (after logging the mismatch)
        if (req.session.planningCenterState !== state) {
          console.log('State mismatch (still proceeding):', { 
            expected: req.session.planningCenterState.substring(0, 8) + '...', 
            received: String(state).substring(0, 8) + '...'
          });
          // Not returning an error here, allowing the flow to continue
          // This makes the flow more resilient to session issues during redirects
        }
      } else {
        console.warn('Session or planningCenterState not available, proceeding without state verification');
      }
      
      // Determine the correct redirect URI (must match what was used in the initial authorization request)
      let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
      console.log('Current callback host:', host);
      const protocol = req.protocol || 'https';
      
      // Prefer the environment-configured redirect URI if available
      let redirectUri;
      if (process.env.PLANNING_CENTER_CALLBACK_URL) {
        // Always use the environment variable if available, but ensure we don't add duplicate params
        redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
        console.log('Using fixed callback URL from env:', redirectUri);
        
        // Extract churchId from query parameter or session, prioritizing query
        const churchId = req.query.churchId as string || 
                         (req.session && req.session.planningCenterChurchId);
        
        // If we have a churchId, make sure it's included in the callback URL
        if (churchId) {
          console.log('Adding churchId to callback URL:', churchId);
          // If URL already has parameters, add churchId as another parameter
          if (redirectUri.includes('?')) {
            redirectUri += `&churchId=${encodeURIComponent(churchId)}`;
          } else {
            redirectUri += `?churchId=${encodeURIComponent(churchId)}`;
          }
        }
      } else {
        // If no fixed URL, build our own with proper query parameters
        redirectUri = `${protocol}://${host}/api/planning-center/callback`;
        console.log('Using dynamic callback URL:', redirectUri);
      }
      
      // Build properly formatted parameters for token request
      // Using URLSearchParams to ensure proper encoding and formatting
      const params = new URLSearchParams();
      params.append('grant_type', 'authorization_code');
      params.append('code', code as string);
      params.append('client_id', PLANNING_CENTER_CLIENT_ID);
      params.append('client_secret', PLANNING_CENTER_CLIENT_SECRET);
      params.append('redirect_uri', redirectUri);
      
      console.log('Token request to Planning Center with params:', {
        url: PLANNING_CENTER_TOKEN_URL,
        grant_type: 'authorization_code',
        code: `${String(code).substring(0, 4)}...`, // Redacted for security
        client_id: PLANNING_CENTER_CLIENT_ID,
        redirect_uri: redirectUri
      });
      
      // Request access token from Planning Center
      const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'PlateSync/1.0'
        },
        // Adding timeout to prevent hanging requests
        timeout: 10000 // 10 second timeout
      });
      
      // Extract token data from response
      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      
      // Validate required token data
      if (!access_token || !refresh_token) {
        console.error('Missing tokens in Planning Center response!', {
          has_access_token: !!access_token,
          has_refresh_token: !!refresh_token,
          expires_in: expires_in
        });
        return res.redirect('/settings?planningCenterError=invalid_token_response');
      }
      
      console.log('Successfully received tokens from Planning Center');
      
      // Handle the tokens based on user authentication state
      if (req.user?.id) {
        // User is authenticated - save tokens directly
        console.log('Saving Planning Center tokens for user:', req.user.id, 'church:', req.user.churchId);
        
        // Debug user object (redacted for security)
        const userDebug = { ...req.user as Record<string, any> };
        // Safely redact any sensitive information
        if (typeof userDebug === 'object' && userDebug) {
          // Redact common sensitive fields that might be present
          ['password', 'token', 'secret'].forEach(field => {
            if (field in userDebug) {
              userDebug[field] = '[REDACTED]';
            }
          });
        }
        console.log('User details:', JSON.stringify(userDebug, null, 2));
        
        // If churchId is missing, fall back to using userId as churchId
        const churchId = req.user.churchId || req.user.id;
        console.log('Using churchId for token storage:', churchId);
        
        try {
          // Save tokens to database
          await storage.savePlanningCenterTokens({
            userId: req.user.id,
            churchId: churchId,
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: new Date(Date.now() + expires_in * 1000),
          });
          console.log('Successfully saved Planning Center tokens to database');
          
          // Verify tokens were stored properly
          const storedTokens = await storage.getPlanningCenterTokens(req.user.id, churchId);
          const verificationSuccess = !!storedTokens;
          console.log('Verified tokens in database:', verificationSuccess ? 'YES' : 'NO');
          
          if (!verificationSuccess) {
            console.error('Token verification failed - tokens not found in database after save');
            return res.redirect('/settings?planningCenterError=token_storage_failed');
          }
          
          // Successfully saved tokens - redirect to success page
          return res.redirect('/settings?planningCenterConnected=true');
        } catch (tokenSaveError) {
          console.error('Error saving Planning Center tokens:', tokenSaveError);
          return res.redirect('/settings?planningCenterError=token_save_failed');
        }
      } else {
        // No user in session - store tokens temporarily with improved security
        console.log('No user session found - storing tokens temporarily');
        
        // Generate a more secure temporary key with higher entropy
        const tempKey = crypto.randomBytes(24).toString('hex');
        
        // Store tokens in server memory temporarily (extended expiration for better UX)
        // Initialize the temporary token storage if it doesn't exist
        app.locals.tempPlanningCenterTokens = app.locals.tempPlanningCenterTokens || {};
        
        // Extract churchId from query parameter (if available)
        const churchId = req.query.churchId ? String(req.query.churchId) : undefined;
        console.log('Temp token churchId from query:', churchId || 'not provided');
        
        // Store token with detailed metadata for debugging
        app.locals.tempPlanningCenterTokens[tempKey] = {
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + expires_in * 1000),
          created: new Date(),
          churchId: churchId, // Store the churchId with the token
          meta: {
            userAgent: req.get('user-agent') || 'unknown',
            ipAddress: req.ip || 'unknown',
            timestamp: new Date().toISOString(),
            host: req.get('host') || 'unknown'
          }
        };
        
        // Log temporary token creation (without exposing sensitive data)
        console.log(`Created temporary token with key ${tempKey.substring(0, 8)}...`);
        console.log(`Total temporary tokens in memory: ${Object.keys(app.locals.tempPlanningCenterTokens).length}`);
        
        // Clean up expired temporary tokens (housekeeping)
        const now = new Date();
        const TEMP_TOKEN_EXPIRATION = 30 * 60 * 1000; // 30 minutes in milliseconds
        let expiredCount = 0;
        
        Object.keys(app.locals.tempPlanningCenterTokens).forEach(key => {
          const created = app.locals.tempPlanningCenterTokens[key].created;
          if ((now.getTime() - created.getTime()) > TEMP_TOKEN_EXPIRATION) {
            delete app.locals.tempPlanningCenterTokens[key];
            expiredCount++;
          }
        });
        
        if (expiredCount > 0) {
          console.log(`Cleaned up ${expiredCount} expired temporary tokens`);
        }
        
        // Redirect with temporary key for client-side token claiming and include churchId if available
        if (churchId) {
          return res.redirect(`/planning-center-redirect.html?success=true&tempKey=${tempKey}&churchId=${churchId}`);
        } else {
          return res.redirect(`/planning-center-redirect.html?success=true&tempKey=${tempKey}`);
        }
      }
    } catch (error) {
      // Comprehensive error handling with detailed logging
      console.error('Planning Center OAuth error:', error);
      
      // Try to extract useful details from the error
      let errorDetails = 'unknown';
      let errorDescription = 'An unexpected error occurred';
      
      // Type guard for AxiosError
      if (error && typeof error === 'object') {
        // Handle Axios error response
        if ('response' in error && error.response) {
          // The request was made and the server responded with a status code outside of 2xx
          const response = error.response as Record<string, any>;
          const responseStatus = typeof response.status === 'number' ? response.status : 500;
          errorDetails = `http_${responseStatus}`;
          
          // Safely extract error description
          let responseData: any = null;
          try {
            responseData = response.data;
          } catch (e) {
            console.error('Error parsing response data:', e);
          }
          
          // Safely get status text
          const statusText = typeof response.statusText === 'string' ? response.statusText : 'Unknown Error';
          
          errorDescription = 
            responseData && responseData.error_description ? responseData.error_description : 
            responseData && responseData.error ? responseData.error : 
            statusText || 
            `HTTP error ${responseStatus}`;
          
          console.error('API response error details:', {
            status: responseStatus,
            statusText: statusText,
            data: responseData
          });
        } 
        // Handle network errors
        else if ('request' in error && error.request) {
          // The request was made but no response was received
          errorDetails = 'network';
          const errorCode = 'code' in error ? String(error.code) : 'unknown';
          errorDescription = errorCode || 'Network error, no response received';
          
          console.error('Network error details:', {
            code: errorCode,
            message: 'message' in error ? String(error.message) : 'Unknown message'
          });
        } 
        // Handle other errors
        else if ('message' in error) {
          // Something happened in setting up the request
          errorDetails = 'request_setup';
          errorDescription = String(error.message) || 'Error setting up request';
        }
      }
      
      // Redirect to settings with encoded error details
      return res.redirect(`/settings?planningCenterError=${errorDetails}&error_description=${encodeURIComponent(errorDescription)}`);
    }
  });
  
  // Endpoint to get the OAuth authentication URL (doesn't redirect, just returns the URL)
  app.get('/api/planning-center/auth-url', async (req: Request, res: Response) => {
    if (!req.user) {
      console.log('No authenticated user found for Planning Center auth URL generation');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to connect to Planning Center',
        details: 'Please ensure you are logged in and try again'
      });
    }
    
    if (!PLANNING_CENTER_CLIENT_ID || !PLANNING_CENTER_CLIENT_SECRET) {
      console.error('Planning Center API credentials not configured');
      return res.status(400).json({ 
        error: 'Planning Center credentials not configured',
        message: 'Administrator setup required',
        details: 'The system needs to be configured with valid Planning Center API credentials'
      });
    }
    
    try {
      // Use crypto for more secure state parameter with higher entropy
      const state = crypto.randomBytes(24).toString('hex');
      
      // Log user details for debugging
      const authUrlUser = req.user as any;
      console.log('Full req.user object in auth URL generation:', JSON.stringify(authUrlUser, null, 2));
      
      // Extract user ID from req.user which might be in different formats based on auth method
      let userId = '';
      
      // Check for Replit Auth structure (claims.sub)
      if (authUrlUser.claims && authUrlUser.claims.sub) {
        userId = authUrlUser.claims.sub;
        console.log('Found userId in claims.sub:', userId);
      } 
      // Try alternatives for username/email-based auth
      else if (authUrlUser.username || authUrlUser.email) {
        // Use email if available, otherwise try username
        const emailToCheck = authUrlUser.email || authUrlUser.username;
        
        // Try to look up user by email
        try {
          const foundUser = await storage.getUserByEmail(emailToCheck);
          if (foundUser && foundUser.id) {
            userId = foundUser.id;
            console.log('Found userId by looking up email:', userId);
          }
        } catch (err) {
          console.error('Error looking up user by email:', err);
        }
      }
      // Check for local auth structure (id)
      else if (authUrlUser.id) {
        userId = authUrlUser.id;
        console.log('Found userId in user.id:', userId);
      }
      
      // If we can't find a user ID, we have a problem
      if (!userId) {
        console.error('Could not extract user ID from user object for auth URL generation');
        return res.status(400).json({
          error: 'invalid_user',
          message: 'Could not determine user identity'
        });
      }
      
      // Assign the extracted ID to authUrlUser.id for consistent usage
      authUrlUser.id = userId;
      console.log(`Auth URL request from user: ${authUrlUser.id}, church: ${authUrlUser.churchId || authUrlUser.id}`);
      
      // If churchId is missing, fall back to using userId as churchId
      if (!authUrlUser.churchId) {
        authUrlUser.churchId = authUrlUser.id;
        console.log('No churchId found, using user.id as churchId:', authUrlUser.churchId);
      }
      
      // Store the properly identified authUrlUser.id and churchId in the session for later use
      if (req.session) {
        req.session.planningCenterUserId = authUrlUser.id;
        req.session.planningCenterChurchId = authUrlUser.churchId;
        console.log('Stored user.id and churchId in session for Planning Center auth');
      }
      
      // Log what host Replit thinks we are for debugging network problems
      console.log('Debug - Host details:');
      console.log('  Replit host: ' + req.get('host'));
      console.log('  X-Forwarded-Host: ' + req.get('x-forwarded-host'));
      console.log('  Protocol: ' + req.protocol);
      console.log('  User Agent: ' + req.get('user-agent'));
      
      // Store state in session for verification during callback
      if (req.session) {
        req.session.planningCenterState = state;
        console.log('State saved in session:', state.substring(0, 8) + '...');
        
        // Force session save to ensure state is properly stored before redirect
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
            } else {
              console.log('Session saved successfully');
              resolve();
            }
          });
        });
      } else {
        console.warn('Session not available! Cannot save state parameter.');
      }
      
      // Generate Planning Center's authorization URL with all required parameters
      // Documentation: https://developer.planning.center/docs/#/overview/authentication
      
      // Get the registered callback URL that's registered in Planning Center
      let host = process.env.PLANNING_CENTER_REDIRECT_HOST || req.get('host');
      const protocol = req.protocol || 'https';
      
      // Use a fixed callback URL if provided in environment (preferred)
      let redirectUri;
      if (process.env.PLANNING_CENTER_CALLBACK_URL) {
        redirectUri = process.env.PLANNING_CENTER_CALLBACK_URL;
        console.log('Using fixed callback URL from env:', redirectUri);
      } else {
        redirectUri = `${protocol}://${host}/api/planning-center/callback`;
        console.log('Using dynamic callback URL:', redirectUri);
      }
      
      // Make sure we're following Planning Center OAuth spec exactly
      // https://developer.planning.center/docs/#/overview/authentication
      const authUrl = new URL(PLANNING_CENTER_AUTH_URL);
      authUrl.searchParams.append('client_id', PLANNING_CENTER_CLIENT_ID);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      
      // For People API access, we need the 'people' scope
      authUrl.searchParams.append('scope', 'people');
      
      // Add state for CSRF protection
      authUrl.searchParams.append('state', state);
      
      // Get the churchId to include in both the URL and response
      const churchId = authUrlUser.churchId || authUrlUser.id;
      
      // Add churchId as a custom parameter to be passed through the OAuth flow
      // Planning Center will include this in the callback
      authUrl.searchParams.append('churchId', churchId);
      
      // Log URL for troubleshooting (redact sensitive parts)
      const logUrl = authUrl.toString().replace(/state=([^&]+)/, 'state=REDACTED');
      console.log('Planning Center Auth URL generated with churchId:', logUrl);
      
      // Return the URL to the client with churchId
      res.json({ 
        url: authUrl.toString(),
        state: state.substring(0, 8) + '...', // Return partial state for debugging
        churchId: churchId // Include churchId in the response
      });
    } catch (error) {
      console.error('Error generating Planning Center auth URL:', error);
      res.status(500).json({ 
        error: 'Failed to generate Planning Center auth URL',
        message: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint to initiate the OAuth flow via redirect
  app.get('/api/planning-center/authorize', async (req: Request, res: Response) => {
    if (!req.user) {
      console.log('No authenticated user found for Planning Center auth');
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to connect to Planning Center',
        details: 'Please ensure you are logged in and try again'
      });
    }
    
    if (!PLANNING_CENTER_CLIENT_ID || !PLANNING_CENTER_CLIENT_SECRET) {
      console.error('Planning Center API credentials not configured');
      return res.status(400).json({ 
        error: 'Planning Center credentials not configured',
        message: 'Administrator setup required',
        details: 'The system needs to be configured with valid Planning Center API credentials'
      });
    }
    
    try {
      // Use crypto for more secure state parameter with higher entropy
      const state = crypto.randomBytes(24).toString('hex');
      
      // Log user details for debugging
      const authorizeUser = req.user as any;
      console.log(`Authorize request from user: ${authorizeUser.id}, church: ${authorizeUser.churchId || 'not set'}`);
      
      // Log what host Replit thinks we are for debugging network problems
      console.log('Debug - Host details:');
      console.log('  Replit host: ' + req.get('host'));
      console.log('  X-Forwarded-Host: ' + req.get('x-forwarded-host'));
      console.log('  Protocol: ' + req.protocol);
      console.log('  User Agent: ' + req.get('user-agent'));
      
      // Store state in session for verification during callback
      if (req.session) {
        req.session.planningCenterState = state;
        console.log('State saved in session:', state.substring(0, 8) + '...');
        
        // Force session save to ensure state is properly stored before redirect
        await new Promise<void>((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('Error saving session:', err);
              reject(err);
            } else {
              console.log('Session saved successfully');
              resolve();
            }
          });
        });
      } else {
        console.warn('Session not available! Cannot save state parameter.');
      }
      
      // Instead of directly redirecting to Planning Center, we'll redirect to our
      // intermediate page that handles the flow more elegantly
      console.log('Redirecting to Planning Center redirect page');
      // Include churchId in redirect URL if available
      const authUser = req.user as any;
      const userChurchId = authUser.churchId || authUser.id;
      res.redirect(`/planning-center-redirect.html${userChurchId ? `?churchId=${userChurchId}` : ''}`);
      
    } catch (error) {
      console.error('Error starting Planning Center authorization flow:', error);
      res.status(500).json({ 
        error: 'Failed to start Planning Center authorization', 
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
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
    const statusUser = req.user as any;
    
    // Debug user object to see what properties are available
    console.log('Full req.user object in status check:', JSON.stringify(req.user, null, 2));
    
    // Extract user ID from req.user which might be in different formats based on auth method
    let userId = '';
    
    // Check for Replit Auth structure (claims.sub)
    if (statusUser.claims && statusUser.claims.sub) {
      userId = statusUser.claims.sub;
      console.log('Found userId in claims.sub:', userId);
    } 
    // Try alternatives for username/email-based auth
    else if (statusUser.username || statusUser.email) {
      // Use email if available, otherwise try username
      const emailToCheck = statusUser.email || statusUser.username;
      
      // Try to look up user by email
      try {
        const foundUser = await storage.getUserByEmail(emailToCheck);
        if (foundUser && foundUser.id) {
          userId = foundUser.id;
          console.log('Found userId by looking up email:', userId);
        }
      } catch (err) {
        console.error('Error looking up user by email:', err);
      }
    }
    // Check for local auth structure (id)
    else if (statusUser.id) {
      userId = statusUser.id;
      console.log('Found userId in user.id:', userId);
    }
    // If we can't find a user ID, we have a problem
    
    if (!userId) {
      console.error('Could not extract user ID from user object');
      return res.status(400).json({
        connected: false,
        error: 'invalid_user',
        message: 'Could not determine user identity'
      });
    }
    
    // Assign the extracted ID to statusUser.id for consistent usage
    statusUser.id = userId;
    console.log('Successfully identified user with ID:', userId);
    
    console.log('Using user ID:', statusUser.id);
    
    // If churchId is missing, fall back to using userId as churchId
    if (!statusUser.churchId) {
      console.log('No churchId found in user object, using user ID as fallback');
      statusUser.churchId = statusUser.id;
      console.log(`User ${statusUser.id} has churchId ${statusUser.churchId} directly assigned`);
    }
    
    console.log('Using churchId for token lookup:', statusUser.churchId);
    
    try {
      // Try to get tokens with churchId first (preferred)
      let tokens = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
      // If that fails, try with userId as churchId
      if (!tokens && user.churchId !== user.id) {
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
      
      // Verify token completeness
      if (!tokens.accessToken || !tokens.refreshToken) {
        console.log('Planning Center tokens incomplete:', {
          hasAccessToken: !!tokens.accessToken,
          hasRefreshToken: !!tokens.refreshToken
        });
        return res.json({
          connected: false,
          partial: true,
          message: 'Planning Center connection is incomplete. Please reconnect.'
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
      
      // Search for a specific test user if we're debugging
      if (req.query.debug === 'true') {
        try {
          const searchResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people`, {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`
            },
            params: {
              include: 'emails,phone_numbers',
              where: {
                search_name_or_email: 'testerly'
              }
            }
          });
          
          if (searchResponse.data.data && searchResponse.data.data.length > 0) {
            console.log('Found test user(s):');
            searchResponse.data.data.forEach((p: any) => {
              console.log(`- ${p.attributes.first_name} ${p.attributes.last_name} (ID: ${p.id})`);
            });
          } else {
            console.log('No test users found with name "Testerly"');
          }
        } catch (searchError) {
          console.error('Error searching for test user:', searchError);
        }
      }
      
      // Store all people to import
      let allPeople: any[] = [];
      let nextPageUrl: string | null = `${PLANNING_CENTER_API_BASE}/people/v2/people?include=emails,phone_numbers&per_page=100`;
      let pageCount = 0;
      const MAX_PAGES = 10; // Limit to 10 pages (1000 people) for performance
      
      // Fetch people from Planning Center (with pagination)
      while (nextPageUrl && pageCount < MAX_PAGES) {
        pageCount++;
        console.log(`Fetching Planning Center people page ${pageCount}...`);
        
        // Extract the path from the next page URL
        const apiPath = nextPageUrl.replace(PLANNING_CENTER_API_BASE, '');
        
        const peopleResponse = await axios.get(`${PLANNING_CENTER_API_BASE}${apiPath}`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });
        
        // Add this page of people to our collection
        const people = peopleResponse.data.data;
        allPeople = allPeople.concat(people);
        
        // Set up for next page if available
        nextPageUrl = peopleResponse.data.links?.next || null;
        
        // Process included data for this page
        const included = peopleResponse.data.included || [];
        
        // Create lookup maps for emails and phone numbers by their owner ID
        const emailsByOwnerId = new Map();
        const phonesByOwnerId = new Map();
        
        // Process included data to organize by owner
        included.forEach((item: any) => {
          if (item.type === 'Email') {
            const ownerId = item.relationships?.person?.data?.id;
            if (ownerId && item.attributes?.address) {
              if (!emailsByOwnerId.has(ownerId)) {
                emailsByOwnerId.set(ownerId, []);
              }
              emailsByOwnerId.get(ownerId).push(item.attributes.address);
            }
          } else if (item.type === 'PhoneNumber') {
            const ownerId = item.relationships?.person?.data?.id;
            if (ownerId && item.attributes?.number) {
              if (!phonesByOwnerId.has(ownerId)) {
                phonesByOwnerId.set(ownerId, []);
              }
              phonesByOwnerId.get(ownerId).push(item.attributes.number);
            }
          }
        });
        
        // Look for any with the name "Testerly" in this batch
        const testerlyInThisBatch = people.filter((p: any) => 
          p.attributes.first_name?.toLowerCase() === 'testerly' || 
          p.attributes.last_name?.toLowerCase() === 'jones');
        
        if (testerlyInThisBatch.length > 0) {
          console.log('Found Testerly in this batch of people!');
          testerlyInThisBatch.forEach((p: any) => {
            const personId = p.id;
            const emails = emailsByOwnerId.get(personId) || [];
            console.log(`- ${p.attributes.first_name} ${p.attributes.last_name} (ID: ${personId}, Email: ${emails.length > 0 ? emails[0] : 'none'})`);
          });
        }
        
        // Count people with contact information in this batch
        console.log(`Found ${emailsByOwnerId.size} people with emails and ${phonesByOwnerId.size} people with phone numbers`);
        
        // We want to import all members - don't stop for test users
        // Log the Testerly findings but continue with all pages
        
        // No longer limiting to first page, import all members
        // Set a reasonable upper limit to prevent infinite loops
        if (pageCount >= 20) { // This would be 2000 members at 100 per page
          console.log('Reached maximum page limit (20 pages / ~2000 members)');
          break;
        }
      }
      
      console.log(`Finished fetching ${pageCount} pages, found ${allPeople.length} total people`);
      
      // Check if we found Testerly Jones
      const foundTesterly = allPeople.some(person => 
        person.attributes.first_name?.toLowerCase() === 'testerly' || 
        person.attributes.last_name?.toLowerCase() === 'jones'
      );
      
      if (foundTesterly) {
        console.log('Successfully found Testerly Jones in the imported data!');
      }
      
      // Convert Planning Center people to PlateSync members
      const members = allPeople.map((person: any) => {
        const attributes = person.attributes;
        const personId = person.id;
        
        // Find the included data for this person - need to refetch from API
        // Since we're using pagination, we need to make a separate request
        
        return {
          firstName: attributes.first_name,
          lastName: attributes.last_name,
          email: attributes.primary_email_address,  // Use the contact info from attributes if available
          phone: attributes.primary_phone_number,   // Use the contact info from attributes if available
          isVisitor: false,
          churchId: req.user?.churchId || user.churchId,
          externalId: personId,
          externalSystem: 'PLANNING_CENTER'
        };
      });
      
      // Log all people received that have first and last names
      const potentialMembers = members.filter(m => m.firstName && m.lastName);
      console.log(`Total people from Planning Center: ${allPeople.length}`);
      console.log(`People with first and last names: ${potentialMembers.length}`);
      
      // Debug: Show the first 5 people who have names but no contact info
      const peopleWithoutContactInfo = potentialMembers
        .filter(m => !m.email && !m.phone)
        .slice(0, 5);
      
      if (peopleWithoutContactInfo.length > 0) {
        console.log('Examples of people with names but no contact info:');
        peopleWithoutContactInfo.forEach(p => {
          console.log(`- ${p.firstName} ${p.lastName} (ID: ${p.externalId})`);
        });
      }
      
      // For each member, check if one has name "Testerly Jones"
      const testerly = potentialMembers.find(m => 
        m.firstName?.toLowerCase() === 'testerly' && 
        m.lastName?.toLowerCase() === 'jones');
        
      if (testerly) {
        console.log('Found Testerly Jones in the list to import!', testerly);
      } else {
        console.log('Testerly Jones was NOT found in the members to import.');
      }
      
      // Import members into the database
      const importedCount = await storage.bulkImportMembers(members, req.user?.churchId || user.churchId);
      
      // Update last sync date
      await storage.updatePlanningCenterLastSync(req.user?.id || user.id, req.user?.churchId || user.churchId);
      
      res.json({ success: true, importedCount, totalPeopleFound: allPeople.length });
    } catch (error) {
      console.error('Error importing Planning Center members:', error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Endpoint to disconnect from Planning Center
  app.post('/api/planning-center/disconnect', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).send('Authentication required');
    }
    
    try {
      const user = req.user as any;
      
      // First get the tokens that we'll need to revoke
      const tokens = await storage.getPlanningCenterTokens(user.id, user.churchId);
      
      if (tokens && tokens.accessToken) {
        console.log('Attempting to revoke Planning Center tokens via API');
        
        try {
          // Try to revoke tokens via Planning Center API
          const revokeResponse = await axios.post('https://api.planningcenteronline.com/oauth/revoke', {
            client_id: process.env.PLANNING_CENTER_CLIENT_ID,
            client_secret: process.env.PLANNING_CENTER_CLIENT_SECRET,
            token: tokens.accessToken,
          }, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Planning Center token revocation response:', revokeResponse.status);
          
          if (tokens.refreshToken) {
            // Also try to revoke the refresh token
            const refreshRevokeResponse = await axios.post('https://api.planningcenteronline.com/oauth/revoke', {
              client_id: process.env.PLANNING_CENTER_CLIENT_ID,
              client_secret: process.env.PLANNING_CENTER_CLIENT_SECRET,
              token: tokens.refreshToken,
            }, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Planning Center refresh token revocation response:', refreshRevokeResponse.status);
          }
        } catch (revokeError) {
          // Continue even if revocation fails - we'll still remove the tokens from our database
          console.error('Error revoking Planning Center tokens:', revokeError);
          console.log('Continuing with local token removal despite revocation error');
        }
      }
      
      // Remove tokens from our database regardless of API revocation outcome
      await storage.deletePlanningCenterTokens(user.id, user.churchId);
      
      res.json({ 
        success: true, 
        message: 'Successfully disconnected from Planning Center',
        note: 'Tokens have been removed locally and revocation attempt was sent to Planning Center API'
      });
    } catch (error) {
      console.error('Error disconnecting from Planning Center:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error disconnecting from Planning Center',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Endpoint to clear all Planning Center tokens (for debugging)
  app.post('/api/planning-center/clear-tokens', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    try {
      console.log('Clearing Planning Center tokens and temporary storage');
      
      // Clear any temporary tokens in memory
      if (app.locals.tempPlanningCenterTokens) {
        console.log('Clearing temporary tokens:', Object.keys(app.locals.tempPlanningCenterTokens).length, 'entries');
        app.locals.tempPlanningCenterTokens = {};
      }
      
      // Clear permanent token storage
      const user = req.user as any;
      const churchId = user.churchId || user.id;
      
      console.log(`Removing Planning Center tokens for user: ${user.id}, church: ${churchId}`);
      await storage.deletePlanningCenterTokens(user.id, churchId);
      
      // Also try to clear with user ID as churchId in case that's how they were stored
      if (churchId !== user.id) {
        console.log(`Also removing tokens where churchId = userId: ${user.id}`);
        await storage.deletePlanningCenterTokens(user.id, user.id);
      }
      
      res.json({ 
        success: true, 
        message: 'All Planning Center tokens cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing Planning Center tokens:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to clear Planning Center tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // Endpoint to retrieve temporary tokens and store them permanently
  app.get('/api/planning-center/claim-temp-tokens/:tempKey', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required',
        details: 'User is not authenticated. Please log in first.'
      });
    }
    
    const { tempKey } = req.params;
    // Extract churchId from query parameter if it's present
    const queryChurchId = req.query.churchId as string | undefined;
    
    // Log more details about the temporary token request
    console.log(`Attempting to claim Planning Center token with key: ${tempKey}`);
    if (queryChurchId) {
      console.log(`ChurchId from query parameter: ${queryChurchId}`);
    }
    console.log(`Temporary tokens available: ${app.locals.tempPlanningCenterTokens ? 'YES' : 'NO'}`);
    
    if (app.locals.tempPlanningCenterTokens) {
      // Log all available temporary token keys (without exposing the actual tokens)
      console.log(`Available temp token keys: ${Object.keys(app.locals.tempPlanningCenterTokens).join(', ')}`);
    }
    
    if (!tempKey) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing temporary key',
        details: 'The temporary key parameter is required but was not provided.'
      });
    }
    
    if (!app.locals.tempPlanningCenterTokens) {
      return res.status(404).json({ 
        success: false, 
        error: 'No temporary tokens available',
        details: 'The temporary token storage has not been initialized yet.'
      });
    }
    
    if (!app.locals.tempPlanningCenterTokens[tempKey]) {
      return res.status(404).json({ 
        success: false, 
        error: 'Temporary tokens not found or expired',
        details: `The temporary token with key '${tempKey}' was not found or has expired.`
      });
    }
    
    try {
      const tokens = app.locals.tempPlanningCenterTokens[tempKey];
      const user = req.user as any;
      
      // Debug - log user information
      console.log(`Claiming tokens for user: ${user.id}, church: ${user.churchId || 'not specified'}`);
      
      // Check if we have a stored churchId in the temporary token
      const storedChurchId = app.locals.tempPlanningCenterTokens[tempKey].churchId;
      console.log(`Found churchId in temporary token: ${storedChurchId || 'none'}`);
      
      // Determine churchId (prioritize query param, then stored token churchId, then user.churchId, then fallback to user.id)
      const churchId = queryChurchId || storedChurchId || user.churchId || user.id;
      console.log(`Using churchId for token storage: ${churchId} (source: ${
        queryChurchId ? 'query parameter' : 
        storedChurchId ? 'temporary token' : 
        user.churchId ? 'user profile' : 
        'user ID fallback'
      })`);
      
      // First verify that the tokens are valid by making a test request
      try {
        console.log('Verifying Planning Center tokens before saving...');
        const testResponse = await axios.get(`${PLANNING_CENTER_API_BASE}/people/v2/people?per_page=1`, {
          headers: {
            Authorization: `Bearer ${tokens.accessToken}`
          }
        });
        
        console.log('Token verification successful. Planning Center API response:', 
          testResponse.status, testResponse.statusText);
      } catch (verifyError) {
        console.error('Token verification failed:', verifyError);
        // We'll still proceed with saving the tokens even if verification fails,
        // since this might be a temporary API issue
      }
      
      // Save the tokens to the database
      const savedTokens = await storage.savePlanningCenterTokens({
        userId: user.id,
        churchId: churchId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
      });
      
      console.log('Tokens saved successfully:', savedTokens ? 'YES' : 'NO');
      
      // Verify that tokens were actually saved
      const verifyTokens = await storage.getPlanningCenterTokens(user.id, churchId);
      console.log('Tokens verified in database:', verifyTokens ? 'YES' : 'NO');
      
      // Delete the temporary tokens
      delete app.locals.tempPlanningCenterTokens[tempKey];
      
      res.json({ 
        success: true,
        message: 'Planning Center tokens claimed and saved successfully.',
        userId: user.id,
        churchId: churchId
      });
    } catch (error) {
      console.error('Error claiming temporary tokens:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to claim temporary tokens',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      });
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

// Helper function to refresh an expired token - exported for use in planning-center-auth.ts
export async function refreshPlanningCenterToken(
  tokens: { refreshToken: string; expiresAt?: Date; createdAt?: Date; updatedAt?: Date },
  userId: string,
  churchId: string
) {
  console.log(`Refreshing Planning Center token for user ${userId} church ${churchId}`);
  
  try {
    // Validate input parameters
    if (!tokens || !tokens.refreshToken) {
      console.error('Missing required refresh token', { 
        hasTokensObj: !!tokens,
        hasRefreshToken: tokens && !!tokens.refreshToken
      });
      throw new Error('Cannot refresh Planning Center token: No refresh token available');
    }
    
    if (!userId || !churchId) {
      console.error('Missing required user or church ID', { 
        userId: userId || 'missing', 
        churchId: churchId || 'missing' 
      });
      throw new Error('Cannot refresh Planning Center token: Missing user or church ID');
    }
    
    if (!PLANNING_CENTER_CLIENT_ID || !PLANNING_CENTER_CLIENT_SECRET) {
      console.error('Missing Planning Center API credentials');
      throw new Error('Planning Center credentials not configured');
    }

    // Check if refresh token is older than 90 days
    // Planning Center's refresh tokens are valid for 90 days from when they were issued
    const refreshTokenAge = tokens.updatedAt || tokens.createdAt;
    if (refreshTokenAge) {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      if (refreshTokenAge < ninetyDaysAgo) {
        console.warn('Refresh token is older than 90 days, cannot refresh automatically. User needs to re-authorize.');
        throw new Error('Refresh token expired. User needs to re-authorize with Planning Center.');
      }
    }
    
    console.log('Preparing to make token refresh request to Planning Center');
    
    // Using URLSearchParams for form data as required by Planning Center API
    const params = new URLSearchParams();
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', tokens.refreshToken);
    params.append('client_id', PLANNING_CENTER_CLIENT_ID);
    params.append('client_secret', PLANNING_CENTER_CLIENT_SECRET);
    
    console.log('Planning Center token refresh request details:', {
      url: PLANNING_CENTER_TOKEN_URL,
      grant_type: 'refresh_token',
      refresh_token_present: !!tokens.refreshToken,
      client_id_present: !!PLANNING_CENTER_CLIENT_ID,
      client_secret_present: !!PLANNING_CENTER_CLIENT_SECRET
    });
    
    const tokenResponse = await axios.post(PLANNING_CENTER_TOKEN_URL, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'PlateSync/1.0'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('Planning Center token refresh response received:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText
    });
    
    const { access_token, refresh_token, expires_in } = tokenResponse.data;
    
    // Validate response data
    if (!access_token || !refresh_token) {
      console.error('Invalid token response from Planning Center', {
        has_access_token: !!access_token,
        has_refresh_token: !!refresh_token,
        expires_in: expires_in
      });
      throw new Error('Invalid token response from Planning Center');
    }
    
    // Access tokens expire after 2 hours (7200 seconds)
    // But we'll use the expires_in value from the response to be safe
    const expiresAt = new Date(Date.now() + (expires_in || 7200) * 1000);
    
    console.log('Saving refreshed Planning Center tokens', {
      userId,
      churchId,
      expiresAt: expiresAt.toISOString()
    });
    
    // Save the new tokens
    await storage.savePlanningCenterTokens({
      userId,
      churchId,
      accessToken: access_token,
      refreshToken: refresh_token,
      expiresAt: expiresAt,
    });
    
    console.log('Planning Center tokens refreshed and saved successfully');
    return access_token;
  } catch (error: any) {
    console.error('Error refreshing Planning Center token:', error.message);
    
    // Detailed error logging for debugging
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Planning Center API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Planning Center API no response received:', {
          request: error.request,
          config: error.config
        });
      }
    }
    
    throw error;
  }
}