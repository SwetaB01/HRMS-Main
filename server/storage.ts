import {
  type UserProfile, type InsertUserProfile,
  type UserType, type InsertUserType,
  type UserRole, type InsertUserRole,
  type Department, type InsertDepartment,
  type Company, type InsertCompany,
  type CostCenter, type InsertCostCenter,
  type LeaveType, type InsertLeaveType,
  type Leave, type InsertLeave,
  type LeaveLedger, type InsertLeaveLedger,
  type Holiday, type InsertHoliday,
  type HolidayDetail, type InsertHolidayDetail,
  type Attendance, type InsertAttendance,
  type ReimbursementType, type InsertReimbursementType,
  type Reimbursement, type InsertReimbursement,
  type Payroll, type InsertPayroll,
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { randomUUID } from 'crypto';

export interface IStorage {
  // User Profile Operations
  getUserProfile(id: string): Promise<UserProfile | undefined>;
  getUserProfileByUsername(username: string): Promise<UserProfile | undefined>;
  getUserProfileByEmail(email: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(id: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;
  deleteUserProfile(id: string): Promise<boolean>;
  getAllUserProfiles(): Promise<UserProfile[]>;

  // User Type Operations
  getAllUserTypes(): Promise<UserType[]>;
  createUserType(type: InsertUserType): Promise<UserType>;

  // User Role Operations
  getAllUserRoles(): Promise<UserRole[]>;
  createUserRole(role: InsertUserRole): Promise<UserRole>;
  getUserRole(id: string): Promise<UserRole | undefined>;

  // Department Operations
  getAllDepartments(): Promise<Department[]>;
  createDepartment(dept: InsertDepartment): Promise<Department>;

  // Company Operations
  getCompany(id: string): Promise<Company | undefined>;
  getAllCompanies(): Promise<Company[]>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;

  // Leave Type Operations
  getAllLeaveTypes(): Promise<LeaveType[]>;
  createLeaveType(type: InsertLeaveType): Promise<LeaveType>;

  // Leave Operations
  getLeave(id: string): Promise<Leave | undefined>;
  getLeavesByUser(userId: string): Promise<Leave[]>;
  getAllLeaves(): Promise<Leave[]>;
  getLeavesPendingApproval(managerId: string): Promise<Leave[]>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: string, leave: Partial<InsertLeave>): Promise<Leave | undefined>;
  approveLeave(id: string, managerId: string, comments?: string): Promise<Leave | undefined>;
  rejectLeave(id: string, managerId: string, comments: string): Promise<Leave | undefined>;
  updateLeaveLedgerUsage(userId: string, leaveTypeId: string, year: number, days: number): Promise<void>;

  // Leave Ledger Operations
  getLeaveLedgerByUser(userId: string): Promise<LeaveLedger[]>;
  createLeaveLedger(ledger: InsertLeaveLedger): Promise<LeaveLedger>;
  updateLeaveLedger(id: string, ledger: Partial<InsertLeaveLedger>): Promise<LeaveLedger | undefined>;

  // Holiday Operations
  getAllHolidays(): Promise<Holiday[]>;
  createHoliday(holiday: InsertHoliday): Promise<Holiday>;
  updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined>;
  deleteHoliday(id: string): Promise<boolean>;

  // Attendance Operations
  getAttendance(id: string): Promise<Attendance | undefined>;
  getAttendanceByUser(userId: string, fromDate?: string, toDate?: string): Promise<Attendance[]>;
  getAllAttendance(): Promise<Attendance[]>;
  getAttendanceByDate(userId: string, date: string): Promise<Attendance | undefined>;
  getTodayAttendance(userId: string): Promise<Attendance | undefined>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: string): Promise<boolean>;
  checkIn(userId: string): Promise<Attendance>;
  checkOut(userId: string): Promise<Attendance | undefined>;

  // Reimbursement Type Operations
  getAllReimbursementTypes(): Promise<ReimbursementType[]>;
  createReimbursementType(type: InsertReimbursementType): Promise<ReimbursementType>;

  // Reimbursement Operations
  getReimbursement(id: string): Promise<Reimbursement | undefined>;
  getReimbursementsByUser(userId: string): Promise<Reimbursement[]>;
  getAllReimbursements(): Promise<Reimbursement[]>;
  getReimbursementsPendingManagerApproval(managerId: string): Promise<Reimbursement[]>;
  getReimbursementsPendingAccountantApproval(): Promise<Reimbursement[]>;
  createReimbursement(reimbursement: InsertReimbursement): Promise<Reimbursement>;
  approveReimbursementByManager(id: string, managerId: string, comments?: string): Promise<Reimbursement | undefined>;
  approveReimbursementByAccountant(id: string, accountantId: string, comments?: string): Promise<Reimbursement | undefined>;
  rejectReimbursement(id: string, userId: string, comments: string): Promise<Reimbursement | undefined>;

  // Payroll Operations
  getPayroll(id: string): Promise<Payroll | undefined>;
  getPayrollsByUser(userId: string): Promise<Payroll[]>;
  getAllPayrolls(): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  updatePayroll(id: string, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  approvePayroll(id: string, approverId: string): Promise<Payroll | undefined>;

  // Dashboard Stats
  getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    pendingApprovals: number;
    pendingReimbursements: number;
    pendingRegularizations: number;
  }>;

  // Hierarchy Operations
  assignManager(employeeId: string, managerId: string): Promise<UserProfile | undefined>;
  getSubordinates(managerId: string): Promise<UserProfile[]>;
  getHierarchyTree(): Promise<any[]>;
}

/* Keeping MemStorage for reference, but now using PostgreSQL */
export class MemStorage implements IStorage {
  private userProfiles: Map<string, UserProfile> = new Map();
  private userTypes: Map<string, UserType> = new Map();
  private userRoles: Map<string, UserRole> = new Map();
  private departments: Map<string, Department> = new Map();
  private companies: Map<string, Company> = new Map();
  private costCenters: Map<string, CostCenter> = new Map();
  private leaveTypes: Map<string, LeaveType> = new Map();
  private leaves: Map<string, Leave> = new Map();
  private leaveLedgers: Map<string, LeaveLedger> = new Map();
  private holidays: Map<string, Holiday> = new Map();
  private attendance: Map<string, Attendance> = new Map();
  private reimbursementTypes: Map<string, ReimbursementType> = new Map();
  private reimbursements: Map<string, Reimbursement> = new Map();
  private payrolls: Map<string, Payroll> = new Map();

  constructor() {
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create default admin user
    const adminRole: UserRole = {
      id: 'admin-role',
      roleName: 'Administrator',
      roleDescription: 'Full system access',
      accessType: 'Admin',
      accessLevel: 'Full',
    };
    this.userRoles.set(adminRole.id, adminRole);

    // Hash the default admin password
    const hashedPassword = await bcrypt.hash('admin', 10);

    const adminProfile: UserProfile = {
      id: 'admin-user',
      roleId: adminRole.id,
      companyId: null,
      firstName: 'Admin',
      middleName: null,
      lastName: 'User',
      email: 'admin@midcai.com',
      phone: null,
      street: null,
      city: null,
      state: null,
      country: null,
      language: 'English',
      timezone: 'Asia/Kolkata',
      gender: null,
      birthdate: null,
      username: 'admin',
      passwordHash: hashedPassword,
      status: 'Active',
      userType: 'Admin',
      bankAccount: null,
      insuranceOpted: false,
      departmentId: null,
      managerId: null,
      joiningDate: null,
      createdAt: new Date(),
    };
    this.userProfiles.set(adminProfile.id, adminProfile);

    // Create default leave types
    const leaveTypesCasual: LeaveType = {
      id: 'casual',
      name: 'Casual Leave',
      maxConsecutiveDays: 5,
      isCarryForward: false,
    };
    this.leaveTypes.set(leaveTypesCasual.id, leaveTypesCasual);

    const leaveTypesSick: LeaveType = {
      id: 'sick',
      name: 'Sick Leave',
      maxConsecutiveDays: 10,
      isCarryForward: false,
    };
    this.leaveTypes.set(leaveTypesSick.id, leaveTypesSick);

    // Create default reimbursement types
    const reimbTypes = [
      { id: 'travel', name: 'Travel' },
      { id: 'meals', name: 'Meals & Entertainment' },
      { id: 'office-supplies', name: 'Office Supplies' },
      { id: 'accommodation', name: 'Accommodation' },
      { id: 'phone-internet', name: 'Phone & Internet' },
      { id: 'others', name: 'Others' },
    ];
    reimbTypes.forEach(type => this.reimbursementTypes.set(type.id, type as ReimbursementType));

    // Create sample reimbursements
    const sampleReimbursements = [
      {
        id: 'reimb-1',
        userId: 'user-john',
        reimbursementTypeId: 'travel',
        date: '2025-01-15',
        amount: '1500.00',
        category: 'Client meeting travel expenses',
        attachment: null,
        status: 'Pending',
        managerId: 'user-manager',
        managerApprovalDate: null,
        managerComments: null,
        accountantId: null,
        accountantApprovalDate: null,
        accountantComments: null,
        createdAt: new Date('2025-01-15'),
      },
      {
        id: 'reimb-2',
        userId: 'user-john',
        reimbursementTypeId: 'meals',
        date: '2025-01-10',
        amount: '850.00',
        category: 'Team lunch with client',
        attachment: null,
        status: 'Manager Approved',
        managerId: 'user-manager',
        managerApprovalDate: new Date('2025-01-11'),
        managerComments: 'Approved',
        accountantId: null,
        accountantApprovalDate: null,
        accountantComments: null,
        createdAt: new Date('2025-01-10'),
      },
      {
        id: 'reimb-3',
        userId: adminUser.id,
        reimbursementTypeId: 'office-supplies',
        date: '2025-01-05',
        amount: '2500.00',
        category: 'Office equipment purchase',
        attachment: null,
        status: 'Approved',
        managerId: null,
        managerApprovalDate: null,
        managerComments: null,
        accountantId: accountantUser.id,
        accountantApprovalDate: new Date('2025-01-06'),
        accountantComments: 'Approved by finance',
        createdAt: new Date('2025-01-05'),
      },
    ];
    sampleReimbursements.forEach(reimb => this.reimbursements.set(reimb.id, reimb as Reimbursement));
  }

  // User Profile Operations
  async getUserProfile(id: string): Promise<UserProfile | undefined> {
    return this.userProfiles.get(id);
  }

  async getUserProfileByUsername(username: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find(p => p.username === username);
  }

  async getUserProfileByEmail(email: string): Promise<UserProfile | undefined> {
    return Array.from(this.userProfiles.values()).find(p => p.email === email);
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const id = `user-${Date.now()}`;
    const hashedPassword = await bcrypt.hash(profile.password, 10);
    const newProfile: UserProfile = {
      ...profile,
      id,
      passwordHash: hashedPassword,
      createdAt: new Date(),
    } as UserProfile;
    this.userProfiles.set(id, newProfile);
    return newProfile;
  }

  async updateUserProfile(id: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const existing = this.userProfiles.get(id);
    if (!existing) return undefined;

    // Hash password if it's being updated
    const updates: any = { ...profile };
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const updated = { ...existing, ...updates };
    this.userProfiles.set(id, updated);
    return updated;
  }

  async deleteUserProfile(id: string): Promise<boolean> {
    return this.userProfiles.delete(id);
  }

  async getAllUserProfiles(): Promise<UserProfile[]> {
    return Array.from(this.userProfiles.values());
  }

  // User Type Operations
  async getAllUserTypes(): Promise<UserType[]> {
    return Array.from(this.userTypes.values());
  }

  async createUserType(type: InsertUserType): Promise<UserType> {
    const id = `usertype-${Date.now()}`;
    const newType: UserType = { ...type, id };
    this.userTypes.set(id, newType);
    return newType;
  }

  // User Role Operations
  async getAllUserRoles(): Promise<UserRole[]> {
    return Array.from(this.userRoles.values());
  }

  async createUserRole(role: InsertUserRole): Promise<UserRole> {
    const id = `role-${Date.now()}`;
    const newRole: UserRole = { ...role, id };
    this.userRoles.set(id, newRole);
    return newRole;
  }

  async getUserRole(id: string): Promise<UserRole | undefined> {
    return this.userRoles.get(id);
  }

  async updateRole(id: string, role: Partial<InsertUserRole>): Promise<UserRole | undefined> {
    const existing = this.userRoles.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...role };
    this.userRoles.set(id, updated);
    return updated;
  }

  async deleteRole(id: string): Promise<boolean> {
    return this.userRoles.delete(id);
  }

  // Department Operations
  async getAllDepartments(): Promise<Department[]> {
    return Array.from(this.departments.values());
  }

  async createDepartment(dept: InsertDepartment): Promise<Department> {
    const id = `dept-${Date.now()}`;
    const newDept: Department = { ...dept, id };
    this.departments.set(id, newDept);
    return newDept;
  }

  // Company Operations
  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async getAllCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const id = `company-${Date.now()}`;
    const newCompany: Company = { ...company, id };
    this.companies.set(id, newCompany);
    return newCompany;
  }

  async updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined> {
    const existing = this.companies.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...company };
    this.companies.set(id, updated);
    return updated;
  }

  // Leave Type Operations
  async getAllLeaveTypes(): Promise<LeaveType[]> {
    return Array.from(this.leaveTypes.values());
  }

  async createLeaveType(type: InsertLeaveType): Promise<LeaveType> {
    const id = `leavetype-${Date.now()}`;
    const newType: LeaveType = { ...type, id };
    this.leaveTypes.set(id, newType);
    return newType;
  }

  // Leave Operations
  async getLeave(id: string): Promise<Leave | undefined> {
    return this.leaves.get(id);
  }

  async getLeavesByUser(userId: string): Promise<Leave[]> {
    return Array.from(this.leaves.values()).filter(l => l.userId === userId);
  }

  async getAllLeaves(): Promise<Leave[]> {
    return Array.from(this.leaves.values());
  }

  async getLeavesPendingApproval(managerId: string): Promise<Leave[]> {
    return Array.from(this.leaves.values()).filter(
      l => l.managerId === managerId && l.status === 'Open'
    );
  }

  async createLeave(leave: InsertLeave): Promise<Leave> {
    const id = `leave-${Date.now()}`;
    const newLeave: Leave = {
      ...leave,
      id,
      postingDate: new Date(),
      managerApprovalDate: null,
      managerComments: null,
    };
    this.leaves.set(id, newLeave);
    return newLeave;
  }

  async updateLeave(id: string, leave: Partial<InsertLeave>): Promise<Leave | undefined> {
    const existing = this.leaves.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...leave };
    this.leaves.set(id, updated);
    return updated;
  }

  async approveLeave(id: string, managerId: string, comments?: string): Promise<Leave | undefined> {
    const leave = this.leaves.get(id);
    if (!leave) return undefined;
    leave.status = 'Approved';
    leave.managerApprovalDate = new Date();
    if (comments) leave.managerComments = comments;

    // Update leave ledger usage
    await this.updateLeaveLedgerUsage(leave.userId, leave.leaveTypeId, new Date().getFullYear(), -1); // Assuming 1 day leave

    this.leaves.set(id, leave);
    return leave;
  }

  async rejectLeave(id: string, managerId: string, comments: string): Promise<Leave | undefined> {
    const leave = this.leaves.get(id);
    if (!leave) return undefined;
    leave.status = 'Rejected';
    leave.managerApprovalDate = new Date();
    leave.managerComments = comments;
    this.leaves.set(id, leave);
    return leave;
  }

  async updateLeaveLedgerUsage(userId: string, leaveTypeId: string, year: number, days: number): Promise<void> {
    const existingLedgers = Array.from(this.leaveLedgers.values()).filter(
      l => l.userId === userId && l.leaveTypeId === leaveTypeId && l.year === year
    );

    if (existingLedgers.length > 0) {
      const ledger = existingLedgers[0];
      ledger.daysUsed += days; // Add or subtract days
      this.leaveLedgers.set(ledger.id, ledger);
    } else {
      // If no ledger exists for this year, create one (this might need adjustment based on leave policy)
      const newLedger: InsertLeaveLedger = {
        userId: userId,
        leaveTypeId: leaveTypeId,
        year: year,
        totalDays: 0, // Assuming totalDays will be set elsewhere or is a default
        daysUsed: days,
      };
      await this.createLeaveLedger(newLedger);
    }
  }


  // Leave Ledger Operations
  async getLeaveLedgerByUser(userId: string): Promise<LeaveLedger[]> {
    return Array.from(this.leaveLedgers.values()).filter(l => l.userId === userId);
  }

  async createLeaveLedger(ledger: InsertLeaveLedger): Promise<LeaveLedger> {
    const id = `ledger-${Date.now()}`;
    const newLedger: LeaveLedger = { ...ledger, id };
    this.leaveLedgers.set(id, newLedger);
    return newLedger;
  }

  async updateLeaveLedger(id: string, ledger: Partial<InsertLeaveLedger>): Promise<LeaveLedger | undefined> {
    const existing = this.leaveLedgers.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...ledger };
    this.leaveLedgers.set(id, updated);
    return updated;
  }

  // Holiday Operations
  async getAllHolidays(): Promise<Holiday[]> {
    return Array.from(this.holidays.values());
  }

  async createHoliday(holiday: InsertHoliday): Promise<Holiday> {
    const id = `holiday-${Date.now()}`;
    const newHoliday: Holiday = { ...holiday, id, type: holiday.type || "National" };
    this.holidays.set(id, newHoliday);
    return newHoliday;
  }

  async updateHoliday(id: string, holiday: Partial<InsertHoliday>): Promise<Holiday | undefined> {
    const existing = this.holidays.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...holiday };
    this.holidays.set(id, updated);
    return updated;
  }

  async deleteHoliday(id: string): Promise<boolean> {
    return this.holidays.delete(id);
  }

  // Attendance Operations
  async getAttendance(id: string): Promise<Attendance | undefined> {
    return this.attendance.get(id);
  }

  async getAttendanceByUser(userId: string, fromDate?: string, toDate?: string): Promise<Attendance[]> {
    return Array.from(this.attendance.values()).filter(a => a.userId === userId);
  }

  async getAttendanceByDate(userId: string, date: string): Promise<Attendance | undefined> {
    return Array.from(this.attendance.values()).find(
      a => a.userId === userId && a.attendanceDate === date
    );
  }

  async getTodayAttendance(userId: string): Promise<Attendance | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.attendance.values()).find(
      a => a.userId === userId && a.attendanceDate === today
    );
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const id = `attendance-${Date.now()}`;
    const newAttendance: Attendance = { ...attendance, id };
    this.attendance.set(id, newAttendance);
    return newAttendance;
  }

  async updateAttendance(id: string, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const existing = this.attendance.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...attendance };
    this.attendance.set(id, updated);
    return updated;
  }

  async deleteAttendance(id: string): Promise<boolean> {
    return this.attendance.delete(id);
  }

  async checkIn(userId: string): Promise<Attendance> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTodayAttendance(userId);

    if (existing) {
      throw new Error('Already checked in today');
    }

    const now = new Date();
    const newAttendance: Attendance = {
      id: `attendance-${Date.now()}`,
      userId,
      attendanceDate: today,
      status: 'Present',
      leaveTypeId: null,
      companyId: null,
      checkIn: now,
      checkOut: null,
      earlySignIn: false,
      earlySignOut: false,
      lateSignIn: false,
      lateSignOut: false,
      shiftTiming: null,
      totalDuration: null,
      regularizationRequested: false,
      regularizationReason: null,
      regularizationStatus: null,
      regularizationApprovedBy: null,
      regularizationApprovedAt: null,
    };
    this.attendance.set(newAttendance.id, newAttendance);
    return newAttendance;
  }

  async checkOut(userId: string): Promise<Attendance | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.getTodayAttendance(userId);

    if (!existing || existing.checkOut) {
      return undefined;
    }

    const now = new Date();
    existing.checkOut = now;

    // Calculate duration in hours
    if (existing.checkIn) {
      const durationMs = now.getTime() - new Date(existing.checkIn).getTime();
      const durationHours = (durationMs / (1000 * 60 * 60)).toFixed(2);
      existing.totalDuration = durationHours;
    }

    this.attendance.set(existing.id, existing);
    return existing;
  }

  // Reimbursement Type Operations
  async getAllReimbursementTypes(): Promise<ReimbursementType[]> {
    return Array.from(this.reimbursementTypes.values());
  }

  async createReimbursementType(type: InsertReimbursementType): Promise<ReimbursementType> {
    const id = `reimbtype-${Date.now()}`;
    const newType: ReimbursementType = { ...type, id };
    this.reimbursementTypes.set(id, newType);
    return newType;
  }

  // Reimbursement Operations
  async getReimbursement(id: string): Promise<Reimbursement | undefined> {
    return this.reimbursements.get(id);
  }

  async getReimbursementsByUser(userId: string): Promise<Reimbursement[]> {
    return Array.from(this.reimbursements.values()).filter(r => r.userId === userId);
  }

  async getAllReimbursements(): Promise<Reimbursement[]> {
    return Array.from(this.reimbursements.values());
  }

  async getReimbursementsPendingManagerApproval(managerId: string): Promise<Reimbursement[]> {
    return Array.from(this.reimbursements.values()).filter(
      r => r.managerId === managerId && r.status === 'Pending' && !r.managerApprovalDate
    );
  }

  async getReimbursementsPendingAccountantApproval(): Promise<Reimbursement[]> {
    return Array.from(this.reimbursements.values()).filter(
      r => r.status === 'Manager Approved' && !r.accountantApprovalDate
    );
  }

  async createReimbursement(reimbursement: InsertReimbursement): Promise<Reimbursement> {
    const id = `reimb-${Date.now()}`;
    const newReimbursement: Reimbursement = {
      ...reimbursement,
      id,
      createdAt: new Date(),
      managerApprovalDate: null,
      managerComments: null,
      accountantApprovalDate: null,
      accountantComments: null,
    };
    this.reimbursements.set(id, newReimbursement);
    return newReimbursement;
  }

  async approveReimbursementByManager(id: string, managerId: string, comments?: string): Promise<Reimbursement | undefined> {
    const reimb = this.reimbursements.get(id);
    if (!reimb) return undefined;
    reimb.status = 'Manager Approved';
    reimb.managerApprovalDate = new Date();
    if (comments) reimb.managerComments = comments;
    this.reimbursements.set(id, reimb);
    return reimb;
  }

  async approveReimbursementByAccountant(id: string, accountantId: string, comments?: string): Promise<Reimbursement | undefined> {
    const reimb = this.reimbursements.get(id);
    if (!reimb) return undefined;
    reimb.status = 'Approved';
    reimb.accountantId = accountantId;
    reimb.accountantApprovalDate = new Date();
    if (comments) reimb.accountantComments = comments;
    this.reimbursements.set(id, reimb);
    return reimb;
  }

  async rejectReimbursement(id: string, userId: string, comments: string): Promise<Reimbursement | undefined> {
    const reimb = this.reimbursements.get(id);
    if (!reimb) return undefined;
    reimb.status = 'Rejected';
    if (!reimb.managerApprovalDate) {
      reimb.managerApprovalDate = new Date();
      reimb.managerComments = comments;
    } else {
      reimb.accountantApprovalDate = new Date();
      reimb.accountantComments = comments;
    }
    this.reimbursements.set(id, reimb);
    return reimb;
  }

  // Payroll Operations
  async getPayroll(id: string): Promise<Payroll | undefined> {
    return this.payrolls.get(id);
  }

  async getPayrollsByUser(userId: string): Promise<Payroll[]> {
    return Array.from(this.payrolls.values()).filter(p => p.userId === userId);
  }

  async getAllPayrolls(): Promise<Payroll[]> {
    return Array.from(this.payrolls.values());
  }

  async createPayroll(payroll: InsertPayroll): Promise<Payroll> {
    const id = `payroll-${Date.now()}`;
    const newPayroll: Payroll = {
      ...payroll,
      id,
      generatedAt: new Date(),
      approvedAt: null,
    };
    this.payrolls.set(id, newPayroll);
    return newPayroll;
  }

  async updatePayroll(id: string, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const existing = this.payrolls.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...payroll };
    this.payrolls.set(id, updated);
    return updated;
  }

  async approvePayroll(id: string, approverId: string): Promise<Payroll | undefined> {
    const payroll = this.payrolls.get(id);
    if (!payroll) return undefined;
    payroll.status = 'Approved';
    payroll.approvedBy = approverId;
    payroll.approvedAt = new Date();
    this.payrolls.set(id, payroll);
    return payroll;
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<{
    totalEmployees: number;
    presentToday: number;
    onLeave: number;
    pendingApprovals: number;
    pendingReimbursements: number;
    pendingRegularizations: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = Array.from(this.attendance.values()).filter(
      a => a.attendanceDate === today
    );

    return {
      totalEmployees: this.userProfiles.size,
      presentToday: todayAttendance.filter(a => a.status === 'Present').length,
      onLeave: todayAttendance.filter(a => a.status === 'On Leave').length,
      pendingApprovals: Array.from(this.leaves.values()).filter(l => l.status === 'Open').length,
      pendingReimbursements: Array.from(this.reimbursements.values()).filter(r => r.status === 'Pending').length,
      pendingRegularizations: todayAttendance.filter(a => a.regularizationRequested && a.regularizationStatus === null).length,
    };
  }

  // Role Management Methods
  async getAllRoles(): Promise<UserRole[]> {
    return Array.from(this.userRoles.values());
  }

  async createRole(data: Omit<UserRole, 'id'>): Promise<UserRole> {
    const id = randomUUID();
    const role: UserRole = {
      id,
      ...data,
    };
    this.userRoles.set(id, role);
    return role;
  }

  async updateRole(id: string, data: Partial<UserRole>): Promise<UserRole> {
    const role = this.userRoles.get(id);
    if (!role) {
      throw new Error('Role not found');
    }
    const updated = { ...role, ...data };
    this.userRoles.set(id, updated);
    return updated;
  }

  async deleteRole(id: string): Promise<void> {
    if (!this.userRoles.has(id)) {
      throw new Error('Role not found');
    }
    this.userRoles.delete(id);
  }

  async getAllEmployees(): Promise<UserProfile[]> {
    return Array.from(this.userProfiles.values());
  }
}

// Export PostgreSQL storage instead of in-memory storage
import { PostgresStorage } from './pg-storage';
export const storage = new PostgresStorage();