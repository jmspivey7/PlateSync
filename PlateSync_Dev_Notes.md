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
- ACCOUNT_OWNER: Special role for the main administrator of a church account
- STANDARD_USER: Basic user with limited permissions based on assigned church
- GLOBAL_ADMIN: Super-admin role with access to the entire system

---

## User Management

PlateSync provides a comprehensive user management system for adding and managing users. The process includes email verification and password setup.

### Adding New Users

1. **User Addition Flow:**
   - Navigate to the User Management screen
   - Click "Add User" button
   - Fill in required fields: First Name, Last Name, Email, and Role
   - System sends a welcome email with verification link
   - User clicks the verification link to set up their password
   - User can then log in with their email and password

2. **Welcome Email Process:**
   - System uses the configured email template from the database
   - Email includes dynamic variables:
     - `{{firstName}}`: User's first name
     - `{{lastName}}`: User's last name
     - `{{role}}`: User's role (formatted for readability, e.g., "Standard User")
     - `{{verificationLink}}`: Link to verify email and set password
     - `{{churchName}}`: Church organization name

3. **Implementation Details:**
   - Welcome emails are sent using SendGrid API
   - Verification tokens expire after 48 hours (configurable)
   - Password requirements include minimum 8-character length
   - Passwords are securely hashed using scrypt before storage

### Email Verification and Password Setup

1. **Verification Process:**
   - User receives email with verification link
   - Link format: `/verify?token=<verification_token>`
   - User sets a password (minimum 8 characters)
   - System validates the token and updates user record
   - User is marked as verified in the database

2. **Technical Implementation:**
   ```typescript
   // Sample verification endpoint implementation
   app.post('/api/auth/verify-email', async (req, res) => {
     const { token, password } = req.body;
     
     // Basic validation
     if (!token || !password) {
       return res.status(400).json({ message: "Token and password are required" });
     }
     
     try {
       // Find user with this token
       const user = await findUserByResetToken(token);
       
       // Validate token and password
       if (!user || user.passwordResetExpires < new Date()) {
         return res.status(400).json({ message: "Invalid or expired token" });
       }
       
       // Validate password strength
       if (password.length < 8) {
         return res.status(400).json({ message: "Password must be at least 8 characters long" });
       }
       
       // Update user record
       await updateUserVerification(user.id, password);
       
       return res.status(200).json({ message: "Email verified and password set successfully" });
     } catch (error) {
       console.error("Error during verification:", error);
       return res.status(500).json({ message: "An error occurred while verifying your email" });
     }
   });
   ```

3. **Troubleshooting:**
   - If users don't receive verification emails, check:
     - Spam/junk folders
     - Correct email address in the system
     - SendGrid API configuration and limits
   - If verification fails, check:
     - Token expiration (default 48 hours)
     - Password requirements (minimum 8 characters)
     - Database connection and update permissions

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

## Church Logo Management

Proper handling of church logos is essential to ensure all users within a church organization see the same branding.

### Logo Storage and Synchronization

1. **Dual Storage Strategy:**
   - **Local Storage:** Church logos are stored in the `/public/logos` directory on the server filesystem
   - **Cloud Storage:** Logos are also uploaded to AWS S3 bucket (`repl-plates-image-repo`) for reliable email delivery
   - **Database Reference:** The relative path to the logo (e.g., `/logos/church-logo-123456789.png`) is stored in the `church_logo_url` column in the `users` table
   - **Consistency:** Every user associated with a church must have the same logo URL in their user record

2. **Logo Upload and Storage Flow:**
   - When an Account Owner uploads a new church logo:
     - Logo is saved locally to `/public/logos/{timestamp}-{random}.png`
     - Same logo is uploaded to AWS S3 bucket with a matching key
     - The logo URL in the database uses a relative path (`/logos/filename.png`) for web display
     - S3 URL is used for email templates to ensure consistent display across email clients
     - The same logo URL is propagated to all users with the same `church_id`

3. **S3 Integration Details:**
   - AWS Region is automatically extracted from environment variables
   - S3 bucket name is defined in AWS_S3_BUCKET environment variable
   - S3 keys follow the same naming convention as local files for consistency
   - S3 service provides fallback to local URL if S3 upload fails

4. **Implementation Details:**
   ```sql
   -- SQL query to synchronize logo URL across all users in a church
   UPDATE users 
   SET church_logo_url = '/logos/church-logo-example.png' 
   WHERE church_id = '12345';
   ```

5. **Display Optimization:**
   - **Cache Busting:** Logo URLs include timestamp query parameters to prevent browser caching issues
   - **Error Handling:** Robust error handling for logo loading failures with clean fallback to church name
   - **Relative Paths:** Web app displays use relative paths for more reliable internal routing
   - **Absolute URLs:** Email templates use S3 URLs for better cross-client compatibility

