# Zendala - Access Control System

## Overview

Zendala is a residential access control system designed for gated communities in Mexico. The application enables residents to generate QR codes for visitors, guards to validate access at security checkpoints, and administrators to monitor all access activity. Built with a mobile-first approach, the system prioritizes ease of use for security guards operating from guard booths.

The application uses a role-based architecture with three user types: Vecino (Resident), Guardia (Guard), and Administrador (Administrator). Authentication is handled through Replit's OpenID Connect integration, with users selecting their role after initial login.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for client-side routing (lightweight alternative to React Router)
- TanStack Query (React Query) for server state management and API caching
- Shadcn/ui component library built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens

**Design System:**
- Material Design-inspired approach adapted for security/utility applications
- Typography: Inter for UI text, JetBrains Mono for technical data (codes, timestamps)
- Mobile-first responsive design with breakpoint at 768px
- Custom color system using HSL variables for light/dark mode support
- Standardized spacing using Tailwind's 4-point grid system

**Component Architecture:**
- UI components in `client/src/components/ui/` following Shadcn's composition pattern
- Page components in `client/src/pages/` corresponding to user roles
- Custom hooks in `client/src/hooks/` for authentication and mobile detection
- Shared schema types imported from `shared/schema.ts` for type consistency

**State Management:**
- TanStack Query handles all server state with automatic caching and revalidation
- Query keys follow REST-like patterns: `["/api/auth/user"]`, `["/api/qr-codes"]`
- Mutations invalidate related queries to keep UI synchronized
- No global client state management needed due to server-driven architecture

**Key Features by Role:**
- **Vecino (Resident):** QR code generation form with visitor details, display of generated codes with full-screen QR modal
- **Guardia (Guard):** HTML5 QR code scanner integration, real-time validation with visual success/failure feedback
- **Administrador (Administrator):** Dashboard with access statistics, searchable access log table, analytics tabs

### Backend Architecture

**Technology Stack:**
- Express.js server with TypeScript
- Session-based authentication using express-session with PostgreSQL store
- Passport.js with OpenID Connect strategy for Replit authentication
- Drizzle ORM for database interactions
- Separate development and production entry points

**API Design:**
- RESTful endpoints under `/api` prefix
- Authentication middleware (`isAuthenticated`, `isAdmin`, `isGuardOrAdmin`) protecting routes
- Role-based access control enforced at route level
- JSON request/response format throughout

**Authentication Flow:**
1. User initiates login via `/api/login` (Replit OIDC)
2. Callback to `/api/auth/callback` creates/updates user record
3. User redirected to role selection page if first login
4. Role set via `/api/auth/set-role` endpoint
5. Subsequent requests authenticated via session cookie

**Key Endpoints:**
- `GET /api/auth/user` - Current user profile
- `POST /api/auth/set-role` - Set user role (vecino/guardia/administrador)
- `POST /api/qr-codes` - Create QR code (residents only)
- `GET /api/qr-codes` - List user's QR codes
- `POST /api/qr-codes/validate` - Validate and mark QR code as used (guards/admins)
- `GET /api/access-logs` - Access history (admins only)
- `GET /api/dashboard/stats` - Dashboard analytics (admins only)

**Storage Layer:**
- `DatabaseStorage` class in `server/storage.ts` implements `IStorage` interface
- Abstraction allows for future storage backend changes
- Methods return typed entities matching Drizzle schema definitions

### Data Storage

**Database: PostgreSQL via Neon Serverless**
- Connection pooling handled by `@neondatabase/serverless` with WebSocket support
- Drizzle ORM provides type-safe query builder and schema management
- Migrations stored in `/migrations` directory
- Schema definitions in `shared/schema.ts` shared between client and server

**Schema Design:**

**sessions** - Express session storage
- `sid` (varchar, primary key)
- `sess` (jsonb) - Session data
- `expire` (timestamp) - Expiration with index for cleanup

**users** - User accounts
- `id` (varchar, UUID primary key)
- `email`, `firstName`, `lastName`, `profileImageUrl` - Profile data from OIDC
- `role` (varchar) - vecino/guardia/administrador
- `createdAt`, `updatedAt` timestamps

**qrCodes** - Generated access codes
- `id` (varchar, UUID primary key)
- `code` (varchar, unique) - The actual QR code string
- `visitorName`, `visitorType`, `description` - Visitor details
- `createdById` (foreign key to users)
- `isUsed` (varchar) - "true"/"false" flag
- `usedAt` (timestamp) - When guard validated the code
- `createdAt` timestamp

**accessLogs** - Access history
- `id` (varchar, UUID primary key)
- `qrCodeId` (foreign key to qrCodes)
- `guardId` (foreign key to users) - Which guard processed entry
- `accessedAt` timestamp

**Data Flow:**
1. Resident creates QR code → Insert to `qrCodes` table with unique code
2. Guard scans code → Validate against `qrCodes`, check `isUsed` flag
3. On successful validation → Update `isUsed`, insert to `accessLogs`
4. Admin views logs → Join `accessLogs` with `qrCodes` and `users` for full details

### External Dependencies

**Replit Integration:**
- Replit Auth (OpenID Connect) for user authentication
- Environment variables: `ISSUER_URL`, `REPL_ID`, `SESSION_SECRET`, `DATABASE_URL`
- Vite plugins: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner`

**Neon PostgreSQL:**
- Serverless PostgreSQL database
- Connection via `DATABASE_URL` environment variable
- WebSocket support for serverless function compatibility

**Third-Party Libraries:**
- `html5-qrcode` - QR code scanning functionality in browser
- `qrcode.react` - QR code generation and display as SVG
- `nanoid` - Unique ID generation for QR codes
- `date-fns` - Date formatting and manipulation
- `zod` - Runtime schema validation with Drizzle integration

**Development Tools:**
- TypeScript for type checking across full stack
- ESBuild for production server bundling
- PostCSS with Tailwind and Autoprefixer for CSS processing
- TSX for running TypeScript in development mode

**Session Management:**
- `connect-pg-simple` - PostgreSQL session store for Express
- 7-day session expiration
- Secure, HTTP-only cookies in production
- Session table auto-created by migration