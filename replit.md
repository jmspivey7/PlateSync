# PlateSync - Church Donation Management System

## Overview

PlateSync is a comprehensive full-stack web application designed to manage church donation collections and member management. The system provides features for tracking donations, managing members, processing donation batches, generating reports, and handling subscription management with trial periods.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based authentication
- **File Storage**: AWS S3 for logos and avatars, local filesystem fallback
- **Email**: SendGrid for transactional emails
- **Payment Processing**: Stripe for subscription management
- **Build Tool**: Vite for frontend bundling

### Application Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend application
├── shared/          # Shared TypeScript schemas and types
├── public/          # Static assets (logos, avatars, templates)
├── migrations/      # Database migration files
└── database_backups/ # PostgreSQL backup files
```

## Key Components

### Frontend Architecture
- **Component Library**: Shadcn UI built on Radix UI primitives
- **State Management**: React Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design tokens

### Backend Architecture
- **API Routes**: RESTful endpoints organized by feature domains
- **Database Layer**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- **Middleware**: Authentication, role-based access control, file upload handling
- **Services**: Email notifications, PDF generation, S3 file storage

### Database Schema
- **Multi-tenant Architecture**: Churches as primary tenant boundary
- **User Management**: Role-based access (Account Owner, Admin, Standard User, Global Admin)
- **Donation Tracking**: Batches, donations, members with full audit trail
- **Subscription Management**: Trial periods, Stripe integration

## Data Flow

### Authentication Flow
1. Users authenticate via local login or third-party integrations
2. Sessions managed via express-session with PostgreSQL store
3. Role-based middleware protects routes based on user permissions
4. Trial expiration middleware redirects expired Account Owners

### Donation Management Flow
1. Create donation batches for specific services/dates
2. Add individual donations linked to church members
3. Generate count reports with attestation workflow
4. Email reports to configured recipients
5. Export data in various formats (PDF, Excel)

### File Upload Flow
1. Files uploaded to local filesystem initially
2. Async upload to S3 for permanent storage
3. Database stores S3 URLs for email template compatibility
4. Fallback to local URLs when S3 unavailable

## External Dependencies

### Required Integrations
- **Database**: PostgreSQL (via DATABASE_URL)
- **Email Service**: SendGrid (SENDGRID_API_KEY, SENDGRID_FROM_EMAIL)
- **Payment Processing**: Stripe (STRIPE_SECRET_KEY)
- **File Storage**: AWS S3 (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET)

### Optional Integrations
- **Planning Center**: OAuth integration for member import
- **Custom SMTP**: Alternative email configuration

### Environment Variables
```
DATABASE_URL=postgresql://...
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@platesync.com
STRIPE_SECRET_KEY=sk_...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
SESSION_SECRET=...
PLANNING_CENTER_CLIENT_ID=...
PLANNING_CENTER_CLIENT_SECRET=...
```

## Deployment Strategy

### Production Setup
- **Build Process**: `npm run build` creates optimized production bundle
- **Database Migrations**: `npm run db:push` applies schema changes
- **Static Assets**: Served via Express with proper caching headers
- **File Permissions**: Logos and avatars directories require write access

### Development Workflow
- **Hot Reload**: Vite dev server with HMR for frontend development
- **Database**: Uses same PostgreSQL instance as production
- **Authentication Bypass**: Development mode bypasses for testing

### File Storage Architecture
- **Local Development**: Files stored in `public/logos` and `public/avatars`
- **Production**: Files uploaded to S3 with local filesystem as fallback
- **URL Strategy**: Database stores full S3 URLs for email compatibility

## Changelog

- September 28, 2025. **CRITICAL EMAIL NOTIFICATION BUG FIX**: Fixed critical bug where donation receipt emails were sent despite Email Notifications being set to OFF. Changes:
  1. **Email Setting Check**: Added emailNotificationsEnabled check in sendDonationNotification() function before sending any emails
  2. **Database Fix**: Fixed updateChurchEmailNotificationSetting() to update users table instead of non-existent churches.emailNotificationsEnabled field
  3. **Fail-Safe Behavior**: System now fails closed - if unable to check email settings, no emails are sent to prevent unwanted notifications
  4. **Proper Toggle Persistence**: Email notification toggle in settings now correctly updates the users table and persists the preference
  This ensures donation receipts and other notifications fully respect the user's email preference settings.
- September 25, 2025. **CRITICAL PLANNING CENTER OAUTH SECURITY FIX (PART 2)**: Completed comprehensive security fix for IDOR vulnerability across all Planning Center endpoints. Changes:
  1. **Complete IDOR Protection**: Fixed all Planning Center endpoints to ONLY use churchId from authenticated session, preventing cross-church data access
  2. **Frontend Security**: Removed all churchId query parameters from frontend API calls  
  3. **Backend Enforcement**: All endpoints (/auth-url, /authorize, /status) now enforce strict session-based churchId validation
  4. **Token Reuse Removed**: Eliminated all token sharing between churches - each church must authenticate separately
  5. **OAuth Flow Security**: Added CSRF protection with state parameter validation throughout OAuth flow
  6. **Audit Logging**: Added security warnings when churchId is attempted in query parameters (potential attacks)
  7. **Bug Fixes**: Fixed undefined variable errors in auth-url endpoint
  This completes the critical security fix ensuring complete church data isolation and proper OAuth authentication.
- September 24, 2025. **GLOBAL ADMIN EMAIL TEMPLATE FIX**: Fixed "Template not found" issue in Global Admin portal by updating storage layer to include all three system templates (IDs 30, 31, 32) instead of just 30 and 31. The getEmailTemplates() method in server/storage.ts now properly returns EMAIL_VERIFICATION template (ID 32) along with WELCOME_EMAIL (ID 30) and PASSWORD_RESET (ID 31) templates.
- January 03, 2025. **BRAND & DESIGN UPDATE**: Comprehensive rebranding and design refresh:
  1. **Brand Name Update**: Changed from "PlateSync" to "PlateSYNQ" across all user-facing interfaces
  2. **Color Scheme Transformation**: Complete update from green (#69ad4c) to red (#d35f5f) primary color
  3. **UI Consistency**: Updated all components including buttons, icons, headers, tabs, and forms to use the new red color scheme
  4. **Chart Updates**: Modified donation charts to use green for cash visualization and red for checks
  5. **Global Admin Portal**: Updated all admin interfaces to match the new brand identity
- July 02, 2025. **CRITICAL SECURITY FIX #2**: Fixed severe SQL injection vulnerability in purge onboarding endpoint (lines 311-313). Replaced all vulnerable string concatenation SQL queries with parameterized Drizzle queries using sql template literals. Added input validation for church ID parameter.
- July 02, 2025. **SECURITY ENHANCEMENTS**: Completed comprehensive security audit with three high-priority updates:
  1. **File Upload Security**: Enhanced validation for avatars and logos with MIME type checking, file extension verification, malicious filename detection, and size limits across multiple upload endpoints
  2. **Input Validation**: Implemented comprehensive validation for form inputs, recipient data, and user-submitted content with XSS protection and data sanitization
  3. **URL Parameter Validation**: Added security validation for Planning Center OAuth endpoints to prevent injection attacks and ensure parameter integrity
  All changes maintain backward compatibility while significantly improving security posture.
- July 02, 2025. **CRITICAL SECURITY FIX**: Fixed SQL injection vulnerability in global admin church purge endpoint (lines 387-389). Replaced vulnerable raw SQL with parameterized Drizzle queries.
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.