6. **Common Issues and Solutions:**
   - **Issue:** Logo appears for Account Owner but not for other users
     - **Solution:** Ensure the logo URL is copied to all users with the same `church_id`
   - **Issue:** Logo disappears after user profile updates
     - **Solution:** Preserve the `church_logo_url` field during any user record updates
   - **Issue:** Different users see different logos
     - **Solution:** Run a synchronization query to update all users in the church
   - **Issue:** Logo appears in web app but not in emails
     - **Solution:** Verify S3 upload was successful and ONLY the S3 URL is being used in email templates
     - **Critical:** Emails must exclusively use S3 URLs for logos (not Replit domain URLs)
   - **Issue:** Logo fails to load in certain browsers
     - **Solution:** Use cache-busting query parameters and check image content type headers

7. **Technical Implementation:**
   - The SharedNavigation component uses cache-busting query parameters to display the current logo
   - The s3.ts service handles upload to AWS with proper error handling and region configuration
   - The settingsRoutes.ts handles the multi-destination storage approach
   - The sendgrid.ts email service prioritizes S3 URLs for reliable email image display

8. **Email Logo URL Guidelines (CRITICAL):**
   - **NEVER use Replit domain URLs in emails** - they will not display properly in most email clients
   - **ALWAYS use AWS S3 URLs for any images in email templates** - this is non-negotiable for reliable delivery
   - The correct URL format is: `https://{AWS_S3_BUCKET}.s3.amazonaws.com/logos/{filename}.png`
   - Features to maintain email logo integrity:
     - Strict validation of logo URLs before including in emails (must contain 's3.amazonaws.com')
     - Direct database querying for logo URLs to bypass any code-level URL rewriting
     - Clear fallback to text-only display if valid S3 URL isn't available
     - Database logo URLs should already contain absolute S3 URLs - never try to rewrite them
   - Code locations to check if logo issues recur:
     - server/sendgrid.ts: Contains email generation with logo URL handling
     - server/index.ts: Defines base URL used for database migrations
     - server/storage.ts: Contains critical email template generation code
     - server/upload-platesync-logo.ts: Updates image URLs in email templates

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

## Profile Image Upload Implementation

PlateSync implements a file-based profile image system using the following best practices:

### Server-Side Implementation

1. **Storage Configuration:**
   - Store profile images in the `public/avatars` directory with public access
   - Use timestamp-based unique filenames to prevent collisions
   - Clean up old profile images when users upload new ones

2. **Route Structure:**
   - Dedicated routes for both regular and global admin profiles
   - Proper middleware for file handling and validation
   - Example implementation:

   ```javascript
   // Example file upload middleware configuration
   const upload = multer({
     storage: multer.diskStorage({
       destination: (req, file, cb) => {
         const avatarsDir = path.join(process.cwd(), 'public/avatars');
         // Ensure directory exists
         if (!fs.existsSync(avatarsDir)) {
           fs.mkdirSync(avatarsDir, { recursive: true, mode: 0o777 });
         }
         cb(null, avatarsDir);
       },
       filename: (req, file, cb) => {
         // Generate unique filename using timestamp and original extension
         const timestamp = Date.now();
         const fileExtension = file.originalname.split('.').pop();
         const uniqueFilename = `avatar-${timestamp}-${Math.floor(Math.random() * 1000000000)}.${fileExtension}`;
         cb(null, uniqueFilename);
       }
     }),
     limits: {
       fileSize: 5 * 1024 * 1024 // Limit to 5MB
     },
     fileFilter: (req, file, cb) => {
       // Only allow images
       if (!file.mimetype.startsWith('image/')) {
         return cb(new Error('Only image files are allowed'));
       }
       cb(null, true);
     }
   });
   ```

