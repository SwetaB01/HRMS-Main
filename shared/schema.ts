import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, date, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// UserType Table
export const userTypes = pgTable("user_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const insertUserTypeSchema = createInsertSchema(userTypes).omit({ id: true });
export type InsertUserType = z.infer<typeof insertUserTypeSchema>;
export type UserType = typeof userTypes.$inferSelect;

// UserRole Table
export const userRoles = pgTable("user_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleName: text("role_name").notNull().unique(),
  roleDescription: text("role_description"),
  accessType: text("access_type").notNull(),
  accessLevel: text("access_level").notNull(),
  level: integer("level").notNull(), // 1=Super Admin, 2=Manager, 3=HR Admin, 4=Accountant, 5=Employee
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({ id: true });
export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// Department Table
export const departments = pgTable("departments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const insertDepartmentSchema = createInsertSchema(departments).omit({ id: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type Department = typeof departments.$inferSelect;

// Company Table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  costCenter: text("cost_center"),
  country: text("country"),
  dateOfEstablishment: date("date_of_establishment"),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// CostCenter Table
export const costCenters = pgTable("cost_centers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertCostCenterSchema = createInsertSchema(costCenters).omit({ id: true });
export type InsertCostCenter = z.infer<typeof insertCostCenterSchema>;
export type CostCenter = typeof costCenters.$inferSelect;

// UserProfile Table
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  roleId: varchar("role_id").references(() => userRoles.id),
  companyId: varchar("company_id").references(() => companies.id),
  firstName: text("first_name").notNull(),
  middleName: text("middle_name"),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  street: text("street"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  language: text("language").default("English"),
  timezone: text("timezone").default("Asia/Kolkata"),
  gender: text("gender"),
  birthdate: date("birthdate"),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("Active"),
  userType: text("user_type"),
  bankAccount: text("bank_account"),
  insuranceOpted: boolean("insurance_opted").default(false),
  departmentId: varchar("department_id").references(() => departments.id),
  managerId: varchar("manager_id").references(() => userProfiles.id),
  joiningDate: date("joining_date"),
  photo: text("photo"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ 
  id: true, 
  createdAt: true 
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
}).omit({ passwordHash: true });

export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// LeaveType Table
export const leaveTypes = pgTable("leave_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  maxConsecutiveDays: integer("max_consecutive_days"),
  isCarryForward: boolean("is_carry_forward").default(false),
});

export const insertLeaveTypeSchema = createInsertSchema(leaveTypes).omit({ id: true });
export type InsertLeaveType = z.infer<typeof insertLeaveTypeSchema>;
export type LeaveType = typeof leaveTypes.$inferSelect;

// Leaves Table
export const leaves = pgTable("leaves", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  leaveTypeId: varchar("leave_type_id").notNull().references(() => leaveTypes.id),
  companyId: varchar("company_id").references(() => companies.id),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  halfDay: boolean("half_day").default(false),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Open"),
  postingDate: timestamp("posting_date").defaultNow(),
  managerId: varchar("manager_id").references(() => userProfiles.id),
  managerApprovalDate: timestamp("manager_approval_date"),
  managerComments: text("manager_comments"),
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({ 
  id: true, 
  postingDate: true,
  managerApprovalDate: true 
});
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leaves.$inferSelect;

// LeaveLedger Table
export const leaveLedgers = pgTable("leave_ledgers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  leaveTypeId: varchar("leave_type_id").notNull().references(() => leaveTypes.id),
  totalLeaves: numeric("total_leaves").notNull(),
  usedLeaves: numeric("used_leaves").default("0"),
  year: integer("year").notNull(),
});

export const insertLeaveLedgerSchema = createInsertSchema(leaveLedgers).omit({ id: true });
export type InsertLeaveLedger = z.infer<typeof insertLeaveLedgerSchema>;
export type LeaveLedger = typeof leaveLedgers.$inferSelect;

// Holiday Table
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyId: varchar("company_id").references(() => companies.id),
  fromDate: date("from_date").notNull(),
  toDate: date("to_date").notNull(),
  totalHolidays: integer("total_holidays").notNull(),
});

export const insertHolidaySchema = createInsertSchema(holidays).omit({ id: true });
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;
export type Holiday = typeof holidays.$inferSelect;

// HolidayDetails Table
export const holidayDetails = pgTable("holiday_details", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  holidayId: varchar("holiday_id").notNull().references(() => holidays.id),
  date: date("date").notNull(),
  description: text("description").notNull(),
});

