# MIDCAI HRMS ERP System

## Overview

MIDCAI HRMS is a comprehensive web-based Human Resource Management System built for Midcai Consulting Private Limited. The system centralizes workforce management operations including employee management, attendance tracking, leave management, holiday calendars, reimbursements, payroll processing, and document management. The application serves multiple user roles (Administrators, HR professionals, Managers, and Employees) across various departments with role-based access controls.

**Company Details:**
- Name: MIDCAI
- Tagline: Unfolding Perpetually
- Address: 906-907, Signature Elite, J 7, Govind Marg, Nr. Narayan Singh Circle, Jaipur, Rajasthan - 302004

**Brand Colors:**
- MIDCAI Beige: #F3EDED
- MIDCAI Orange: #F23F00
- MIDCAI Black: #100D08
- White: #FFFFFF

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui (New York style variant) built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter (lightweight client-side routing)

**Design System:**
- Enterprise application pattern prioritizing clarity, consistency, and efficient information density
- Typography: Inter font family (via Google Fonts)
- Spacing system: Tailwind units limited to 2, 4, 6, 8, 12, 16 for consistency
- Component padding standard: p-6
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3

**Component Structure:**
- Reusable UI components in `client/src/components/ui/`
- Feature-specific forms in `client/src/components/` (employee-form, leave-form, holiday-form, reimbursement-form)
- Page components in `client/src/pages/` for each major module
- App-level sidebar navigation component for consistent navigation

**Key Pages:**
- Dashboard: Overview statistics and quick actions
- Employees: Employee management with CRUD operations
- Attendance: Check-in/check-out and attendance records
- Leaves: Leave applications and balance tracking
- Holidays: Company holiday calendar management
- Reimbursements: Expense claim submissions and approvals
- Payroll: Salary slips and payment history
- Company Settings: Company profile and configuration
- Reports: Data export and reporting functionality

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Authentication**: bcryptjs for password hashing
- **Session Management**: Session-based authentication (credentials included)

**API Structure:**
- RESTful API design with `/api` prefix
- Route registration in `server/routes.ts`
- Storage abstraction layer in `server/storage.ts` providing interface for all database operations
- Centralized error handling and request/response logging middleware

**Key API Endpoints:**
- Authentication: `/api/auth/login`
- Employee Management: `/api/employees`
- Attendance: `/api/attendance`, `/api/attendance/check-in`, `/api/attendance/check-out`
- Leave Management: `/api/leaves`, `/api/leave-balance`
- Holidays: `/api/holidays`
- Reimbursements: `/api/reimbursements`
- Payroll: `/api/payroll`
- Company: `/api/company`
- Dashboard: `/api/dashboard/stats`

**Data Layer Design:**
- Storage interface pattern (`IStorage`) for database abstraction
- Separation of concerns between route handlers and data access
- Type-safe database operations using Drizzle ORM and shared schema types

### Database Schema

**Database**: PostgreSQL (configured via `DATABASE_URL` environment variable)

**Core Tables:**
- `user_types`: User type classifications
- `user_roles`: Role definitions with access levels and permissions
- `user_profiles`: Employee/user information including authentication credentials
- `departments`: Organizational departments
- `companies`: Company/branch information
- `cost_centers`: Cost center tracking
- `leave_types`: Leave category definitions
- `leaves`: Leave application records
- `leave_ledger`: Leave balance tracking
- `holidays`: Holiday calendar entries
- `holiday_details`: Detailed holiday information
- `attendance`: Daily attendance records
- `reimbursement_types`: Expense category definitions
- `reimbursements`: Expense claim records
- `payroll`: Salary payment records

**Schema Management:**
- Schema definitions in `shared/schema.ts` using Drizzle ORM
- Zod schemas for runtime validation derived from Drizzle schemas
- Type inference for TypeScript type safety
- UUID primary keys using PostgreSQL's `gen_random_uuid()`
- Timestamp fields for audit trails

### Authentication & Authorization

**Authentication Mechanism:**
- Username/password-based authentication
- Password hashing using bcryptjs
- Session-based authentication with credentials stored client-side (localStorage)
- Login state management in React App component

**Authorization:**
- Role-based access control via `user_roles` table
- Access types and levels defined in role configuration
- Role information included in user session data
- Frontend components conditionally rendered based on user role

## External Dependencies

### Third-Party Services
- **Neon Database**: PostgreSQL database hosting (via `@neondatabase/serverless` package)
- **Google Fonts**: Inter font family for typography
- **Replit Services**: Development environment, hosting, and build tools

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`: Server state management and caching
- `@radix-ui/*`: Headless UI component primitives (accordion, dialog, dropdown, popover, select, tabs, toast, etc.)
- `react-hook-form`: Form state management
- `@hookform/resolvers`: Form validation integration
- `zod`: Runtime type validation
- `wouter`: Client-side routing
- `date-fns`: Date manipulation and formatting
- `class-variance-authority`: Component variant management
- `clsx` & `tailwind-merge`: Conditional CSS class composition
- `cmdk`: Command menu component
- `lucide-react`: Icon library

**Backend:**
- `express`: Web server framework
- `drizzle-orm`: Type-safe SQL ORM
- `drizzle-kit`: Database migrations and schema management
- `bcryptjs`: Password hashing
- `connect-pg-simple`: PostgreSQL session store

**Build Tools:**
- `vite`: Frontend build tool and dev server
- `esbuild`: Backend bundling for production
- `tsx`: TypeScript execution for development
- `@vitejs/plugin-react`: React support in Vite
- `@replit/*` plugins: Replit-specific development enhancements

### Development Environment
- **Platform**: Replit
- **Node.js**: ESM module system
- **TypeScript**: Strict mode enabled with path aliases (`@/`, `@shared/`, `@assets/`)
- **Hot Module Replacement**: Vite HMR for frontend development
- **Build Output**: 
  - Frontend: `dist/public`
  - Backend: `dist/index.js`