3. **Image Processing:**
   - Return relative URL paths to keep URLs consistent across environments
   - Cleanup old images when users upload new ones
   - Example code for returning profile image data:

   ```javascript
   // Example route handler for profile image upload
   app.post('/api/profile/avatar', upload.single('avatar'), async (req, res) => {
     try {
       // Validation
       if (!req.file) {
         return res.status(400).json({ success: false, message: 'No file uploaded' });
       }
       
       // Generate relative path to file
       const relativeFilePath = `/avatars/${req.file.filename}`;
       
       // Generate full URL for client convenience
       const fullUrl = `${req.protocol}://${req.get('host')}${relativeFilePath}`;
       
       // Save the profile image URL to user's profile in database
       // ... Database code here ...
       
       // Get old profile image path to delete it
       const oldImagePath = user.profileImageUrl;
       if (oldImagePath) {
         const oldImageFullPath = path.join(process.cwd(), 'public', oldImagePath);
         // Delete old profile image if it exists
         if (fs.existsSync(oldImageFullPath)) {
           fs.unlinkSync(oldImageFullPath);
           console.log('Deleted old profile image:', oldImageFullPath);
         }
       }
       
       // Return success with both relative and full URLs
       return res.json({
         success: true,
         message: 'Profile picture updated successfully',
         profileImageUrl: relativeFilePath,
         fullImageUrl: fullUrl
       });
     } catch (error) {
       console.error('Error uploading profile image:', error);
       return res.status(500).json({
         success: false,
         message: 'Failed to update profile picture'
       });
     }
   });
   ```

### Client-Side Implementation

1. **Image Upload:**
   - Use a file input with proper MIME type validation
   - Implement size constraints (5MB limit)
   - Hide the actual file input and use a button to trigger it
   - Example:

   ```tsx
   // Create hidden file input with ref
   const fileInputRef = useRef<HTMLInputElement>(null);
   
   // Trigger file input click
   const triggerFileInput = () => {
     fileInputRef.current?.click();
   };
   
   // Handle file selection and validation
   const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     const file = event.target.files?.[0];
     if (!file) return;
     
     // Validate file type
     if (!file.type.startsWith('image/')) {
       toast({
         title: 'Error',
         description: 'Please upload an image file',
         variant: 'destructive',
       });
       return;
     }
     
     // Validate file size
     if (file.size > 5 * 1024 * 1024) {
       toast({
         title: 'Error',
         description: 'Image file size must be less than 5MB',
         variant: 'destructive',
       });
       return;
     }
     
     // Upload the file
     uploadAvatarMutation.mutate(file);
     
     // Reset input for reuse
     event.target.value = '';
   };
   ```

2. **Upload Handling with FormData:**
   - Use FormData for multipart/form-data uploads
   - Add proper authentication tokens if needed
   - Example implementation with React Query:

   ```tsx
   // Upload avatar mutation
   const uploadAvatarMutation = useMutation({
     mutationFn: async (file: File) => {
       setIsUploading(true);
       
       const formData = new FormData();
       formData.append('avatar', file);
       
       // Get authentication token if needed
       const token = localStorage.getItem("authToken");
       
       // Use fetch with proper headers
       const response = await fetch('/api/profile/avatar', {
         method: 'POST',
         headers: {
           'Authorization': token ? `Bearer ${token}` : '',
           'Cache-Control': 'no-cache'
         },
         body: formData
       });
       
       if (!response.ok) {
         throw new Error("Failed to upload profile picture");
       }
       
       return await response.json();
     },
     onSuccess: (data) => {
       // Update profile data with new image URL
       setProfileData(prev => ({
         ...prev,
         profileImageUrl: data.profileImageUrl
       }));
       
       toast({
         title: 'Success',
         description: 'Profile picture updated successfully',
       });
     },
     onError: (error) => {
       toast({
         title: 'Error',
         description: error.message || 'Failed to update profile picture',
         variant: 'destructive',
       });
     },
     onSettled: () => {
       setIsUploading(false);
     }
   });
   ```

3. **Image Display with Cache Busting:**
   - Use cache-busting technique to prevent stale images
   - Implement fallback for failed image loads
   - Example:

   ```tsx
   <Avatar className="w-24 h-24">
     {profileData.profileImageUrl ? (
       <AvatarImage 
         src={`${profileData.profileImageUrl}?t=${Date.now()}`} 
         alt="Profile" 
         onError={(e) => {
           console.error("Image failed to load:", profileData.profileImageUrl);
           // Force fallback if image fails to load
           (e.target as HTMLImageElement).style.display = 'none';
         }}
       />
     ) : (
       <AvatarFallback className="bg-primary text-white text-xl">
         {profileData.firstName && profileData.lastName 
           ? `${profileData.firstName[0]}${profileData.lastName[0]}`
           : "U"}
       </AvatarFallback>
     )}
   </Avatar>
   ```

### Important Considerations

1. **Folder Permissions:**
   - The `public/avatars` directory must have write permissions for the server (777)
   - Add this directory to version control but ignore its contents

2. **Cache-Busting:**
   - Always add a timestamp query parameter to image URLs
   - Update image URLs in state with the timestamp to force re-render

3. **Error Handling:**
   - Provide fallback display when images fail to load
   - Check for file existence before deletion to prevent errors

4. **Static File Serving:**
   - Ensure Express is configured to serve static files from the public directory:
   ```javascript
   app.use(express.static(path.join(__dirname, '..', 'public')));
   ```

5. **Storage Choice:**
   - For production, consider using cloud storage (AWS S3, etc.)
   - For development and smaller deployments, file-based storage is simpler

*Last updated: May 17, 2025*