# MIDCAI HRMS ERP Design Guidelines

## Design Approach

**Selected Approach:** Design System-Based (Enterprise Application Pattern)

**Rationale:** This HRMS ERP is a utility-focused, data-intensive enterprise application requiring efficiency, consistency, and scalability. Drawing inspiration from enterprise design systems like Ant Design and Carbon Design, which excel at data-heavy applications with complex workflows and role-based access patterns.

**Core Design Principles:**
- **Clarity Over Decoration:** Every element serves a functional purpose
- **Consistency Across Modules:** Unified patterns for tables, forms, and workflows
- **Efficient Information Density:** Maximize productivity without overwhelming users
- **Role-Aware Interfaces:** Contextual views based on user permissions

---

## Typography System

**Font Stack:**
- Primary: Inter (via Google Fonts) - Clean, professional, excellent readability at all sizes
- Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

**Type Scale:**
- **H1 (Page Titles):** 28px, font-weight: 600
- **H2 (Section Headers):** 20px, font-weight: 600
- **H3 (Card/Panel Titles):** 16px, font-weight: 600
- **Body (Default):** 14px, font-weight: 400
- **Small (Meta/Helper Text):** 12px, font-weight: 400
- **Buttons/Labels:** 14px, font-weight: 500

**Line Heights:**
- Headings: 1.3
- Body text: 1.5
- Dense content (tables): 1.4

---

## Layout & Spacing System

**Tailwind Spacing Units:** Limit to **2, 4, 6, 8, 12, 16** for consistency

**Common Patterns:**
- Component padding: `p-6`
- Section spacing: `space-y-6`
- Card padding: `p-6`
- Form field spacing: `space-y-4`
- Button spacing: `space-x-4`
- Table cell padding: `px-4 py-3`

