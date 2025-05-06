# PlateSync Architecture

## Overview

PlateSync is a full-stack web application designed to manage church donation collections. The application allows churches to track donations, manage members, process donation batches, and generate reports. It follows a client-server architecture with a React frontend and Node.js Express backend.

The system provides features for:
- User authentication and role-based access control
- Member management
- Donation tracking and batch processing
- Service type configuration
- Email notifications and reports
- Data export and reporting

## System Architecture

PlateSync follows a modern web application architecture with clear separation between frontend and backend components:

```
┌─────────────┐       ┌─────────────┐      ┌─────────────┐
│             │       │             │      │             │
│   React     │◄─────►│   Express   │◄────►│  PostgreSQL │
│   Frontend  │       │   Backend   │      │  Database   │
│             │       │             │      │             │
└─────────────┘       └─────────────┘      └─────────────┘
                            │
                            ▼
                      ┌─────────────┐
                      │  SendGrid   │
                      │  Email API  │
                      └─────────────┘
```

### Frontend Architecture

The frontend is built with React and uses:
- Tailwind CSS for styling
- Shadcn UI component library (based on Radix UI primitives)
- React Router for navigation
- React Query for data fetching and state management
- Zod for form validation

The frontend is organized following a feature-first approach with:
- Components: Reusable UI components
- Pages: Route-specific views
- Hooks: Custom React hooks
- Lib: Utility functions

### Backend Architecture

The backend is built with Express.js and follows a modular architecture:
- Routes: API endpoints organized by feature
- Middleware: Authentication and authorization checks
- Database integration via Drizzle ORM
- Sending email notifications via SendGrid API

### Database Architecture

PlateSync uses PostgreSQL as its database, accessed through Drizzle ORM. The schema includes tables for:
- Users: Authentication and user management
- Members: Church members who make donations
- Donations: Individual donation records
- Batches: Groups of donations collected during a service
- Service Options: Types of church services
- Report Recipients: People who receive donation reports
- Email Templates: Customizable email notification templates

## Key Components

### Authentication System

PlateSync implements a dual authentication approach:
1. Replit Auth: OpenID Connect-based authentication for Replit users
2. Local Authentication: Email and password-based authentication

The system stores sessions in the PostgreSQL database using a `sessions` table, with password hashing handled via the Node.js crypto module (scrypt).

### Role-Based Access Control

The application implements role-based access control with two main roles:
- ADMIN: Full access to all features, including settings and user management
- USHER: Limited access to donation counting and member management

Roles are enforced through middleware that checks user permissions before allowing access to protected routes.

### Donation Management

The donation management system consists of:
- Batches: Represent collection events (e.g., Sunday service)
- Donations: Individual contributions linked to members
- Members: Church attendees who make donations

The system supports different donation types (cash/check) and provides interfaces for recording, reviewing, and finalizing donation batches.

### Email Notification System

PlateSync integrates with SendGrid to send various types of emails:
- Welcome emails for new users
- Password reset emails
- Donation confirmation emails
- Batch count reports

Email templates are customizable and stored in the database.

## Data Flow

### Donation Recording Process

1. User creates a new batch (count) for a specific service
2. Individual donations are recorded within the batch
3. Each donation is associated with a member and includes amount and type
4. When all donations are recorded, the batch can be attested by counters
5. Once attested, the batch is finalized
6. Reports can be generated and emailed to configured recipients

### Authentication Flow

1. User visits the login page
2. User authenticates via email/password or Replit Auth
3. Upon successful authentication, a session is created
4. Session data is stored in the database
5. Protected routes check for valid session before granting access

## External Dependencies

### Core Dependencies

- **React**: Frontend UI library
- **Express.js**: Backend web framework
- **PostgreSQL**: Relational database
- **Drizzle ORM**: Database access layer
- **TanStack Query (React Query)**: Data fetching and state management
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Accessible UI components
- **Vite**: Build tool and development server

### External Services

- **SendGrid**: Email delivery service
- **Neon Database**: Serverless Postgres provider (based on imports)

## Deployment Strategy

The application is configured for deployment on Replit with the following considerations:

1. **Build Process**:
   - Frontend: Vite builds the React application into static assets
   - Backend: esbuild bundles the server code for production

2. **Environment Variables**:
   - Database connection string (`DATABASE_URL`)
   - SendGrid API key (`SENDGRID_API_KEY`)
   - Session secret (`SESSION_SECRET`)

3. **Database Management**:
   - Drizzle ORM for schema management and migrations
   - Connection to PostgreSQL via connection string

4. **Replit Configuration**:
   - Uses Replit's deployment capabilities
   - Configured with `.replit` file for build and run commands
   - Uses Node.js 20 as the runtime environment

The deployment is configured to autoscale based on demand, making it suitable for production use cases.