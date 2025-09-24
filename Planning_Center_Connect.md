# Planning Center OAuth Integration - Production Best Practices

## Overview
This guide documents the successful implementation of Planning Center OAuth in WordKEEP, specifically addressing the challenges of getting OAuth to work correctly in Replit's production environment.

## Critical Success Factors

### 1. Dynamic Callback URL Configuration
The most crucial aspect is correctly determining the callback URL based on the environment. Planning Center MUST redirect back to the exact URL you register with them.

```javascript
// server/planningCenter.ts
function getCallbackUrl() {
  // PRODUCTION: Check for explicit callback URL first
  if (process.env.PLANNING_CENTER_CALLBACK_URL) {
    // In production, if this is set and NOT a replit.dev URL, use it
    if (!process.env.PLANNING_CENTER_CALLBACK_URL.includes('replit.dev')) {
      console.log('[Planning Center] Using explicit callback URL from environment');
      return process.env.PLANNING_CENTER_CALLBACK_URL;
    }
  }

  // PRODUCTION: Default to custom domain
  if (process.env.NODE_ENV === 'production') {
    console.log('[Planning Center] Using PRODUCTION callback URL');
    return 'https://wordkeep.plainboxstudio.com/api/planning-center/callback';
  }

  // DEVELOPMENT: Use dev domain if available
  if (process.env.REPLIT_DEV_DOMAIN) {
    const callbackUrl = `https://${process.env.REPLIT_DEV_DOMAIN}/api/planning-center/callback`;
    console.log('[Planning Center] Using DEVELOPMENT callback URL');
    return callbackUrl;
  }

  // FALLBACK
  return 'http://localhost:5000/api/planning-center/callback';
}
```

### 2. Environment Variables Setup

#### Required in Replit Secrets:
```
PCO_CLIENT_ID=your_planning_center_app_id
PCO_CLIENT_SECRET=your_planning_center_secret
CUSTOM_DOMAIN=yourapp.yourdomain.com  # Optional but recommended
PLANNING_CENTER_CALLBACK_URL=https://yourapp.yourdomain.com/api/planning-center/callback  # Optional override
```

### 3. Trust Proxy Configuration (Critical for Replit)
Replit runs behind a proxy, so you MUST enable trust proxy in production:

```javascript
// server/index.ts
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);  // Trust first proxy (Replit's proxy)
  console.log('[Server] Trust proxy enabled for production');
}
```

### 4. Session Configuration for OAuth State
Proper session configuration is essential for OAuth state validation:

```javascript
// server/index.ts
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in production
    httpOnly: true,
    sameSite: 'lax',  // Important for OAuth redirects
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));
```

### 5. OAuth URL Generation with Cache Busting
Planning Center can cache OAuth sessions. Force re-authentication when needed:

```javascript
static generateAuthUrl(state: string, deviceType: 'mobile' | 'desktop'): string {
  const params = new URLSearchParams({
    client_id: PCO_CLIENT_ID,
    redirect_uri: PCO_REDIRECT_URI,
    response_type: 'code',
    scope: 'people groups',  // Your required scopes
    state,
    // IMPORTANT: Force re-authentication
    prompt: 'login',
    max_age: '0',
    // Add cache-busting parameters
    nonce: crypto.randomBytes(16).toString('hex'),
    timestamp: Date.now().toString(),
  });

  // Extra cache-busting for mobile
  if (deviceType === 'mobile') {
    params.append('cachebust', Math.floor(Math.random() * 1000000).toString());
  }

  return `https://api.planningcenteronline.com/oauth/authorize?${params.toString()}`;
}
```

### 6. Client-Side Implementation (Device-Aware)
Different devices need different OAuth flow approaches:

```typescript
// client/src/pages/Members.tsx
const connectToPlanningCenter = async () => {
  try {
    // Detect device type
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // Get auth URL from server with device type
    const response = await apiRequest('/api/planning-center/auth-url', {
      method: 'GET',
      params: { device: isMobile ? 'mobile' : 'desktop' }
    });

    if (!response.ok) {
      throw new Error('Failed to get authorization URL');
    }

    const data = await response.json();
    
    if (isMobile) {
      // Mobile: Use direct navigation (avoids iframe issues)
      window.location.href = data.url;
    } else {
      // Desktop: Open in new tab (better UX)
      const authWindow = window.open(data.url, '_blank');
      
      // Optional: Poll for completion
      const checkInterval = setInterval(() => {
        if (authWindow?.closed) {
          clearInterval(checkInterval);
          // Refresh your data
          window.location.reload();
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Failed to connect to Planning Center:', error);
  }
};
```

### 7. Callback Handler with Proper State Validation

```javascript
// server/routes.ts
app.get("/api/planning-center/callback", async (req, res) => {
  const { code, state } = req.query;
  
  // Validate state for CSRF protection
  const expectedState = req.session.planningCenterState;
  const churchId = req.session.planningCenterChurchId;
  
  if (!expectedState || state !== expectedState) {
    return res.status(400).send(`
      <html>
        <body>
          <h2>Authorization Failed</h2>
          <p>Invalid authorization state. Please try connecting again.</p>
          <script>
            setTimeout(() => {
              window.location.href = '/members';
            }, 3000);
          </script>
        </body>
      </html>
    `);
  }

  // Exchange code for tokens
  const tokens = await PlanningCenterService.exchangeCodeForTokens(code);
  
  // Store tokens in database
  // ... storage logic ...
  
  // Clear session state
  delete req.session.planningCenterState;
  delete req.session.planningCenterChurchId;
  
  // Return success page with auto-redirect
  res.send(`
    <html>
      <body>
        <h2>✓ Successfully Connected</h2>
        <p>Redirecting...</p>
        <script>
          // Close popup if we're in one
          if (window.opener) {
            window.opener.location.reload();
            window.close();
          } else {
            window.location.href = '/members';
          }
        </script>
      </body>
    </html>
  `);
});
```

## Common Production Issues & Solutions

### Issue 1: "Invalid redirect_uri" Error
**Cause:** The callback URL in your code doesn't match what's registered in Planning Center.

**Solution:**
1. Log into Planning Center API & Webhooks
2. Update your app's redirect URI to exactly match your production URL
3. Common format: `https://yourapp.yourdomain.com/api/planning-center/callback`

### Issue 2: OAuth State Mismatch
**Cause:** Session not persisting between auth request and callback.

**Solution:**
- Enable `trust proxy` in Express (critical for Replit)
- Ensure session cookie settings allow cross-site requests (`sameSite: 'lax'`)
- Store state in session before redirecting to Planning Center

### Issue 3: Tokens Not Persisting
**Cause:** Using ephemeral filesystem in production.

**Solution:**
- Store tokens in database, not filesystem
- Use environment variables for sensitive config
- Implement token refresh mechanism

### Issue 4: Mobile OAuth Failing
**Cause:** Mobile browsers handle popups/redirects differently.

**Solution:**
- Detect mobile devices and use direct navigation instead of popups
- Add extra cache-busting parameters for mobile
- Avoid iframes completely on mobile

## Testing Checklist

### Development Environment
- [ ] Callback URL uses `REPLIT_DEV_DOMAIN`
- [ ] Can complete OAuth flow
- [ ] State validation works
- [ ] Tokens are stored correctly

### Production Environment  
- [ ] Callback URL uses custom domain or production URL
- [ ] Trust proxy is enabled
- [ ] Session cookies work with HTTPS
- [ ] Mobile and desktop flows both work
- [ ] Tokens persist across deployments

## Quick Debugging Commands

```javascript
// Add these console.logs to debug issues:

// In getCallbackUrl():
console.log('[Planning Center] Callback URL:', PCO_REDIRECT_URI);
console.log('[Planning Center] Environment:', process.env.NODE_ENV);
console.log('[Planning Center] Custom Domain:', process.env.CUSTOM_DOMAIN);

// In generateAuthUrl():
console.log('[Planning Center] Auth URL generated:', authUrl);
console.log('[Planning Center] State:', state);

// In callback handler:
console.log('[Planning Center] Callback received');
console.log('[Planning Center] Session state:', req.session.planningCenterState);
console.log('[Planning Center] Received state:', state);
console.log('[Planning Center] Code:', code ? 'present' : 'missing');
```

## Summary

The key to successful Planning Center OAuth in production on Replit is:

1. **Dynamic callback URL configuration** that adapts to environment
2. **Trust proxy enabled** for Replit's infrastructure  
3. **Proper session configuration** for state persistence
4. **Device-aware client implementation** (mobile vs desktop)
5. **Database storage** for tokens (not filesystem)
6. **Comprehensive logging** for debugging

Follow these patterns and you'll have a working Planning Center integration in production!