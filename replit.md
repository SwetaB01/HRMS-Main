# MIDCAI HRMS ERP System

## Overview

MIDCAI HRMS is a comprehensive web-based Human Resource Management System for Midcai Consulting Private Limited. It centralizes workforce management including employee, attendance, leave, holiday, reimbursement, payroll, and document management. The system supports multiple user roles (Administrators, HR professionals, Managers, Employees) with role-based access controls across various departments.

**Company Details:**
- Name: MIDCAI
- Tagline: Unfolding Perpetually
- Brand Colors: MIDCAI Beige (#F3EDED), MIDCAI Orange (#F23F00), MIDCAI Black (#100D08), White (#FFFFFF)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn/ui (New York style variant) built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form with Zod validation
- **Routing**: Wouter

**Design System:**
- Enterprise application pattern prioritizing clarity, consistency, and efficient information density.
- Typography: Inter font family.
- Consistent spacing and component padding.

### Backend Architecture

**Technology Stack:**
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database ORM**: Drizzle ORM
- **Authentication**: bcryptjs for password hashing
- **Session Management**: Session-based authentication

**API Structure:**
- RESTful API design with `/api` prefix.
- Centralized error handling and logging.
- Storage abstraction layer (`IStorage`) for database operations.

**Key Features & Implementations:**
- **Email Notification System**: Nodemailer for automated notifications (leave, reimbursement, payslips).
- **Salary Management System**:
    - All salary components stored as annual amounts; monthly amounts calculated dynamically.
    - Employee compensation setup, personal compensation view (`/api/my-compensation`), and detailed profile display.
- **Authentication & Authorization**:
    - Username/password authentication with bcryptjs and session management.
    - Role-Based Access Control (RBAC) with five roles: Super Admin, HR Admin, Manager, Accountant, Employee.
    - Permission middleware for granular access control (`requireAuth`, `allowRoles`, etc.).
- **Organizational Hierarchy System**:
    - Hierarchical employee-manager relationships with validation (manager.level < employee.level).
    - API endpoints for assigning managers, listing subordinates, and viewing the full hierarchy tree.

### Database Schema

**Database**: PostgreSQL (Neon Database).

**Core Tables:**
`user_types`, `user_roles`, `user_profiles`, `departments`, `companies`, `cost_centers`, `leave_types`, `leaves`, `leave_ledger`, `holidays`, `holiday_details`, `attendance`, `reimbursement_types`, `reimbursements`, `payroll`, `employee_bank_details`.

**Recent Updates (December 2025):**
- **Bank Details Management**: Complete CRUD operations for employee bank details with admin and self-service API endpoints. Bank details displayed on employee profile page and in employee form for admins.
- **Leave Day Calculation**: UTC-based inclusive date calculation (+1 day for inclusive range) across all leave routes.
- **Enhanced Salary Slip**: Displays employee details including date of joining, department, grade, and pay group.
- **Payroll Blocking**: Validates that employees have both CTC/salary components and bank details before payroll generation. Bulk generation reports skipped employees with detailed reasons.

**Schema Management:**
- Drizzle ORM for schema definition (`shared/schema.ts`) and migrations.
- Zod schemas for runtime validation.
- UUID primary keys and timestamp fields.

## External Dependencies

### Third-Party Services
- **Neon Database**: PostgreSQL cloud hosting.
- **Google Fonts**: Inter font family.
- **Replit Services**: Development environment, hosting, and build tools.

### Key NPM Packages

**Frontend:**
- `@tanstack/react-query`, `@radix-ui/*`, `react-hook-form`, `@hookform/resolvers`, `zod`, `wouter`, `date-fns`, `class-variance-authority`, `clsx`, `tailwind-merge`, `cmdk`, `lucide-react`.

**Backend:**
- `express`, `drizzle-orm`, `drizzle-kit`, `bcryptjs`, `connect-pg-simple`, `nodemailer`.

**Build Tools:**
- `vite`, `esbuild`, `tsx`.