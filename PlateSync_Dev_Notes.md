# PlateSync Developer Notes

This document contains essential information for developers working on the PlateSync application. It serves as a reference for various workflows, integration details, and special handling required by the application.

## Table of Contents
1. [Planning Center Integration](#planning-center-integration)
   - [OAuth Authentication Flow](#oauth-authentication-flow)
   - [Token Management](#token-management)
   - [Troubleshooting](#troubleshooting-planning-center-integration)
2. [Authentication](#authentication)
3. [Database Structure](#database-structure)

---

## Planning Center Integration

PlateSync integrates with Planning Center Online (PCO) to import member data. The integration uses OAuth 2.0 for authentication and API access.

### OAuth Authentication Flow

The Planning Center integration requires careful handling of the OAuth flow:

1. **Essential Requirements:**
   - Use a spawned tab approach (`target="_blank"`) for desktop browsers
   - Use direct navigation for mobile browsers to avoid iframe issues
   - Include special OAuth parameters to force re-authentication when needed
   - Store a churchId parameter throughout the flow to maintain context
   - Configure the correct callback URL in both Planning Center application settings and PlateSync's environment variables
   - Store the OAuth state parameter in the user session for security validation

2. **Implementation Details:**
   ```tsx
   // Example of correct implementation with device detection
   const connectToPlanningCenter = async () => {
     // Detect device type
     const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
     
     // Get auth URL from server
     const response = await fetch('/api/planning-center/auth-url?device=' + 
       (isMobile ? 'mobile' : 'desktop'));
     const data = await response.json();
     
     if (isMobile) {
       // Mobile: use direct navigation
       window.location.href = data.url;
     } else {
       // Desktop: use spawned tab
       window.open(data.url, '_blank');
     }
   };
   ```

3. **Flow Sequence:**
   - User clicks "Connect to Planning Center"
   - Client detects device type and stores churchId in localStorage/sessionStorage
   - Server generates a secure OAuth URL with multiple parameters:
     - `prompt=login` to force login dialog
     - `max_age=0` to require fresh authentication
     - Unique `nonce` and timestamp to prevent caching
   - Planning Center displays the authorization screen
   - Upon approval, Planning Center redirects to our callback URL with code
   - The server exchanges the code for tokens
   - The callback page sends a message to the opener window (desktop) or redirects (mobile)

### Token Management

Planning Center access tokens expire after 2 hours, while refresh tokens are valid for 90 days.

- **Token Storage:**
  - Store both access and refresh tokens securely in the database
  - Associate tokens with both user ID and church ID
  - Include expiration timestamp to know when to refresh
  - Store churchId in multiple places for redundancy (URL parameters, session, localStorage)

- **Token Refresh:**
  - Check token expiration before making API calls
  - Automatically refresh when tokens are expired
  - Handle refresh token failures gracefully with clear user feedback
  
- **Token Revocation (Disconnect):**
  - Revoke both access token AND refresh token with Planning Center
  - Use proper OAuth token revocation format (application/x-www-form-urlencoded)
  - Include client_id, client_secret and token parameters in revocation request
  - Clean up all temporary and permanent token storage after revocation
  - Clear client-side storage (localStorage, sessionStorage) during disconnect
  - Implement a short delay (2 seconds) after disconnect before allowing reconnect

### Troubleshooting Planning Center Integration

If users experience issues with Planning Center integration, try the following:

1. **From PlateSync side:**
   - Use the "Disconnect" button to properly revoke tokens with Planning Center
   - Wait for the 2-second delay to complete before attempting to reconnect
   - Check server logs for OAuth flow issues or token revocation errors
   - Verify user permissions (must be ADMIN)

2. **From Planning Center side:**
   - If the connection appears stuck, go to Planning Center Online → Account Settings → Integrations → External Connections
   - Click "Disconnect" for PlateSync, then try connecting again
   - This forces Planning Center to treat it as a new authorization request
   
3. **Mobile Device Authentication Issues:**
   - Mobile browsers handle redirect flows differently than desktop browsers
   - If users see raw JSON or "Please wait..." messages:
     - They should use the "Continue to PlateSync" button on the redirect page
     - Check browser cache settings - try clearing browser cache if persistent
     - Try using different mobile browsers (Chrome works well)
   - Common mobile-specific issues:
     - Redirect flow gets stuck in a loop
     - Authorization completes but shows JSON response instead of redirecting
     - Auth flow appears successful but tokens aren't claimed properly
     - Authorization page displays but doesn't show as connected in settings
   - Our solution includes multiple fallback mechanisms:
     - Form-based redirects (more reliable than location.href on mobile)
     - Manual "Continue to PlateSync" button with timeout
     - Fetch API preloading to prime connections
     - URL/form parameter duplication for cache-busting
     - Redundant churchId storage in both localStorage and sessionStorage

4. **Technical Implementation Details:**
   - Device-specific handling is essential:
     - Desktop: Use spawned tab approach (`target="_blank"`) for authorization
     - Mobile: Use direct navigation to avoid iframe and window.open issues
   - OAuth token revocation must use proper form URL-encoded format
   - Include client_id AND client_secret when revoking tokens
   - Always check both client and server logs when debugging connection
   - Aggressive OAuth parameters used (prompt=login, max_age=0, nonce) to force re-authentication
   - 2-second delay implemented between disconnect and reconnect attempts
   - Multiple timestamp parameters added to beat aggressive mobile browser cachingissues

4. **Known Issues and Solutions:**
   - **Authentication Persistence**: Planning Center may maintain login session cookies across disconnects
     - Solution: Use `prompt=login`, `max_age=0` and `nonce` OAuth parameters to force re-authentication
   - **Mobile Browser Redirection**: Mobile browsers handle new windows/tabs differently
     - Solution: Detect mobile devices and use direct navigation instead of window.open
   - **Token Revocation Failures**: Incorrect format in revocation requests
     - Solution: Use form URL-encoded content type with all required parameters
   - **Lost Context Between Domains**: churchId may be lost during redirects
     - Solution: Store churchId in multiple places (URL, session, localStorage)

---

## Authentication

PlateSync implements multiple authentication methods:

1. **Replit Auth (OpenID Connect):** Primary authentication method for production
2. **Local Authentication:** For development and testing

User roles include:
- ADMIN: Full access to all features
- USHER: Limited access to donation counting features
- MASTER_ADMIN: Special role for church-wide settings

---

## Database Structure

PlateSync uses a PostgreSQL database with the following key tables:

- `users`: User accounts and authentication
- `members`: Church members who make donations
- `donations`: Individual donation records
- `batches`: Groups of donations collected during a service
- `planningCenterTokens`: Stores OAuth tokens for Planning Center integration

See `shared/schema.ts` for complete database schema definitions.

---

## Planning Center Mobile Authentication Flow

For a proper mobile authentication experience with Planning Center, the following workflow was implemented:

### Enhanced Device Detection and Context Persistence

1. **Dual Device Detection:**
   ```javascript
   // Client-side detection
   const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
   
   // Server-side detection (from response)
   const serverDetectedMobile = response.deviceType === 'mobile';
   
   // Final determination using both sources
   const finalIsMobile = isMobileUserAgent || serverDetectedMobile;
   ```

2. **Multiple Storage Mechanisms:**
   ```javascript
   // Store churchId in both localStorage and sessionStorage for redundancy
   localStorage.setItem('planningCenterChurchId', churchId);
   sessionStorage.setItem('planningCenterChurchId', churchId);
   
   // Store device type in session
   sessionStorage.setItem('planningCenterDeviceType', isMobile ? 'mobile' : 'desktop');
   
   // Add timestamp for cache-busting
   localStorage.setItem('planningCenterAuthTimestamp', Date.now().toString());
   ```

3. **Device-Specific Navigation:**
   ```javascript
   if (finalIsMobile) {
     // Mobile: Use form-based redirect with additional parameters
     // Form submission is more reliable than direct window.location on mobile
     const form = document.createElement('form');
     form.method = 'get';
     form.action = '/settings';
     // Add all parameters as hidden form fields
     // ...
     document.body.appendChild(form);
     form.submit();
   } else {
     // Desktop: Open in new tab with simpler parameters
     window.open(data.url, '_blank');
   }
   ```

### Preventing Cache Issues

1. **Multiple Cache-Busting Techniques:**
   ```javascript
   // Add timestamp parameter to URL
   redirectUrl += `&t=${Date.now()}`;
   
   // Add random cache-busting parameter for mobile
   redirectUrl += `&cachebust=${Math.floor(Math.random() * 1000000)}`;
   
   // Use different parameter names to avoid collisions
   const extraTimestamp = Date.now() + 1;
   redirectUrl += `&ts=${extraTimestamp}`;
   ```

2. **Explicit Cache Control Headers:**
   ```javascript
   // Server-side cache prevention headers
   res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
   res.setHeader('Pragma', 'no-cache');
   res.setHeader('Expires', '0');
   ```

### Advanced Mobile Flow

1. **Form-Based Redirection:**
   Instead of using `window.location.href` for redirection, we use a form submission approach which is more reliable on mobile devices:
   ```javascript
   // Create and submit a form
   const form = document.createElement('form');
   form.method = 'get';
   form.action = '/settings';
   
   // Add parameters as hidden form fields
   for (const [key, value] of urlParams.entries()) {
     const input = document.createElement('input');
     input.type = 'hidden';
     input.name = key;
     input.value = value;
     form.appendChild(input);
   }
   
   document.body.appendChild(form);
   form.submit();
   ```

2. **Fetch API Preloading:**
   ```javascript
   // "Prime" the connection using fetch API before actual navigation
   fetch(redirectUrl, { 
     method: 'GET',
     headers: { 'Cache-Control': 'no-cache' },
     mode: 'same-origin'
   }).then(() => {
     // Proceed with form redirect after fetch completes or fails
     // ...
   });
   ```

3. **Manual Fallback Button:**
   For cases where automatic redirection fails, we show a manual redirect button after a delay:
   ```javascript
   // Show manual redirect button after delay (shorter for advanced mobile flow)
   const buttonDelay = isAdvancedMobileFlow ? 2000 : 4000;
   setTimeout(() => {
     const button = document.getElementById('manualRedirectButton');
     button.style.display = 'block';
     
     // Make button more prominent for advanced mobile flow
     if (isAdvancedMobileFlow) {
       button.style.fontSize = '1.2rem';
       button.style.padding = '14px 28px';
       button.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
     }
   }, buttonDelay);
   ```

### Error Handling and Recovery

1. **Extended Token Claim Retries:**
   ```javascript
   // More retries for mobile devices with longer backoff
   const maxRetries = isMobile ? 5 : 3;
   let retries = 0;
   
   while (retries < maxRetries) {
     try {
       // Attempt the operation
       // ...
     } catch (error) {
       // Progressive backoff with longer delays for mobile
       const backoffTime = isMobile ? (1500 * retries) : (1000 * retries);
       await new Promise(resolve => setTimeout(resolve, backoffTime));
       retries++;
     }
   }
   ```

2. **Device-Specific Error Messages:**
   ```javascript
   // For mobile devices, add extra help text and longer toast duration
   if (isMobileDevice) {
     errorTitle = "Mobile Connection Failed";
     errorMessage += " Ensure you're using the same device throughout the process.";
     
     toast({
       title: errorTitle,
       description: errorMessage,
       variant: "destructive",
       duration: 8000, // Longer for mobile
     });
   }
   ```

3. **Storage Cleanup on Error:**
   ```javascript
   // Clear all Planning Center related items from storage on error
   if (isMobileDevice) {
     sessionStorage.removeItem('planningCenterDeviceType');
     sessionStorage.removeItem('planningCenterMobileDevice');
     localStorage.removeItem('planningCenterChurchId');
     sessionStorage.removeItem('planningCenterChurchId');
     localStorage.removeItem('planningCenterAuthTimestamp');
   }
   ```

*Last updated: May 10, 2025*