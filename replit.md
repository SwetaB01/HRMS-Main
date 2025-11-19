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

## Email Notification System

The HRMS system includes a comprehensive email notification system built with Nodemailer. Once SMTP credentials are configured, the system will automatically send emails for:

- **Leave Applications**: Notifies managers when employees submit leave requests
- **Leave Approvals/Rejections**: Notifies employees about leave application decisions
- **Reimbursement Requests**: Notifies managers when employees submit expense claims
- **Reimbursement Approvals**: Notifies employees about reimbursement approvals (manager and accountant levels)
- **Payslip Notifications**: Notifies employees when payslips are available

**Configuration Status**: Email service is implemented and ready to use. Requires the following environment variables:
- `SMTP_HOST`: Email server address
- `SMTP_PORT`: Port number (587 or 465)
- `SMTP_USER`: Email username/address
- `SMTP_PASSWORD`: Email password or app-specific password
- `SMTP_FROM_EMAIL`: Sender email address
- `SMTP_FROM_NAME`: Sender display name

**Note**: User chose not to use the Resend integration and will provide custom SMTP credentials instead.

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
- User role information included in session (`req.session.userRole`)

**Authorization - Role-Based Access Control:**

The system implements a comprehensive role-based permission system with five standardized roles:

**Role Hierarchy:**
1. **Super Admin** (accessLevel: 'Admin')
   - Full system access with all permissions
   - Can manage all data across the system
   - Can create, update, delete roles
   - Automatically has access to all routes

2. **HR Admin** (accessLevel: 'HR')
   - Employee lifecycle management (create, update employees)
   - Payroll processing and management
   - Leave management and approvals
   - View all reimbursements
   - Holiday management

3. **Manager** (accessLevel: 'Manager')
   - Approve/reject team leave requests
   - Approve reimbursements (manager level)
   - Delete team attendance records
   - View all reimbursements
   - View team dashboard statistics

4. **Accountant** (accessLevel: 'Accountant')
   - Payroll processing and approval
   - Reimbursement approvals (accountant level)
   - View all payrolls and reimbursements
   - Financial data access

5. **Employee** (accessLevel: 'Employee')
   - View and edit own profile
   - Mark own attendance
   - Apply for leaves
   - Submit reimbursement claims
   - View own payroll records
   - Access own data only

**Permission Middleware:**
- `requireAuth` - Ensures user is authenticated
- `requireAdmin` - Admin-only access
- `requireHROrAdmin` - HR and Admin access
- `requireManagerOrHROrAdmin` - Manager, HR, and Admin access
- `requireAccountantOrAdmin` - Accountant and Admin access
- `allowRoles(...levels)` - Flexible middleware accepting multiple access levels

**Permission Matrix:**
```
Route Type            | Admin | HR | Manager | Accountant | Employee
----------------------|-------|-----|---------|------------|----------
Role Management       |  ✓    |     |         |            |
Employee CRUD         |  ✓    | ✓   |         |            |
Dashboard Stats       |  ✓    | ✓   |    ✓    |     ✓      |    ✓
Attendance (Delete)   |  ✓    | ✓   |    ✓    |            |  Own
Leave Apply           |  ✓    | ✓   |    ✓    |            |    ✓
Leave Approve/Reject  |  ✓    | ✓   |    ✓    |            |
Holiday Management    |  ✓    | ✓   |         |            |  View
Reimburse Submit      |  ✓    | ✓   |    ✓    |     ✓      |    ✓
Reimburse View All    |  ✓    | ✓   |    ✓    |     ✓      |  Own
Reimburse Approve     |  ✓    | ✓   |    ✓    |     ✓      |
Payroll Create        |  ✓    | ✓   |         |     ✓      |
Payroll View          |  ✓    | ✓   |         |     ✓      |  Own
```

**Business Logic Enhancements:**
- Elevated roles (Manager, HR, Admin) can operate on team records, not just their own
- Attendance management:
  - Manual attendance creation: Managers/HR/Admins can create attendance for team members by providing `userId` in request body
  - Attendance deletion: Managers/HR/Admins can delete team attendance records
  - Check-in/check-out: Self-service only (employees mark their own attendance)
- Reimbursement and payroll GET routes filter data based on role:
  - Employees see only their own records
  - Elevated roles see all records (future: filtered by team/department)
- Admin role automatically inherits all permissions

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