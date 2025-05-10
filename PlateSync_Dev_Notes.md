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
   - Use a spawned tab approach (`target="_blank"`) for the initial authorization
   - Configure the correct callback URL in both the Planning Center application settings and in PlateSync's environment variables
   - Store the OAuth state parameter in the user session for security validation

2. **Implementation Details:**
   ```tsx
   // Example of correct implementation in React component
   <a
     href="/api/planning-center/authorize"
     target="_blank"
     rel="noopener noreferrer"
     className="inline-flex items-center justify-center rounded-md text-sm font-medium..."
   >
     <LinkIcon className="mr-2 h-4 w-4" />
     Connect to Planning Center
   </a>
   ```

3. **Flow Sequence:**
   - User clicks "Connect to Planning Center" which opens a new tab
   - The server generates a secure state parameter and stores it in the session
   - Planning Center displays the authorization screen to the user
   - Upon approval, Planning Center redirects to our callback URL with an authorization code
   - The server exchanges the code for access and refresh tokens
   - The server then redirects and closes the popup

### Token Management

Planning Center access tokens expire after 2 hours, while refresh tokens are valid for 90 days.

- **Token Storage:**
  - Store both access and refresh tokens securely in the database
  - Associate tokens with both user ID and church ID
  - Include expiration timestamp to know when to refresh

- **Token Refresh:**
  - Check token expiration before making API calls
  - Automatically refresh when tokens are expired
  - Handle refresh token failures gracefully with clear user feedback

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