export const insertHolidayDetailSchema = createInsertSchema(holidayDetails).omit({ id: true });
export type InsertHolidayDetail = z.infer<typeof insertHolidayDetailSchema>;
export type HolidayDetail = typeof holidayDetails.$inferSelect;

// Attendance Table
export const attendance = pgTable("attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  attendanceDate: date("attendance_date").notNull(),
  status: text("status").notNull(),
  leaveTypeId: varchar("leave_type_id").references(() => leaveTypes.id),
  companyId: varchar("company_id").references(() => companies.id),
  checkIn: timestamp("check_in"),
  checkOut: timestamp("check_out"),
  earlySignIn: boolean("early_sign_in").default(false),
  earlySignOut: boolean("early_sign_out").default(false),
  lateSignIn: boolean("late_sign_in").default(false),
  lateSignOut: boolean("late_sign_out").default(false),
  shiftTiming: text("shift_timing"),
  totalDuration: numeric("total_duration"),
  regularizationRequested: boolean("regularization_requested").default(false),
  regularizationReason: text("regularization_reason"),
  regularizationStatus: text("regularization_status"),
  regularizationApprovedBy: varchar("regularization_approved_by").references(() => userProfiles.id),
  regularizationApprovedAt: timestamp("regularization_approved_at"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

// ReimbursementType Table
export const reimbursementTypes = pgTable("reimbursement_types", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
});

export const insertReimbursementTypeSchema = createInsertSchema(reimbursementTypes).omit({ id: true });
export type InsertReimbursementType = z.infer<typeof insertReimbursementTypeSchema>;
export type ReimbursementType = typeof reimbursementTypes.$inferSelect;

// Reimbursement Table
export const reimbursements = pgTable("reimbursements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  reimbursementTypeId: varchar("reimbursement_type_id").notNull().references(() => reimbursementTypes.id),
  date: date("date").notNull(),
  amount: numeric("amount").notNull(),
  category: text("category").notNull(),
  attachment: text("attachment"),
  status: text("status").notNull().default("Pending"),
  managerId: varchar("manager_id").references(() => userProfiles.id),
  managerApprovalDate: timestamp("manager_approval_date"),
  managerComments: text("manager_comments"),
  accountantId: varchar("accountant_id").references(() => userProfiles.id),
  accountantApprovalDate: timestamp("accountant_approval_date"),
  accountantComments: text("accountant_comments"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReimbursementSchema = createInsertSchema(reimbursements).omit({ 
  id: true, 
  createdAt: true,
  managerApprovalDate: true,
  accountantApprovalDate: true
});
export type InsertReimbursement = z.infer<typeof insertReimbursementSchema>;
export type Reimbursement = typeof reimbursements.$inferSelect;

// Payroll Table
export const payrolls = pgTable("payrolls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => userProfiles.id),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  basicSalary: numeric("basic_salary").notNull(),
  allowances: numeric("allowances").default("0"),
  deductions: numeric("deductions").default("0"),
  reimbursements: numeric("reimbursements").default("0"),
  lopDays: numeric("lop_days").default("0"),
  lopAmount: numeric("lop_amount").default("0"),
  netSalary: numeric("net_salary").notNull(),
  status: text("status").notNull().default("Draft"),
  generatedAt: timestamp("generated_at").defaultNow(),
  approvedBy: varchar("approved_by").references(() => userProfiles.id),
  approvedAt: timestamp("approved_at"),
});

export const insertPayrollSchema = createInsertSchema(payrolls).omit({ 
  id: true, 
  generatedAt: true,
  approvedAt: true
});
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payrolls.$inferSelect;