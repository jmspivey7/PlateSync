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

- July 02, 2025. **CRITICAL SECURITY FIX**: Fixed SQL injection vulnerability in global admin church purge endpoint (lines 387-389). Replaced vulnerable raw SQL with parameterized Drizzle queries.
- July 02, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.