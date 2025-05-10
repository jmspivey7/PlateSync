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
   - Use the "Clear Planning Center Connection" button to remove tokens from PlateSync
   - Check server logs for OAuth flow issues or API errors
   - Verify user permissions (must be ADMIN)

2. **From Planning Center side:**
   - If the connection appears stuck, go to Planning Center Online → Account Settings → Integrations → External Connections
   - Click "Disconnect" for PlateSync, then try connecting again
   - This forces Planning Center to treat it as a new authorization request
   
3. **Important Notes:**
   - The spawned tab approach is necessary due to how Planning Center handles OAuth redirects
   - Direct navigation doesn't work due to cross-origin restrictions
   - Always check both client and server logs when debugging connection issues

4. **Known Issues:**
   - If a user sees "Connection Partial" error, it typically means tokens were created but not properly stored or verified
   - "Refused to connect" errors typically indicate cross-origin or networking issues with Planning Center's domains

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

*Last updated: May 10, 2025*