**Grid System:**
- Dashboard cards: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6`
- Form layouts: Two-column forms on desktop (`grid grid-cols-1 md:grid-cols-2 gap-6`)
- Data tables: Full-width, responsive scrolling

**Container Widths:**
- Main content area: `max-w-7xl mx-auto px-6`
- Modal/Dialog content: `max-w-2xl`
- Forms: `max-w-4xl`

---

## Navigation Architecture

**Primary Navigation (Sidebar):**
- Fixed left sidebar, width: 240px desktop, collapsible on mobile
- Logo placement at top with company name "MIDCAI" and tagline "Unfolding Perpetually"
- Grouped navigation items by function:
  - **Dashboard** (home icon)
  - **Employee Management** (Administrator module)
  - **Attendance** (calendar icon)
  - **Leave Management** (calendar-days icon)
  - **Holidays** (sun icon)
  - **Reimbursements** (receipt icon)
  - **Payroll** (currency icon)
  - **Company Settings** (building icon)
  - **Reports** (chart icon)
- Active state indication with subtle background treatment
- User profile section at bottom with name, role badge, and logout

**Top Bar:**
- Height: 64px
- Breadcrumb navigation (Home > Module > Page)
- Global search functionality
- Notification bell icon with badge count
- User avatar with dropdown menu (Profile, Settings, Logout)

---

## Component Library

### Data Tables (Critical Component)
**Structure:**
- Sticky header row
- Alternating row treatment for scannability
- Column headers with sort indicators
- Action column (right-aligned) with icon buttons (Edit, Delete, View)
- Row hover state for clarity
- Checkbox column for bulk operations (left-most)

**Features Per Table:**
- Search/filter bar above table
- Entries per page selector (10, 25, 50, 100)
- Pagination component at bottom
- Column visibility toggles
- Export functionality (CSV, PDF buttons)

**Spacing:**
- Cell padding: `px-4 py-3`
- Header padding: `px-4 py-4`
- Minimum row height: 48px

### Forms
**Layout Pattern:**
- Two-column grid on desktop, single column on mobile
- Label above input (not inline)
- Required field indicator (*)
- Helper text below input when needed
- Error messages in error state treatment
- Form sections with clear headings

**Input Components:**
- Text inputs, textareas, select dropdowns, date pickers, file upload
- Checkbox and radio groups with clear labels
- Multi-select with tag display
- Consistent height: 40px for inputs

**Action Buttons:**
- Primary action (right): Submit, Save, Create
- Secondary action: Cancel, Reset
- Destructive action: Delete (separate, left side)
- Button group spacing: `space-x-4`

### Cards & Panels
**Dashboard Cards:**
- Metric cards with icon, value, label, and trend indicator
- Equal height cards in grid layout
- Subtle border treatment
- Padding: `p-6`

**Content Panels:**
- Section headers with action buttons (Add, Filter)
- Panel body with appropriate padding
- Footer for actions or metadata

### Status Indicators
**Badge Components:**
- User status: Active/Inactive
- Leave status: Open, Approved, Rejected, Cancelled
- Attendance status: Present, Absent, On Leave, Half Day, WFH, Client Location
- Reimbursement status: Pending, Approved, Rejected
- Rounded badges with appropriate visual treatment
- Size: `px-3 py-1 text-xs font-medium rounded-full`

### Modals & Dialogs
**Structure:**
- Overlay with backdrop blur
- Modal max-width: `max-w-2xl` for forms, `max-w-4xl` for complex content
- Header with title and close button
- Body with scrollable content area
- Footer with action buttons (aligned right)

### Approval Workflows
**Visual Pattern:**
- Timeline/stepper component for multi-stage approvals
- Status cards showing approver, date, action, and comments
- Clear distinction between pending, approved, and rejected states
- Email notification trigger indicators

---

## Module-Specific Patterns

### Dashboard (Home)
- **Layout:** 4-column grid for metric cards at top
- **Quick Stats:** Total Employees, Present Today, On Leave, Pending Approvals
- **Recent Activity:** Timeline of recent actions
- **Pending Tasks:** Cards for items requiring action
- **Charts:** Attendance trends, leave utilization (chart library: Chart.js or Recharts)

### Attendance Module
- **Primary View:** Calendar view with daily attendance grid
- **List View:** Tabular data with filters (date range, status, employee)
- **Check-in Panel:** Clock in/out widget prominently displayed
- **Regularization Queue:** Separate section for pending approval requests

### Leave Management
- **Employee View:** Leave balance cards, application form, leave history table
- **Manager View:** Approval queue, team leave calendar
- **Calendar Integration:** Visual calendar showing approved leaves
- **Balance Display:** Progress bars or donut charts for leave quota

### Reimbursement Module
- **Submission Form:** Category dropdown, amount input, date picker, file upload for receipts
- **Approval Workflow:** Two-tier display (Manager → Accountant)
- **Receipt Preview:** Thumbnail gallery with lightbox modal for full view
- **Status Tracking:** Timeline component showing approval progress

### Employee Profile
- **Header Section:** Profile photo, name, designation, employee ID
- **Tabbed Interface:** Personal Info, Contact, Bank Details, Documents, Attendance Summary, Leave History
- **Document Gallery:** Grid of uploaded documents with download buttons
- **Edit Mode:** Toggle between view and edit states

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column layouts, hamburger menu)
- Tablet: 768px - 1024px (sidebar collapses, 2-column grids)
- Desktop: > 1024px (full sidebar, multi-column grids)

**Mobile Adaptations:**
- Navigation: Slide-out drawer with overlay
- Tables: Horizontal scroll or card-based mobile view
- Forms: Single column, stacked inputs
- Dashboard: Single column metric cards

---

## Accessibility Standards

- All form inputs have associated labels
- ARIA labels for icon-only buttons
- Keyboard navigation support (Tab, Enter, Escape)
- Focus indicators on interactive elements (subtle outline)
- Color contrast ratios meet WCAG AA standards
- Screen reader friendly table markup
- Skip navigation link for keyboard users

---

## Animation & Micro-interactions

**Use Sparingly:**
- Page transitions: Subtle fade (150ms)
- Modal open/close: Scale + fade (200ms)
- Dropdown menus: Slide down (150ms)
- Notification toasts: Slide in from top-right (250ms)
- Loading states: Spinner or skeleton screens

**Interactive States:**
- Button hover: Slight opacity change
- Row hover: Subtle background change
- Card hover: Subtle shadow elevation (for clickable cards only)
- No elaborate animations that slow down productivity

---

## Icons

**Icon Library:** Heroicons (outline for navigation, solid for actions)

**Usage:**
- Navigation menu items (20px icons)
- Action buttons in tables (16px icons)
- Status indicators (16px icons)
- Form field prefixes (18px icons)
- Dashboard metric cards (32px icons)

---

## Images

**Logo:**
- Header placement: MIDCAI logo (provided red logo mark) in sidebar top
- Footer: Logo with company details

**No Hero Images:** This is an enterprise application, not a marketing site

**User Avatars:**
- Profile photos in navigation, employee listings
- Default avatar placeholder for users without photos
- Circular cropping (40px in nav, 96px in profile header)

**Document Previews:**
- Thumbnail generation for uploaded files
- PDF preview in modal
- Image gallery for reimbursement receipts