import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserProfileSchema, insertLeaveSchema, insertHolidaySchema, insertReimbursementSchema, insertPayrollSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { emailService } from "./email";
import session from "express-session";

// Simple in-memory session store (for production, use Redis or database-backed store)
import MemoryStore from 'memorystore';

declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole?: { accessLevel: string; roleName: string };
  }
}

const SessionStore = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'midcai-hrms-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // Set to false for development
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    next();
  };

  // Flexible role-based access control middleware
  // Accepts array of allowed access levels (Admin, HR, Manager, Accountant, Employee)
  const allowRoles = (...allowedAccessLevels: string[]) => {
    return async (req: any, res: any, next: any) => {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      try {
        const user = await storage.getUserProfile(req.session.userId);
        if (!user || !user.roleId) {
          return res.status(403).json({ message: "Access denied. Role not assigned." });
        }

        const role = await storage.getUserRole(user.roleId);
        if (!role) {
          return res.status(403).json({ message: "Access denied. Invalid role." });
        }

        // Admin has access to everything
        if (role.accessLevel === 'Admin') {
          return next();
        }

        // Check if user's access level is in the allowed list
        if (!allowedAccessLevels.includes(role.accessLevel)) {
          return res.status(403).json({ 
            message: `Access denied. This action requires ${allowedAccessLevels.join(' or ')} role.` 
          });
        }

        next();
      } catch (error) {
        console.error('Role check error:', error);
        res.status(500).json({ message: "Failed to verify access permissions" });
      }
    };
  };

  // Helper middleware for common permission combinations
  const requireAdmin = allowRoles('Admin');
  const requireHROrAdmin = allowRoles('HR', 'Admin');
  const requireManagerOrHROrAdmin = allowRoles('Manager', 'HR', 'Admin');
  const requireAccountantOrAdmin = allowRoles('Accountant', 'Admin');
  const requireManagerOrHROrAccountantOrAdmin = allowRoles('Manager', 'HR', 'Accountant', 'Admin');

  // Logout endpoint
  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
          return res.status(500).json({ message: "Logout failed" });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: "Logout failed" });
    }
  });

  // Get current user profile
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.session.userId;
      const user = await storage.getUserProfile(userId);

      if (!user) {
        // Clear invalid session
        req.session.destroy(() => {});
        return res.status(404).json({ message: "User not found" });
      }

      // Get user role information and update session
      let roleName = 'Employee';
      let accessLevel = 'Employee';
      if (user.roleId) {
        const role = await storage.getUserRole(user.roleId);
        if (role) {
          roleName = role.roleName;
          accessLevel = role.accessLevel;
          // Update session with latest role info
          req.session.userRole = {
            accessLevel: role.accessLevel,
            roleName: role.roleName
          };
        }
      }

      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        roleName,
        accessLevel,
        roleId: user.roleId,
        departmentId: user.departmentId,
      };

      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await storage.getUserProfileByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Compare hashed passwords
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if user account is active
      if (user.status !== "Active") {
        return res.status(403).json({ message: "Account is inactive. Please contact administrator." });
      }

      // Get user role information and store in session
      let roleName = 'Employee';
      let roleInfo = null;
      if (user.roleId) {
        const role = await storage.getUserRole(user.roleId);
        if (role) {
          roleName = role.roleName;
          roleInfo = {
            accessLevel: role.accessLevel,
            roleName: role.roleName
          };
        }
      }

      // Store user ID and role in session
      req.session.userId = user.id;
      req.session.userRole = roleInfo;

      // Save session explicitly to ensure it persists
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const userResponse = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        roleName,
      };

      res.json(userResponse);
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Role routes - Admin only per permission matrix
  app.get("/api/roles", requireAdmin, async (req, res) => {
    try {
      const roles = await storage.getAllUserRoles();
      res.json(roles);
    } catch (error: any) {
      console.error("Failed to fetch roles:", error);
      res.status(500).json({ message: error.message || "Failed to fetch roles" });
    }
  });

  app.post("/api/roles", requireAdmin, async (req, res) => {
    try {
      const role = await storage.createUserRole(req.body);
      res.status(201).json(role);
    } catch (error: any) {
      console.error("Failed to create role:", error);
      res.status(400).json({ message: error.message || "Failed to create role" });
    }
  });

  app.put("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const role = await storage.updateRole(id, req.body);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }
      res.json(role);
    } catch (error: any) {
      console.error("Failed to update role:", error);
      res.status(400).json({ message: error.message || "Failed to update role" });
    }
  });

  app.delete("/api/roles/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;

      // Check if role exists
      const role = await storage.getUserRole(id);
      if (!role) {
        return res.status(404).json({ message: "Role not found" });
      }

      // Check if any employees are assigned to this role
      const employees = await storage.getAllUserProfiles();
      const hasEmployees = employees.some(emp => emp.roleId === id);

      if (hasEmployees) {
        return res.status(400).json({ 
          message: "Cannot delete role. Employees are assigned to this role." 
        });
      }

      await storage.deleteRole(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Failed to delete role:", error);
      res.status(400).json({ message: error.message || "Failed to delete role" });
    }
  });


  // Employee Management Routes - Managers, HR, Accountant and Admin can view; HR and Admin can manage
  app.get("/api/employees", requireManagerOrHROrAccountantOrAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllUserProfiles();

      // Remove passwordHash from all employee records before returning
      const sanitizedEmployees = employees.map(({ passwordHash, ...employee }) => employee);

      res.json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", requireAdmin, async (req, res) => {
    try {
      // Validate request body with schema (it expects password field)
      const validated = insertUserProfileSchema.parse(req.body);

      // Store the plain password before hashing for email notification
      const plainPassword = validated.password;

      // Create employee with validated data (storage will hash password)
      const employee = await storage.createUserProfile(validated);

      // Send welcome email to new employee
      try {
        if (employee.email && plainPassword) {
          await emailService.sendNewEmployeeWelcome(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            employee.username,
            plainPassword,
            employee.joiningDate || undefined
          );
        }
      } catch (emailError) {
        console.error('Failed to send welcome email to new employee:', emailError);
        // Continue even if email fails - don't block employee creation
      }

      // Return employee data without password hash
      const { passwordHash, ...employeeData } = employee;
      res.status(201).json(employeeData);
    } catch (error: any) {
      console.error('Employee creation error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors
        });
      }
      res.status(400).json({ message: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", requireHROrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { password, ...otherFields } = req.body;

      // Build update payload - include password only if provided
      const updates: any = { ...otherFields };
      if (password && password.trim()) {
        updates.password = password;
      }

      // Validate the update payload (partial schema validation)
      // For PATCH, we only validate fields that are present
      const updateSchema = insertUserProfileSchema.partial();
      const validated = updateSchema.parse(updates);

      // Update employee (storage will hash password if provided)
      const employee = await storage.updateUserProfile(id, validated);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Return employee data without password hash
      const { passwordHash, ...employeeData } = employee;
      res.json(employeeData);
    } catch (error: any) {
      console.error('Employee update error:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({
          message: "Validation failed",
          errors: error.errors
        });
      }
      res.status(400).json({ message: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const currentUserId = req.session.userId!;

      // Prevent deleting yourself
      if (id === currentUserId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const deleted = await storage.deleteUserProfile(id);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Employee deletion error:', error);
      res.status(500).json({ message: error.message || "Failed to delete employee" });
    }
  });

  // Hierarchy Routes
  // Assign manager to employee - HR and Admin only
  app.post("/api/employees/:employeeId/assign-manager", requireHROrAdmin, async (req, res) => {
    try {
      const { employeeId } = req.params;
      const { managerId } = req.body;

      if (!managerId) {
        return res.status(400).json({ message: "Manager ID is required" });
      }

      const updatedEmployee = await storage.assignManager(employeeId, managerId);

      if (!updatedEmployee) {
        return res.status(404).json({ message: "Failed to assign manager" });
      }

      // Remove passwordHash before returning
      const { passwordHash, ...employeeData } = updatedEmployee;
      res.json({
        message: "Manager assigned successfully",
        employee: employeeData
      });
    } catch (error: any) {
      console.error('Manager assignment error:', error);
      res.status(400).json({ message: error.message || "Failed to assign manager" });
    }
  });

  // Get subordinates of a manager - Managers can see their subordinates, HR/Admin can see all
  app.get("/api/employees/:managerId/subordinates", allowRoles('Admin', 'HR', 'Manager'), async (req, res) => {
    try {
      const { managerId } = req.params;
      const currentUserId = req.session.userId!;
      let userRole = req.session.userRole;

      // Fallback: fetch role from storage if not in session
      if (!userRole) {
        const user = await storage.getUserProfile(currentUserId);
        if (user?.roleId) {
          const role = await storage.getUserRole(user.roleId);
          if (role) {
            userRole = {
              accessLevel: role.accessLevel,
              roleName: role.roleName
            };
            req.session.userRole = userRole;
          }
        }
      }

      // Managers can only view their own subordinates, HR/Admin can view any manager's subordinates
      if (userRole?.accessLevel === 'Manager' && managerId !== currentUserId) {
        return res.status(403).json({ message: "You can only view your own subordinates" });
      }

      const subordinates = await storage.getSubordinates(managerId);

      // Remove passwordHash from all subordinates
      const sanitizedSubordinates = subordinates.map(({ passwordHash, ...employee }) => employee);

      res.json(sanitizedSubordinates);
    } catch (error: any) {
      console.error('Get subordinates error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch subordinates" });
    }
  });

  // Get full hierarchy tree - All authenticated users can view
  app.get("/api/hierarchy/tree", requireAuth, async (req, res) => {
    try {
      const hierarchyTree = await storage.getHierarchyTree();
      res.json(hierarchyTree);
    } catch (error: any) {
      console.error('Hierarchy tree error:', error);
      res.status(500).json({ message: error.message || "Failed to fetch hierarchy tree" });
    }
  });

  // Dashboard Routes - All authenticated users can view
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const employee = await storage.getUserProfile(userId);

      let role = null;
      if (employee?.roleId) {
        role = await storage.getUserRole(employee.roleId);
      }

      const allEmployees = await storage.getAllUserProfiles();
      const totalEmployees = allEmployees.length;

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const allAttendance = await storage.getAllAttendance();
      const todayAttendance = allAttendance.filter(a => 
        a.checkInTime && a.checkInTime.toISOString().split('T')[0] === today
      );
      const presentToday = todayAttendance.length;

      // Get today's leaves
      const allLeaves = await storage.getAllLeaves();
      const todayLeaves = allLeaves.filter(leave => {
        if (leave.status !== "Approved") return false;
        const leaveStart = new Date(leave.fromDate);
        const leaveEnd = new Date(leave.toDate);
        const todayDate = new Date(today);
        return todayDate >= leaveStart && todayDate <= leaveEnd;
      });
      const onLeave = todayLeaves.length;

      // Get pending approvals for managers
      let pendingApprovals = 0;
      let pendingReimbursements = 0;
      let pendingRegularizations = 0;
      let myLeaveBalance = 0;
      let myReimbursements = 0;
      let myAttendance = 0;

      if (role && (role.accessLevel === 'Manager' || role.accessLevel === 'Admin')) {
        const pendingLeaves = allLeaves.filter(leave => leave.status === "Open");
        pendingApprovals = pendingLeaves.length;

        const allReimbursements = await storage.getAllReimbursements();
        const pendingReimb = allReimbursements.filter(r => r.status === "Open");
        pendingReimbursements = pendingReimb.length;

        const pendingAtt = allAttendance.filter(a => 
          a.status === "Pending" && a.checkInTime === null
        );
        pendingRegularizations = pendingAtt.length;
      }

      // Employee-specific stats
      const currentYear = new Date().getFullYear();
      const leaveLedgers = await storage.getLeaveLedgerByUser(userId, currentYear);
      myLeaveBalance = leaveLedgers.reduce((sum, ledger) => {
        const total = parseFloat(ledger.totalLeaves || "0");
        const used = parseFloat(ledger.usedLeaves || "0");
        return sum + (total - used);
      }, 0);

      // My reimbursements (pending)
      const allReimbursements = await storage.getAllReimbursements();
      myReimbursements = allReimbursements.filter(r => 
        r.userId === userId && r.status === "Open"
      ).length;

      // My attendance this month
      const currentMonth = new Date().getMonth();
      const currentMonthYear = new Date().getFullYear();
      myAttendance = allAttendance.filter(a => {
        if (a.userId !== userId || !a.checkInTime) return false;
        const attDate = new Date(a.checkInTime);
        return attDate.getMonth() === currentMonth && attDate.getFullYear() === currentMonthYear;
      }).length;

      res.json({
        totalEmployees,
        presentToday,
        onLeave,
        pendingApprovals,
        pendingReimbursements,
        pendingRegularizations,
        myLeaveBalance,
        myReimbursements,
        myAttendance,
      });
    } catch (error: any) {
      console.error('Failed to fetch dashboard stats:', error);
      res.status(500).json({ message: error.message || "Failed to fetch dashboard stats" });
    }
  });

  // Attendance Routes
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const fromDate = req.query.fromDate as string | undefined;
      const toDate = req.query.toDate as string | undefined;

      const attendance = await storage.getAttendanceByUser(userId, fromDate, toDate);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/today-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const todayStatus = await storage.getTodayAttendance(userId);
      res.json(todayStatus || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's status" });
    }
  });

  app.post("/api/attendance/check-in", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split('T')[0];

      // Check if there's an approved leave for today
      const allLeaves = await storage.getLeavesByUser(userId);
      const approvedLeave = allLeaves.find(leave => {
        if (leave.status !== 'Approved') return false;
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const todayDate = new Date(today);
        return todayDate >= fromDate && todayDate <= toDate;
      });

      if (approvedLeave) {
        return res.status(400).json({ 
          message: "Cannot check-in. You have an approved leave for today." 
        });
      }

      const attendance = await storage.checkIn(userId);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Check-in failed" });
    }
  });

  app.post("/api/attendance/check-out", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const attendance = await storage.checkOut(userId);
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Check-out failed" });
    }
  });

  app.post("/api/attendance/manual", requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session.userId!;
      let userRole = req.session.userRole;
      const { userId: targetUserId, attendanceDate, status, checkIn, checkOut } = req.body;

      // Fallback: fetch role from storage if not in session (for backward compatibility with existing sessions)
      if (!userRole) {
        const user = await storage.getUserProfile(currentUserId);
        if (user?.roleId) {
          const role = await storage.getUserRole(user.roleId);
          if (role) {
            userRole = {
              accessLevel: role.accessLevel,
              roleName: role.roleName
            };
            // Update session for future requests
            req.session.userRole = userRole;
          }
        }
      }

      // Managers, HR, and Admins can create attendance for team members; employees only for themselves
      const canManageTeam = ['Admin', 'HR', 'Manager'].includes(userRole?.accessLevel || '');
      const effectiveUserId = (canManageTeam && targetUserId) ? targetUserId : currentUserId;

      // Check if there's an approved leave for this date
      const allLeaves = await storage.getLeavesByUser(effectiveUserId);
      const approvedLeave = allLeaves.find(leave => {
        if (leave.status !== 'Approved') return false;
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const attendDate = new Date(attendanceDate);
        return attendDate >= fromDate && attendDate <= toDate;
      });

      if (approvedLeave && status !== 'On Leave') {
        return res.status(400).json({ 
          message: "Cannot mark attendance as Present. Employee has an approved leave for this date." 
        });
      }

      // Check if attendance already exists for this date
      const existingAttendance = await storage.getAttendanceByDate(effectiveUserId, attendanceDate);
      if (existingAttendance) {
        return res.status(400).json({ 
          message: "Attendance record already exists for this date. Please edit the existing record instead." 
        });
      }

      // Convert time strings to proper Date objects or null
      let checkInDate = null;
      let checkOutDate = null;
      let totalDuration = null;

      if (checkIn) {
        checkInDate = new Date(checkIn);
      }

      if (checkOut) {
        checkOutDate = new Date(checkOut);
      }

      // Calculate duration if both check in and check out are provided
      if (checkInDate && checkOutDate) {
        const durationMs = checkOutDate.getTime() - checkInDate.getTime();
        totalDuration = (durationMs / (1000 * 60 * 60)).toFixed(2);
      }

      const attendance = await storage.createAttendance({
        userId: effectiveUserId,
        attendanceDate,
        status,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        totalDuration,
        earlySignIn: false,
        earlySignOut: false,
        lateSignIn: false,
        lateSignOut: false,
        regularizationRequested: false,
      });

      res.status(201).json(attendance);
    } catch (error: any) {
      console.error('Attendance creation error:', error);
      res.status(400).json({ message: error.message || "Failed to create attendance" });
    }
  });

  app.patch("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { attendanceDate, status, checkIn, checkOut } = req.body;

      // Get the existing attendance record
      const existingAttendance = await storage.getAttendance(id);
      if (!existingAttendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // Check the date being updated (use new date if provided, otherwise use existing)
      const dateToCheck = attendanceDate || existingAttendance.attendanceDate;

      // Check if there's an approved leave for this date
      const allLeaves = await storage.getLeavesByUser(userId);
      const approvedLeave = allLeaves.find(leave => {
        if (leave.status !== 'Approved') return false;
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const attendDate = new Date(dateToCheck);
        return attendDate >= fromDate && attendDate <= toDate;
      });

      // If there's an approved leave and user is trying to change status to something other than "On Leave"
      if (approvedLeave && status && status !== 'On Leave') {
        return res.status(400).json({ 
          message: "Cannot mark attendance as Present. You have an approved leave for this date." 
        });
      }

      // Convert time strings to proper Date objects or null
      let checkInDate = undefined;
      let checkOutDate = undefined;
      let totalDuration = null;

      if (checkIn !== undefined) {
        checkInDate = checkIn ? new Date(checkIn) : null;
      }

      if (checkOut !== undefined) {
        checkOutDate = checkOut ? new Date(checkOut) : null;
      }

      // Calculate duration if both check in and check out are provided
      if (checkInDate && checkOutDate) {
        const durationMs = checkOutDate.getTime() - checkInDate.getTime();
        totalDuration = (durationMs / (1000 * 60 * 60)).toFixed(2);
      }

      const updates: any = {};
      if (attendanceDate) updates.attendanceDate = attendanceDate;
      if (status) updates.status = status;
      if (checkInDate !== undefined) updates.checkIn = checkInDate;
      if (checkOutDate !== undefined) updates.checkOut = checkOutDate;
      if (totalDuration !== null) updates.totalDuration = totalDuration;

      const attendance = await storage.updateAttendance(id, updates);
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(attendance);
    } catch (error: any) {
      console.error('Attendance update error:', error);
      res.status(400).json({ message: error.message || "Failed to update attendance" });
    }
  });

  app.delete("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const currentUserId = req.session.userId!;
      const userRole = req.session.userRole;
      const { id } = req.params;

      // Get the attendance record
      const attendance = await storage.getAttendance(id);
      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // Managers, HR, and Admins can delete team attendance; employees can only delete their own
      const canDelete = attendance.userId === currentUserId || 
                       ['Admin', 'HR', 'Manager'].includes(userRole?.accessLevel || '');

      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Allow deletion of "On Leave" records without restriction
      // This allows employees to delete attendance created by approved leaves
      if (attendance.status === 'On Leave') {
        const deleted = await storage.deleteAttendance(id);
        if (!deleted) {
          return res.status(500).json({ message: "Failed to delete attendance record" });
        }
        res.status(204).send();
        return;
      }

      // For other statuses, check if there's an approved leave for this date
      const allLeaves = await storage.getLeavesByUser(attendance.userId);
      const approvedLeave = allLeaves.find(leave => {
        if (leave.status !== 'Approved') return false;
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const attendDate = new Date(attendance.attendanceDate);
        return attendDate >= fromDate && attendDate <= toDate;
      });

      if (approvedLeave) {
        return res.status(400).json({ 
          message: "Cannot delete this attendance record. You have an approved leave for this date. Please reject or cancel the leave first." 
        });
      }

      // Delete the attendance record
      const deleted = await storage.deleteAttendance(id);

      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete attendance record" });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('Attendance deletion error:', error);
      res.status(400).json({ message: error.message || "Failed to delete attendance" });
    }
  });

  app.post("/api/attendance/:id/regularize", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({ message: "Reason is required" });
      }

      const attendance = await storage.updateAttendance(id, {
        regularizationRequested: true,
        regularizationReason: reason,
        regularizationStatus: 'Pending',
      });

      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      // Send email notification to appropriate approver
      try {
        const employee = await storage.getUserProfile(userId);
        let approver = null;

        // Check if employee is Manager or Project Management role
        if (employee?.roleId) {
          const employeeRole = await storage.getUserRole(employee.roleId);

          // If Manager or Project Management, find Super Admin
          if (employeeRole && (employeeRole.accessLevel === 'Manager' || employeeRole.level === 2)) {
            const allEmployees = await storage.getAllUserProfiles();

            for (const emp of allEmployees) {
              if (emp.roleId && emp.id !== userId) {
                const role = await storage.getUserRole(emp.roleId);
                if (role && role.level === 1 && role.accessLevel === 'Admin') {
                  approver = emp;
                  break;
                }
              }
            }
          } else {
            // For regular employees, use their direct manager
            approver = employee?.managerId ? await storage.getUserProfile(employee.managerId) : null;
          }
        }

        if (employee && approver && approver.email) {
          await emailService.sendAttendanceRegularizationNotification(
            `${employee.firstName} ${employee.lastName}`,
            approver.email,
            attendance.attendanceDate,
            reason
          );
        }
      } catch (emailError) {
        console.error('Failed to send regularization notification email:', emailError);
        // Continue even if email fails
      }

      res.json(attendance);
    } catch (error: any) {
      console.error('Regularization request error:', error);
      res.status(400).json({ message: error.message || "Failed to request regularization" });
    }
  });

  app.patch("/api/attendance/:id/regularize/approve", allowRoles('Manager', 'Admin'), async (req, res) => {
    try {
      const approverId = req.session.userId!;
      const { id } = req.params;
      const { comments } = req.body;

      const attendance = await storage.updateAttendance(id, {
        regularizationStatus: 'Approved',
        regularizationApprovedBy: approverId,
        regularizationApprovedAt: new Date(),
      });

      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(attendance);
    } catch (error: any) {
      console.error('Regularization approval error:', error);
      res.status(400).json({ message: error.message || "Failed to approve regularization" });
    }
  });

  app.patch("/api/attendance/:id/regularize/reject", allowRoles('Manager', 'Admin'), async (req, res) => {
    try {
      const approverId = req.session.userId!;
      const { id } = req.params;
      const { comments } = req.body;

      if (!comments) {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      const attendance = await storage.updateAttendance(id, {
        regularizationStatus: 'Rejected',
        regularizationApprovedBy: approverId,
        regularizationApprovedAt: new Date(),
      });

      if (!attendance) {
        return res.status(404).json({ message: "Attendance record not found" });
      }

      res.json(attendance);
    } catch (error: any) {
      console.error('Regularization rejection error:', error);
      res.status(400).json({ message: error.message || "Failed to reject regularization" });
    }
  });

  // Leave Routes
  app.get("/api/leaves", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const currentUser = await storage.getUserProfile(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      let userRole = req.session.userRole;
      let currentUserRoleLevel = null;

      // Fallback: fetch role from storage if not in session
      if (!userRole && currentUser.roleId) {
        const role = await storage.getUserRole(currentUser.roleId);
        if (role) {
          userRole = {
            accessLevel: role.accessLevel,
            roleName: role.roleName
          };
          currentUserRoleLevel = role.level;
          req.session.userRole = userRole;
        }
      } else if (userRole && currentUser.roleId) {
        const role = await storage.getUserRole(currentUser.roleId);
        if (role) {
          currentUserRoleLevel = role.level;
        }
      }

      // Managers, HR, and Admins see all leaves from their team/department
      const canViewTeamLeaves = ['Admin', 'HR', 'Manager'].includes(userRole?.accessLevel || '');

      let leaves;
      if (canViewTeamLeaves) {
        // Get all leaves
        const allLeaves = await storage.getAllLeaves();
        const allEmployees = await storage.getAllUserProfiles();

        // Admin access level users see ALL leaves
        if (userRole?.accessLevel === 'Admin') {
          leaves = allLeaves;
        } else if (userRole?.accessLevel === 'HR') {
          // HR see all leaves
          leaves = allLeaves;
        } else if (userRole?.accessLevel === 'Manager') {
          // For managers, filter to show leaves from their department or assigned to them
          leaves = allLeaves.filter(leave => {
            // Include own leaves
            if (leave.userId === userId) {
              return true;
            }

            // Include leaves assigned to this manager
            if (leave.managerId === userId) {
              return true;
            }

            // Include leaves from employees in same department
            if (currentUser.departmentId) {
              const applicant = allEmployees.find(emp => emp.id === leave.userId);
              if (applicant?.departmentId === currentUser.departmentId) {
                return true;
              }
            }

            return false;
          });
        } else {
          // Fallback: show all leaves for elevated roles
          leaves = allLeaves;
        }
      } else {
        // Employees see only their own leaves
        leaves = await storage.getLeavesByUser(userId);
      }

      res.json(leaves);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      res.status(500).json({ message: "Failed to fetch leaves" });
    }
  });

  app.get("/api/approvals/leaves", allowRoles('Manager', 'Admin'), async (req, res) => {
    try {
      const userId = req.session.userId!;
      const currentUser = await storage.getUserProfile(userId);

      console.log('User viewing approvals:', {
        userId: userId,
        userName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown',
        departmentId: currentUser?.departmentId,
        roleId: currentUser?.roleId
      });

      if (!currentUser) {
        console.log('User profile not found');
        return res.json([]);
      }

      // Get current user's role level
      let currentUserRoleLevel = null;
      let currentUserAccessLevel = null;
      if (currentUser.roleId) {
        const role = await storage.getUserRole(currentUser.roleId);
        if (role) {
          currentUserRoleLevel = role.level;
          currentUserAccessLevel = role.accessLevel;
        }
      }

      // Get all leaves and employees
      const allLeaves = await storage.getAllLeaves();
      const allEmployees = await storage.getAllUserProfiles();

      console.log('Total leaves in system:', allLeaves.length);
      console.log('Total employees in system:', allEmployees.length);
      console.log('Current user level:', currentUserRoleLevel);
      console.log('Current user access level:', currentUserAccessLevel);

      // Filter leaves based on user's role level
      const pendingLeaves = allLeaves.filter(leave => {
        // Only show 'Open' status leaves
        if (leave.status !== 'Open') {
          return false;
        }

        // Never show user's own leave requests in approvals
        if (leave.userId === userId) {
          return false;
        }

        // Find the employee who applied for leave
        const applicant = allEmployees.find(emp => emp.id === leave.userId);

        if (!applicant) {
          console.log('Applicant not found for leave:', leave.id);
          return false;
        }

        // Show leaves that are assigned to this user
        const isAssignedToUser = leave.managerId === userId;

        // For Admin access level users, show all pending leaves (they can approve everything)
        if (currentUserAccessLevel === 'Admin') {
          console.log('Including leave for Admin approver:', {
            leaveId: leave.id,
            applicantName: `${applicant.firstName} ${applicant.lastName}`,
            assignedManagerId: leave.managerId,
            isAssignedToAdmin: isAssignedToUser
          });
          return true;
        }

        // For Level 1 users (who are not Admin access level), show leaves assigned to them
        if (currentUserRoleLevel === 1) {
          const shouldShow = isAssignedToUser;

          if (shouldShow) {
            console.log('Including leave for Level 1 approver:', {
              leaveId: leave.id,
              applicantName: `${applicant.firstName} ${applicant.lastName}`,
              reason: 'Assigned to this Level 1 user',
              assignedManagerId: leave.managerId
            });
          }

          return shouldShow;
        } else if (currentUserAccessLevel === 'Manager') {
          // For managers, filter to show leaves assigned to them or in same department (but not their own)
          const inSameDepartment = currentUser.departmentId && applicant.departmentId === currentUser.departmentId;
          const shouldShow = isAssignedToUser || inSameDepartment;

          if (shouldShow) {
            console.log('Including leave for Manager:', {
              leaveId: leave.id,
              applicantName: `${applicant.firstName} ${applicant.lastName}`,
              reason: isAssignedToUser ? 'Assigned to manager' : 'Same department',
              applicantDept: applicant.departmentId,
              managerDept: currentUser.departmentId,
              assignedManagerId: leave.managerId
            });
          }

          return shouldShow;
        }

        return false;
      });

      console.log('Pending leaves returned:', pendingLeaves.length);
      res.json(pendingLeaves);
    } catch (error) {
      console.error('Failed to fetch pending leaves:', error);
      res.status(500).json({ message: "Failed to fetch pending leaves" });
    }
  });

  app.get("/api/leave-balance", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const balance = await storage.getLeaveLedgerByUser(userId);
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave balance" });
    }
  });

  app.post("/api/leaves", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userId: _, ...leaveData } = req.body; // Remove userId from body

      // Get employee's role and department
      const employee = await storage.getUserProfile(userId);
      let managerId = null;

      console.log('Employee applying for leave:', {
        userId,
        departmentId: employee?.departmentId,
        directManagerId: employee?.managerId,
        roleId: employee?.roleId
      });

      // Get the employee's role to check their level and access
      let employeeRole = null;
      if (employee?.roleId) {
        employeeRole = await storage.getUserRole(employee.roleId);
        console.log('Employee role:', {
          roleName: employeeRole?.roleName,
          accessLevel: employeeRole?.accessLevel,
          level: employeeRole?.level
        });
      }

      // If employee is Manager or has Manager access level, assign to Super Admin (Level 1)
      if (employeeRole && (employeeRole.accessLevel === 'Manager' || employeeRole.level === 2)) {
        const allEmployees = await storage.getAllUserProfiles();

        // Find a Super Admin (Level 1) to approve the leave
        for (const emp of allEmployees) {
          if (emp.roleId && emp.id !== userId) {
            const role = await storage.getUserRole(emp.roleId);
            if (role && role.level === 1 && role.accessLevel === 'Admin') {
              managerId = emp.id;
              console.log('Found Super Admin approver for Manager/Project Management:', {
                managerId: emp.id,
                managerName: `${emp.firstName} ${emp.lastName}`,
                managerRole: role.roleName
              });
              break;
            }
          }
        }
      } else if (employee?.departmentId) {
        // For other employees, find manager in the same department
        const allEmployees = await storage.getAllUserProfiles();

        for (const emp of allEmployees) {
          if (emp.departmentId === employee.departmentId && 
              emp.roleId && 
              emp.id !== userId) {

            // Check if this employee has a Manager role
            const role = await storage.getUserRole(emp.roleId);
            if (role && role.accessLevel === 'Manager') {
              managerId = emp.id;
              console.log('Found department manager:', {
                managerId: emp.id,
                managerName: `${emp.firstName} ${emp.lastName}`,
                department: emp.departmentId
              });
              break; // Found a manager in the same department
            }
          }
        }
      }

      // Fallback to direct manager if no department manager found
      if (!managerId && employee?.managerId) {
        managerId = employee.managerId;
        console.log('Using direct manager as fallback:', managerId);
      }

      if (!managerId) {
        console.log('No manager found for leave approval');
      }

      // Check if employee has already marked attendance as Present for any day in the leave period
      const fromDate = new Date(leaveData.fromDate);
      const toDate = new Date(leaveData.toDate);
      const presentDates: string[] = [];

      for (let date = new Date(fromDate); date <= toDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const existingAttendance = await storage.getAttendanceByDate(userId, dateStr);

        if (existingAttendance && existingAttendance.status === 'Present') {
          presentDates.push(dateStr);
        }
      }

      if (presentDates.length > 0) {
        return res.status(400).json({
          message: `Cannot apply for leave. You have already marked attendance as Present for the following dates: ${presentDates.join(', ')}. Please remove those attendance records first.`
        });
      }

      // Check if the leave dates overlap with any holidays
      const allHolidays = await storage.getAllHolidays();
      const conflictingHolidays: string[] = [];

      for (let date = new Date(fromDate); date <= toDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];

        // Check if this date falls within any holiday period
        for (const holiday of allHolidays) {
          const holidayFrom = new Date(holiday.fromDate);
          const holidayTo = new Date(holiday.toDate);
          const checkDate = new Date(dateStr);

          if (checkDate >= holidayFrom && checkDate <= holidayTo) {
            conflictingHolidays.push(`${dateStr} (${holiday.name})`);
            break; // No need to check other holidays for this date
          }
        }
      }

      if (conflictingHolidays.length > 0) {
        return res.status(400).json({
          message: `Cannot apply for leave on holidays. The following dates are holidays: ${conflictingHolidays.join(', ')}. Please exclude these dates from your leave application.`
        });
      }

      // Calculate requested leave days
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const requestedDays = leaveData.halfDay ? 0.5 : daysDiff;

      // Check leave balance
      const leaveLedger = await storage.getLeaveLedgerByUser(userId);
      const currentYearLedger = leaveLedger.find(
        l => l.leaveTypeId === leaveData.leaveTypeId && l.year === new Date().getFullYear()
      );

      if (currentYearLedger) {
        const totalLeaves = parseFloat(currentYearLedger.totalLeaves || '0');
        const usedLeaves = parseFloat(currentYearLedger.usedLeaves || '0');
        const availableLeaves = totalLeaves - usedLeaves;

        console.log('Leave balance check:', {
          userId,
          leaveTypeId: leaveData.leaveTypeId,
          totalLeaves,
          usedLeaves,
          availableLeaves,
          requestedDays
        });

        if (requestedDays > availableLeaves) {
          return res.status(400).json({ 
            message: `Insufficient leave balance. You have ${availableLeaves} days available but requested ${requestedDays} days.` 
          });
        }
      } else {
        console.warn('No leave ledger found for user, proceeding without balance check');
      }

      const validated = insertLeaveSchema.parse({
        ...leaveData,
        userId, // Use authenticated user's ID
        managerId, // Set manager from department or direct manager
      });
      const leave = await storage.createLeave(validated);

      console.log('Leave created:', {
        leaveId: leave.id,
        userId: leave.userId,
        managerId: leave.managerId,
        status: leave.status
      });

      // Send email notification to manager
      try {
        const manager = leave.managerId ? await storage.getUserProfile(leave.managerId) : null;
        const leaveType = await storage.getAllLeaveTypes();
        const leaveTypeName = leaveType.find(lt => lt.id === leave.leaveTypeId)?.name || 'Leave';

        if (employee && manager && manager.email) {
          await emailService.sendLeaveApplicationNotification(
            `${employee.firstName} ${employee.lastName}`,
            manager.email,
            leaveTypeName,
            leave.fromDate,
            leave.toDate,
            leave.reason || 'No reason provided'
          );
        }
      } catch (emailError) {
        console.error('Failed to send leave application email:', emailError);
        // Continue even if email fails
      }

      res.status(201).json(leave);
    } catch (error) {
      console.error('Leave creation error:', error);
      res.status(400).json({ message: "Failed to apply for leave" });
    }
  });

  // Updated PUT /api/leaves/:id route to handle attendance synchronization
  app.put("/api/leaves/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const updateData = req.body;

      // Fetch leave details before update to compare status changes
      const existingLeave = await storage.getLeave(id);
      if (!existingLeave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      const leave = await storage.updateLeave(id, updateData);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // If leave status changed to 'Approved' and it wasn't already approved
      if (updateData.status === 'Approved' && existingLeave.status !== 'Approved') {
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);

        // Update leave ledger - deduct used leaves
        try {
          const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const leaveDays = leave.halfDay ? 0.5 : daysDiff;

          console.log('Leave status changed to Approved - updating ledger:', {
            userId: leave.userId,
            leaveTypeId: leave.leaveTypeId,
            fromDate: leave.fromDate,
            toDate: leave.toDate,
            daysDiff,
            leaveDays,
            halfDay: leave.halfDay
          });

          await storage.updateLeaveLedgerUsage(
            leave.userId,
            leave.leaveTypeId,
            new Date().getFullYear(),
            leaveDays
          );
        } catch (ledgerError) {
          console.error('Failed to update leave ledger:', ledgerError);
        }

        // Create attendance records for each day in the leave period
        const currentDate = new Date(fromDate);
        while (currentDate <= toDate) {
          const dateStr = currentDate.toISOString().split('T')[0];

          // Check if attendance already exists for this date
          const existingAttendance = await storage.getAttendanceByDate(leave.userId, dateStr);

          if (!existingAttendance) {
            // Create "On Leave" attendance record
            await storage.createAttendance({
              userId: leave.userId,
              attendanceDate: dateStr,
              status: 'On Leave',
              leaveTypeId: leave.leaveTypeId, // Associate with leave type
              companyId: leave.companyId || null, // Include companyId if available
              checkIn: null,
              checkOut: null,
              totalDuration: leave.halfDay ? '4' : '8', // Set duration based on half/full day
              earlySignIn: false,
              earlySignOut: false,
              lateSignIn: false,
              lateSignOut: false,
              regularizationRequested: false,
              shiftTiming: null,
              regularizationReason: null,
              regularizationStatus: null,
              regularizationApprovedBy: null,
              regularizationApprovedAt: null,
            });
          } else if (existingAttendance.status === 'Present') {
            // Update existing "Present" record to "On Leave"
            await storage.updateAttendance(existingAttendance.id, {
              status: 'On Leave',
              leaveTypeId: leave.leaveTypeId, // Associate with leave type
              totalDuration: leave.halfDay ? '4' : '8', // Update duration
            });
          }
          // Move to the next day
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else if (updateData.status === 'Rejected' && existingLeave.status === 'Approved') {
        // If previously approved leave is now rejected, reverse the leave ledger
        try {
          const fromDate = new Date(leave.fromDate);
          const toDate = new Date(leave.toDate);
          const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const leaveDays = leave.halfDay ? 0.5 : daysDiff;

          await storage.updateLeaveLedgerUsage(
            leave.userId,
            leave.leaveTypeId,
            new Date().getFullYear(),
            -leaveDays // Negative to add back the leaves
          );
        } catch (ledgerError) {
          console.error('Failed to reverse leave ledger:', ledgerError);
        }

        // Remove any "On Leave" attendance records for the period
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const currentDate = new Date(fromDate);

        while (currentDate <= toDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const existingAttendance = await storage.getAttendanceByDate(leave.userId, dateStr);

          if (existingAttendance && existingAttendance.status === 'On Leave') {
            // If it was an "On Leave" record, delete it
            await storage.deleteAttendance(existingAttendance.id);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Send email notification to employee about the status change
      try {
        const employee = await storage.getUserProfile(leave.userId);
        const leaveTypes = await storage.getAllLeaveTypes();
        const leaveTypeName = leaveTypes.find(lt => lt.id === leave.leaveTypeId)?.name || 'Leave';

        if (employee && employee.email) {
          await emailService.sendLeaveApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            leaveTypeName,
            leave.fromDate,
            leave.toDate,
            updateData.status, // Use the new status
            updateData.managerComments || leave.managerComments // Use new comments if provided
          );
        }
      } catch (emailError) {
        console.error('Failed to send leave status update email:', emailError);
        // Continue even if email fails
      }

      res.json(leave);
    } catch (error: any) {
      console.error("Failed to update leave:", error);
      res.status(400).json({ message: error.message || "Failed to update leave" });
    }
  });

  app.patch("/api/leaves/:id/approve", allowRoles('Manager', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = req.session.userId!;

      const leave = await storage.getLeave(id);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // Don't approve if already approved
      if (leave.status === 'Approved') {
        return res.status(400).json({ message: "Leave is already approved" });
      }

      // Check if there's any existing "Present" attendance for the leave period
      const fromDate = new Date(leave.fromDate);
      const toDate = new Date(leave.toDate);
      const conflictingDates: string[] = [];

      for (let date = new Date(fromDate); date <= toDate; date.setDate(date.getDate() + 1)) {
        const attendanceDate = date.toISOString().split('T')[0];
        const existingAttendance = await storage.getAttendanceByDate(leave.userId, attendanceDate);

        if (existingAttendance && existingAttendance.status === 'Present') {
          conflictingDates.push(attendanceDate);
        }
      }

      if (conflictingDates.length > 0) {
        return res.status(400).json({ 
          message: `Cannot approve leave. Employee has already marked attendance as Present for the following dates: ${conflictingDates.join(', ')}. Please remove those attendance records first.` 
        });
      }

      // Calculate leave days BEFORE approval
      const leaveDaysFromDate = new Date(leave.fromDate);
      const leaveDaysToDate = new Date(leave.toDate);
      const daysDiff = Math.ceil((leaveDaysToDate.getTime() - leaveDaysFromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const leaveDays = leave.halfDay ? 0.5 : daysDiff;

      console.log('Approving leave - calculated days:', {
        leaveId: id,
        userId: leave.userId,
        leaveTypeId: leave.leaveTypeId,
        fromDate: leave.fromDate,
        toDate: leave.toDate,
        daysDiff,
        leaveDays,
        halfDay: leave.halfDay
      });

      // Update leave ledger FIRST - deduct used leaves
      await storage.updateLeaveLedgerUsage(
        leave.userId,
        leave.leaveTypeId,
        new Date().getFullYear(),
        leaveDays
      );
      console.log('Leave ledger updated successfully');

      // Now approve the leave
      const approvedLeave = await storage.approveLeave(id, managerId, comments);
      if (!approvedLeave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // Create attendance records for the leave period
      const leaveDateFrom = new Date(approvedLeave.fromDate);
      const leaveDateTo = new Date(approvedLeave.toDate);
      const currentDate = new Date(leaveDateFrom);

      while (currentDate <= leaveDateTo) {
        const attendanceDate = currentDate.toISOString().split('T')[0];

        // Check if attendance record already exists for this date
        const existingAttendance = await storage.getAttendanceByDate(approvedLeave.userId, attendanceDate);

        if (!existingAttendance) {
          // Create attendance record with "On Leave" status
          await storage.createAttendance({
            userId: approvedLeave.userId,
            attendanceDate,
            status: 'On Leave',
            checkIn: null,
            checkOut: null,
            totalDuration: approvedLeave.halfDay ? '4' : '8',
            earlySignIn: false,
            earlySignOut: false,
            lateSignIn: false,
            lateSignOut: false,
            regularizationRequested: false,
          });
        } else if (existingAttendance.status !== 'On Leave') {
          // Update existing attendance to "On Leave" only if not already marked
          await storage.updateAttendance(existingAttendance.id, {
            status: 'On Leave',
            totalDuration: approvedLeave.halfDay ? '4' : '8',
          });
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Send email notification to employee
      try {
        const employee = await storage.getUserProfile(approvedLeave.userId);
        const leaveTypes = await storage.getAllLeaveTypes();
        const leaveTypeName = leaveTypes.find(lt => lt.id === approvedLeave.leaveTypeId)?.name || 'Leave';

        if (employee && employee.email) {
          await emailService.sendLeaveApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            leaveTypeName,
            approvedLeave.fromDate,
            approvedLeave.toDate,
            'Approved',
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send leave approval email:', emailError);
        // Continue even if email fails
      }

      // Verify ledger was updated correctly
      const updatedLedger = await storage.getLeaveLedgerByUserAndType(
        approvedLeave.userId,
        approvedLeave.leaveTypeId,
        new Date().getFullYear()
      );
      console.log('Leave approved - ledger after update:', {
        userId: approvedLeave.userId,
        leaveTypeId: approvedLeave.leaveTypeId,
        ledger: updatedLedger
      });

      res.json(approvedLeave);
    } catch (error) {
      console.error('Failed to approve leave:', error);
      res.status(500).json({ message: "Failed to approve leave" });
    }
  });

  app.patch("/api/leaves/:id/reject", allowRoles('Manager', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = req.session.userId!;

      if (!comments) {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      // Get the leave before rejection to check if it was previously approved
      const existingLeave = await storage.getLeave(id);
      if (!existingLeave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      const wasApproved = existingLeave.status === 'Approved';

      const leave = await storage.rejectLeave(id, managerId, comments);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // If the leave was previously approved, restore the leave quota
      if (wasApproved) {
        try {
          const fromDate = new Date(leave.fromDate);
          const toDate = new Date(leave.toDate);
          const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const leaveDays = leave.halfDay ? 0.5 : daysDiff;

          console.log('Restoring leave quota after rejection:', {
            userId: leave.userId,
            leaveTypeId: leave.leaveTypeId,
            leaveDays
          });

          // Negative days to add back the leaves
          await storage.updateLeaveLedgerUsage(
            leave.userId,
            leave.leaveTypeId,
            new Date().getFullYear(),
            -leaveDays
          );
        } catch (ledgerError) {
          console.error('Failed to restore leave ledger:', ledgerError);
        }

        // Remove any "On Leave" attendance records for the period
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const currentDate = new Date(fromDate);

        while (currentDate <= toDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const existingAttendance = await storage.getAttendanceByDate(leave.userId, dateStr);

          if (existingAttendance && existingAttendance.status === 'On Leave') {
            await storage.deleteAttendance(existingAttendance.id);
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Send email notification to employee
      try {
        const employee = await storage.getUserProfile(leave.userId);
        const leaveTypes = await storage.getAllLeaveTypes();
        const leaveTypeName = leaveTypes.find(lt => lt.id === leave.leaveTypeId)?.name || 'Leave';

        if (employee && employee.email) {
          await emailService.sendLeaveApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            leaveTypeName,
            leave.fromDate,
            leave.toDate,
            'Rejected',
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send leave rejection email:', emailError);
        // Continue even if email fails
      }

      res.json(leave);
    } catch (error) {
      console.error('Failed to reject leave:', error);
      res.status(500).json({ message: "Failed to reject leave" });
    }
  });

  // Leave Type Routes - All authenticated users can view
  app.get("/api/leave-types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getAllLeaveTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave types" });
    }
  });

  // Assign leave quota to all employees - HR and Admin only
  app.post("/api/leave-quota/assign-all", requireHROrAdmin, async (req, res) => {
    try {
      const { leaveTypeId, totalLeaves, year } = req.body;

      if (!leaveTypeId || !totalLeaves || !year) {
        return res.status(400).json({ 
          message: "Leave type, total leaves, and year are required" 
        });
      }

      // Get all active employees
      const employees = await storage.getAllUserProfiles();
      const activeEmployees = employees.filter(emp => emp.status === 'Active');

      // Create leave ledger entries for all employees
      const results = [];
      for (const employee of activeEmployees) {
        // Check if ledger entry already exists
        const existingLedger = await storage.getLeaveLedgerByUserAndType(
          employee.id, 
          leaveTypeId, 
          year
        );

        if (existingLedger) {
          // Update existing ledger
          const updated = await storage.updateLeaveLedger(existingLedger.id, {
            totalLeaves: totalLeaves.toString(),
          });
          results.push(updated);
        } else {
          // Create new ledger entry
          const newLedger = await storage.createLeaveLedger({
            userId: employee.id,
            leaveTypeId,
            totalLeaves: totalLeaves.toString(),
            usedLeaves: "0",
            year,
          });
          results.push(newLedger);
        }
      }

      res.json({
        message: `Leave quota assigned to ${results.length} employees`,
        count: results.length,
      });
    } catch (error: any) {
      console.error('Failed to assign leave quota:', error);
      res.status(500).json({ message: error.message || "Failed to assign leave quota" });
    }
  });

  // Assign leave quota to individual employee - HR and Admin only
  app.post("/api/leave-quota/assign-individual", requireHROrAdmin, async (req, res) => {
    try {
      const { userId, leaveTypeId, totalLeaves, year } = req.body;

      if (!userId || !leaveTypeId || !totalLeaves || !year) {
        return res.status(400).json({ 
          message: "User ID, leave type, total leaves, and year are required" 
        });
      }

      // Verify employee exists
      const employee = await storage.getUserProfile(userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Check if ledger entry already exists
      const existingLedger = await storage.getLeaveLedgerByUserAndType(
        userId, 
        leaveTypeId, 
        year
      );

      let result;
      if (existingLedger) {
        // Update existing ledger
        result = await storage.updateLeaveLedger(existingLedger.id, {
          totalLeaves: totalLeaves.toString(),
        });
      } else {
        // Create new ledger entry
        result = await storage.createLeaveLedger({
          userId,
          leaveTypeId,
          totalLeaves: totalLeaves.toString(),
          usedLeaves: "0",
          year,
        });
      }

      res.json({
        message: `Leave quota assigned to ${employee.firstName} ${employee.lastName}`,
        ledger: result,
      });
    } catch (error: any) {
      console.error('Failed to assign individual leave quota:', error);
      res.status(500).json({ message: error.message || "Failed to assign leave quota" });
    }
  });

  // Holiday Routes - All authenticated users can view
  app.get("/api/holidays", requireAuth, async (req, res) => {
    try {
      const holidays = await storage.getAllHolidays();
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", requireHROrAdmin, async (req, res) => {
    try {
      const validated = insertHolidaySchema.parse(req.body);
      const holiday = await storage.createHoliday(validated);
      res.status(201).json(holiday);
    } catch (error) {
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });

  app.patch("/api/holidays/:id", requireHROrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const holiday = await storage.updateHoliday(id, req.body);
      if (!holiday) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.json(holiday);
    } catch (error) {
      res.status(400).json({ message: "Failed to update holiday" });
    }
  });

  app.delete("/api/holidays/:id", requireHROrAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteHoliday(id);
      if (!deleted) {
        return res.status(404).json({ message: "Holiday not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holiday" });
    }
  });

  // Reimbursement Routes
  app.get("/api/reimbursements", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let userRole = req.session.userRole;

      // Fallback: fetch role from storage if not in session
      if (!userRole) {
        const user = await storage.getUserProfile(userId);
        if (user?.roleId) {
          const role = await storage.getUserRole(user.roleId);
          if (role) {
            userRole = {
              accessLevel: role.accessLevel,
              roleName: role.roleName
            };
            req.session.userRole = userRole;
          }
        }
      }

      console.log('GET /api/reimbursements - Request received');
      console.log('GET /api/reimbursements - userId:', userId, 'userRole:', userRole?.accessLevel);

      let reimbursements;

      if (userRole?.accessLevel === 'Admin' || userRole?.accessLevel === 'HR') {
        // Admins and HR can view all reimbursements
        reimbursements = await storage.getAllReimbursements();
        console.log('GET /api/reimbursements - Admin/HR viewing all reimbursements:', reimbursements.length);
      } else if (userRole?.accessLevel === 'Accountant') {
        // Accountants can view all reimbursements for accounting approval
        reimbursements = await storage.getAllReimbursements();
        console.log('GET /api/reimbursements - Accountant viewing all reimbursements:', reimbursements.length);
      } else if (userRole?.accessLevel === 'Manager') {
        // Managers can only view reimbursements assigned to them and their own
        const allReimbursements = await storage.getAllReimbursements();
        reimbursements = allReimbursements.filter(r => 
          r.managerId === userId || r.userId === userId
        );
        console.log('GET /api/reimbursements - Manager viewing assigned reimbursements:', reimbursements.length);
      } else {
        // Employees only view their own
        reimbursements = await storage.getReimbursementsByUser(userId);
        console.log('GET /api/reimbursements - Employee viewing own reimbursements:', reimbursements.length);
      }

      const response = reimbursements || [];
      console.log('GET /api/reimbursements - Final response:', response.length, 'items');
      res.json(response);
    } catch (error) {
      console.error('Failed to fetch reimbursements:', error);
      res.status(500).json({ message: "Failed to fetch reimbursements" });
    }
  });

  app.post("/api/reimbursements", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userId: _, ...reimbursementData } = req.body; // Remove userId from body if present

      // Get employee's manager
      const employee = await storage.getUserProfile(userId);
      let managerId = null;

      // Get the employee's role to check their level
      let employeeRole = null;
      if (employee?.roleId) {
        employeeRole = await storage.getUserRole(employee.roleId);
      }

      // If employee is Manager or has Manager access level, assign to Super Admin (Level 1)
      if (employeeRole && (employeeRole.accessLevel === 'Manager' || employeeRole.level === 2)) {
        const allEmployees = await storage.getAllUserProfiles();

        // Find a Super Admin (Level 1) to approve the reimbursement
        for (const emp of allEmployees) {
          if (emp.roleId && emp.id !== userId) {
            const role = await storage.getUserRole(emp.roleId);
            if (role && role.level === 1 && role.accessLevel === 'Admin') {
              managerId = emp.id;
              break;
            }
          }
        }
      } else if (employee?.departmentId) {
        // For other employees, find manager in the same department
        const allEmployees = await storage.getAllUserProfiles();

        for (const emp of allEmployees) {
          if (emp.departmentId === employee.departmentId && 
              emp.roleId && 
              emp.id !== userId) {

            // Check if this employee has a Manager role
            const role = await storage.getUserRole(emp.roleId);
            if (role && role.accessLevel === 'Manager') {
              managerId = emp.id;
              break;
            }
          }
        }
      }

      // Fallback to direct manager if no department manager found
      if (!managerId && employee?.managerId) {
        managerId = employee.managerId;
      }

      const validated = insertReimbursementSchema.parse({
        ...reimbursementData,
        userId, // Use authenticated user's ID
        managerId, // Set manager from department or direct manager
      });

      const reimbursement = await storage.createReimbursement(validated);

      // Send email notification to manager
      try {
        const manager = reimbursement.managerId ? await storage.getUserProfile(reimbursement.managerId) : null;
        const reimbTypes = await storage.getAllReimbursementTypes();
        const reimbTypeName = reimbTypes.find(rt => rt.id === reimbursement.reimbursementTypeId)?.name || 'Expense';

        if (employee && manager && manager.email) {
          await emailService.sendReimbursementNotification(
            `${employee.firstName} ${employee.lastName}`,
            manager.email,
            reimbTypeName,
            reimbursement.amount,
            reimbursement.category || 'No description provided'
          );
        }
      } catch (emailError) {
        console.error('Failed to send reimbursement notification email:', emailError);
        // Continue even if email fails
      }

      res.status(201).json(reimbursement);
    } catch (error: any) {
      console.error('Reimbursement creation error:', error);
      res.status(400).json({ message: error.message || "Failed to create reimbursement" });
    }
  });

  app.patch("/api/reimbursements/:id/approve-manager", allowRoles('Manager', 'HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = req.session.userId!;

      const reimbursement = await storage.approveReimbursementByManager(id, managerId, comments);
      if (!reimbursement) {
        return res.status(404).json({ message: "Reimbursement not found" });
      }

      // Send email notification to employee
      try {
        const employee = await storage.getUserProfile(reimbursement.userId);
        const reimbTypes = await storage.getAllReimbursementTypes();
        const reimbTypeName = reimbTypes.find(rt => rt.id === reimbursement.reimbursementTypeId)?.name || 'Expense';

        if (employee && employee.email) {
          await emailService.sendReimbursementApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            reimbTypeName,
            reimbursement.amount,
            'Approved by Manager',
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send reimbursement approval email:', emailError);
        // Continue even if email fails
      }

      res.json(reimbursement);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve reimbursement" });
    }
  });

  app.patch("/api/reimbursements/:id/approve-accountant", allowRoles('Accountant', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const accountantId = req.session.userId!;

      const reimbursement = await storage.approveReimbursementByAccountant(id, accountantId, comments);
      if (!reimbursement) {
        return res.status(404).json({ message: "Reimbursement not found" });
      }

      // Send email notification to employee
      try {
        const employee = await storage.getUserProfile(reimbursement.userId);
        const reimbTypes = await storage.getAllReimbursementTypes();
        const reimbTypeName = reimbTypes.find(rt => rt.id === reimbursement.reimbursementTypeId)?.name || 'Expense';

        if (employee && employee.email) {
          await emailService.sendReimbursementApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            reimbTypeName,
            reimbursement.amount,
            'Approved by Accountant',
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send reimbursement approval email:', emailError);
        // Continue even if email fails
      }

      res.json(reimbursement);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve reimbursement" });
    }
  });

  app.patch("/api/reimbursements/:id/reject", allowRoles('Manager', 'HR', 'Accountant', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const userId = req.session.userId!;

      if (!comments) {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      const reimbursement = await storage.rejectReimbursement(id, userId, comments);
      if (!reimbursement) {
        return res.status(404).json({ message: "Reimbursement not found" });
      }

      // Send email notification to employee
      try {
        const employee = await storage.getUserProfile(reimbursement.userId);
        const reimbTypes = await storage.getAllReimbursementTypes();
        const reimbTypeName = reimbTypes.find(rt => rt.id === reimbursement.reimbursementTypeId)?.name || 'Expense';

        if (employee && employee.email) {
          await emailService.sendReimbursementApprovalNotification(
            employee.email,
            `${employee.firstName} ${employee.lastName}`,
            reimbTypeName,
            reimbursement.amount,
            reimbursement.status, // Will be "Rejected by Manager" or "Rejected by Accountant"
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send reimbursement rejection email:', emailError);
        // Continue even if email fails
      }

      res.json(reimbursement);
    } catch (error) {
      res.status(500).json({ message: "Failed to reject reimbursement" });
    }
  });

  // Reimbursement Type Routes - All authenticated users can view
  app.get("/api/reimbursement-types", requireAuth, async (req, res) => {
    try {
      const types = await storage.getAllReimbursementTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reimbursement types" });
    }
  });

  // Payroll Routes - Only Super Admin can access
  app.get("/api/payroll", requireAdmin, async (req, res) => {
    try {
      // Only Super Admin can view all payrolls
      const payrolls = await storage.getAllPayrolls();
      res.json(payrolls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll/generate", requireAdmin, async (req, res) => {
    try {
      const { userId, month, year } = req.body;

      if (!userId || !month || !year) {
        return res.status(400).json({ message: "userId, month, and year are required" });
      }

      const { PayrollCalculator } = await import('./payroll-calculator');
      const payroll = await PayrollCalculator.generatePayroll(userId, month, year);

      res.status(201).json(payroll);
    } catch (error: any) {
      console.error('Payroll generation error:', error);
      res.status(400).json({ message: error.message || "Failed to generate payroll" });
    }
  });

  app.post("/api/payroll/generate-bulk", requireAdmin, async (req, res) => {
    try {
      const { month, year } = req.body;

      if (!month || !year) {
        return res.status(400).json({ message: "month and year are required" });
      }

      // Get all active employees
      const employees = await storage.getAllUserProfiles();
      const activeEmployees = employees.filter(emp => emp.status === 'Active');

      const { PayrollCalculator } = await import('./payroll-calculator');
      const results = [];
      const errors = [];

      for (const employee of activeEmployees) {
        try {
          const payroll = await PayrollCalculator.generatePayroll(employee.id, month, year);
          results.push(payroll);
        } catch (error: any) {
          errors.push({
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            error: error.message
          });
        }
      }

      res.json({
        message: `Generated ${results.length} payrolls successfully`,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors
      });
    } catch (error: any) {
      console.error('Bulk payroll generation error:', error);
      res.status(500).json({ message: error.message || "Failed to generate bulk payroll" });
    }
  });

  app.post("/api/payroll", requireAdmin, async (req, res) => {
    try {
      const validated = insertPayrollSchema.parse(req.body);
      const payroll = await storage.createPayroll(validated);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payroll" });
    }
  });

  app.patch("/api/payroll/:id/approve", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const approverId = 'admin-user'; // In production, get from session

      const payroll = await storage.approvePayroll(id, approverId);
      if (!payroll) {
        return res.status(404).json({ message: "Payroll not found" });
      }

      res.json(payroll);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve payroll" });
    }
  });

  // Salary Components Routes
  app.get("/api/salary-components", allowRoles('HR', 'Accountant', 'Admin'), async (req, res) => {
    try {
      const components = await storage.getAllSalaryComponents();
      res.json(components);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch salary components" });
    }
  });

  app.post("/api/salary-components", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const component = await storage.createSalaryComponent(req.body);
      res.status(201).json(component);
    } catch (error) {
      res.status(400).json({ message: "Failed to create salary component" });
    }
  });

  app.patch("/api/salary-components/:id", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const component = await storage.updateSalaryComponent(id, req.body);
      if (!component) {
        return res.status(404).json({ message: "Salary component not found" });
      }
      res.json(component);
    } catch (error) {
      res.status(400).json({ message: "Failed to update salary component" });
    }
  });

  app.delete("/api/salary-components/:id", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSalaryComponent(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete salary component" });
    }
  });

  // Employee Compensation Routes
  app.get("/api/employees/:userId/compensation", allowRoles('HR', 'Accountant', 'Admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const compensation = await storage.getEmployeeCompensation(userId);
      res.json(compensation);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee compensation" });
    }
  });

  app.post("/api/employees/:userId/compensation", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const compensation = await storage.createEmployeeCompensation({
        ...req.body,
        userId
      });
      res.status(201).json(compensation);
    } catch (error) {
      res.status(400).json({ message: "Failed to create compensation" });
    }
  });

  app.patch("/api/compensation/:id", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const compensation = await storage.updateEmployeeCompensation(id, req.body);
      if (!compensation) {
        return res.status(404).json({ message: "Compensation not found" });
      }
      res.json(compensation);
    } catch (error) {
      res.status(400).json({ message: "Failed to update compensation" });
    }
  });

  app.delete("/api/compensation/:id", allowRoles('HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEmployeeCompensation(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete compensation" });
    }
  });

  // Company Routes - All authenticated users can view
  app.get("/api/company", requireAuth, async (req, res) => {
    try {
      const companies = await storage.getAllCompanies();
      // Return first company or default MIDCAI data
      const company = companies[0] || {
        id: 'midcai',
        name: 'MIDCAI',
        costCenter: null,
        country: 'India',
        dateOfEstablishment: '2020-01-01',
      };
      res.json(company);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  // Department Routes - All authenticated users can view
  app.get("/api/departments", requireAuth, async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}