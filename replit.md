# PlateSync - Church Donation Management System

## Overview

PlateSync is a comprehensive church donation management system built as a full-stack web application. The system enables churches to track donations, manage members, process donation batches, handle user accounts with role-based access control, and provides subscription management with trial periods. It features a multi-tenant architecture supporting multiple churches with individual data isolation and a global admin interface for system-wide management.

## System Architecture

### Technology Stack
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom JWT-based authentication with role-based access control
- **File Storage**: AWS S3 for logos and file uploads
- **Email**: SendGrid for email notifications and reports
- **Payment Processing**: Stripe integration for subscription management
- **Bundling**: Vite for development and build process

### Architecture Pattern
The application follows a traditional client-server architecture with clear separation between frontend and backend:

```
React Frontend ↔ Express API ↔ PostgreSQL Database
                     ↓
              External Services
              (SendGrid, AWS S3, Stripe, Planning Center)
```

## Key Components

### Frontend Architecture
- **Component Library**: Uses Shadcn UI built on Radix UI primitives
- **State Management**: React Query for server state, React hooks for local state
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **Styling**: Tailwind CSS with custom design system

### Backend Architecture
- **API Structure**: RESTful endpoints organized by feature domains
- **Middleware Stack**: Authentication, validation, file upload, role-based access
- **Database Layer**: Drizzle ORM with type-safe schema definitions
- **Service Layer**: Separate services for email, file storage, and external integrations

### Database Schema
The system uses a multi-tenant architecture with the following key entities:
- **Churches**: Main tenant entities with status management
- **Users**: Account owners, admins, and standard users with role-based permissions
- **Members**: Church member records with visitor tracking
- **Donations**: Individual donation entries linked to members and batches
- **Batches**: Collection periods for organizing donations
- **Subscriptions**: Trial and paid subscription management
- **System Configuration**: Global admin settings and integration credentials

## Data Flow

### Authentication Flow
1. Users authenticate via email/password or external OAuth
2. JWT tokens are issued with role and church information
3. Middleware validates tokens and enforces role-based access
4. Session management handles trial expiration and subscription status

### Donation Processing Flow
1. Users create donation batches for specific services/dates
2. Individual donations are added to batches with member associations
3. Batches can be attested by multiple users for verification
4. Completed batches generate reports and email notifications
5. Data is exported to PDF or Excel formats

### Multi-Tenant Data Isolation
- Each church operates as an isolated tenant
- User access is restricted to their assigned church data
- Global admins have cross-tenant access for system management
- Database queries include church-specific filtering

## External Dependencies

### Required Services
- **PostgreSQL Database**: Primary data storage
- **SendGrid**: Email delivery service for notifications and reports
- **AWS S3**: File storage for logos and uploaded assets
- **Stripe**: Payment processing for subscription management

### Optional Integrations
- **Planning Center**: Member data synchronization
- **Church management systems**: Via CSV import/export

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SENDGRID_API_KEY`: Email service authentication
- `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`: File storage
- `STRIPE_SECRET_KEY`: Payment processing
- `SESSION_SECRET`: JWT token signing key

## Deployment Strategy

### Development Environment
- Vite dev server for frontend with hot module replacement
- Express server with TypeScript compilation via tsx
- Database migrations managed through Drizzle Kit
- Environment-based configuration for services

### Production Build
- Frontend builds to static assets via Vite
- Backend compiles to optimized JavaScript bundle via esbuild
- Database migrations run automatically during deployment
- Service configurations loaded from environment variables

### Key Features
- **Trial Management**: 30-day trial periods with automatic expiration handling
- **Subscription Control**: Role-based access restrictions for expired accounts
- **File Upload**: Logo management with S3 storage and fallback
- **Email Templates**: Customizable email notifications with church branding
- **Data Export**: PDF and Excel report generation
- **Audit Trail**: Comprehensive logging for administrative actions

## Changelog
- July 01, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.