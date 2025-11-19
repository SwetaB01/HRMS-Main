import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserProfileSchema, insertLeaveSchema, insertHolidaySchema, insertReimbursementSchema, insertPayrollSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { emailService } from "./email";
import session from "express-session";

// Simple in-memory session store (for production, use Redis or database-backed store)
declare module 'express-session' {
  interface SessionData {
    userId: string;
    userRole?: { accessLevel: string; roleName: string };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'midcai-hrms-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
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

  // Get current user profile
  app.get("/api/auth/me", async (req, res) => {
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

      // Get user role information
      let roleName = 'Employee';
      let accessLevel = 'Employee';
      if (user.roleId) {
        const role = await storage.getUserRole(user.roleId);
        if (role) {
          roleName = role.roleName;
          accessLevel = role.accessLevel;
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


  // Employee Management Routes - HR and Admin can manage
  app.get("/api/employees", requireHROrAdmin, async (req, res) => {
    try {
      const employees = await storage.getAllUserProfiles();

      // Remove passwordHash from all employee records before returning
      const sanitizedEmployees = employees.map(({ passwordHash, ...employee }) => employee);

      res.json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", requireHROrAdmin, async (req, res) => {
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
      const deleted = await storage.deleteUserProfile(id);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Dashboard Routes - All authenticated users can view
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
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

  app.delete("/api/attendance/:id", requireManagerOrHROrAdmin, async (req, res) => {
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

      // Check if there's an approved leave for this date
      const allLeaves = await storage.getLeavesByUser(attendance.userId);
      const approvedLeave = allLeaves.find(leave => {
        if (leave.status !== 'Approved') return false;
        const fromDate = new Date(leave.fromDate);
        const toDate = new Date(leave.toDate);
        const attendDate = new Date(attendance.attendanceDate);
        return attendDate >= fromDate && attendDate <= toDate;
      });

      if (approvedLeave && attendance.status !== 'On Leave') {
        return res.status(400).json({ 
          message: "Cannot delete this attendance record. You have an approved leave for this date." 
        });
      }

      // Delete the attendance record (implementation depends on storage)
      // For now, we'll just update it to a deleted status or actually delete it
      // Assuming storage has a delete method
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

      // Send email notification to manager
      try {
        const employee = await storage.getUserProfile(userId);
        const manager = employee?.managerId ? await storage.getUserProfile(employee.managerId) : null;

        if (employee && manager && manager.email) {
          await emailService.sendAttendanceRegularizationNotification(
            `${employee.firstName} ${employee.lastName}`,
            manager.email,
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

  // Leave Routes
  app.get("/api/leaves", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const leaves = await storage.getLeavesByUser(userId);
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaves" });
    }
  });

  app.get("/api/approvals/leaves", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;

      // Get all leaves where the current user is the manager
      const allLeaves = await storage.getAllLeaves();
      const pendingLeaves = allLeaves.filter(leave => 
        leave.managerId === userId && leave.status === 'Open'
      );

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

      // Get employee's manager from their profile
      const employee = await storage.getUserProfile(userId);
      const managerId = employee?.managerId || null;

      const validated = insertLeaveSchema.parse({
        ...leaveData,
        userId, // Use authenticated user's ID
        managerId, // Set manager from employee's profile
      });
      const leave = await storage.createLeave(validated);

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
      } else if (updateData.status === 'Rejected' && existingLeave.status !== 'Rejected') {
        // If leave is rejected, remove any "On Leave" attendance records for the period
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

  app.patch("/api/leaves/:id/approve", allowRoles('Manager', 'HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = req.session.userId!;

      const leave = await storage.getLeave(id);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
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

      // Approve the leave
      const approvedLeave = await storage.approveLeave(id, managerId, comments);
      if (!approvedLeave) {
        return res.status(404).json({ message: "Leave not found" });
      }

      // Create attendance records for the leave period
      try {
        for (let date = new Date(fromDate); date <= toDate; date.setDate(date.getDate() + 1)) {
          const attendanceDate = date.toISOString().split('T')[0];

          // Check if attendance record already exists for this date
          const existingAttendance = await storage.getAttendanceByDate(approvedLeave.userId, attendanceDate);

          if (!existingAttendance) {
            // Create attendance record with "On Leave" status
            await storage.createAttendance({
              userId: approvedLeave.userId,
              attendanceDate,
              status: 'On Leave',
              leaveTypeId: approvedLeave.leaveTypeId,
              companyId: approvedLeave.companyId || null,
              checkIn: null,
              checkOut: null,
              totalDuration: approvedLeave.halfDay ? '4' : '8',
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
          } else {
            // Update existing attendance to "On Leave"
            await storage.updateAttendance(existingAttendance.id, {
              status: 'On Leave',
              leaveTypeId: approvedLeave.leaveTypeId,
              totalDuration: approvedLeave.halfDay ? '4' : '8',
            });
          }
        }
      } catch (attendanceError) {
        console.error('Failed to create attendance records for leave:', attendanceError);
        // Continue even if attendance creation fails
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

      res.json(approvedLeave);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve leave" });
    }
  });

  app.patch("/api/leaves/:id/reject", allowRoles('Manager', 'HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = req.session.userId!;

      if (!comments) {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      const leave = await storage.rejectLeave(id, managerId, comments);
      if (!leave) {
        return res.status(404).json({ message: "Leave not found" });
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
  app.get("/api/reimbursements", async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Managers, HR, Accountants, and Admins can view all reimbursements; employees view their own
      const canViewAll = ['Admin', 'HR', 'Manager', 'Accountant'].includes(userRole?.accessLevel || '');
      
      let reimbursements;
      if (canViewAll) {
        // For elevated roles, get all reimbursements (TODO: filter by team/department for managers)
        reimbursements = await storage.getAllReimbursements();
      } else {
        // For employees, only show their own
        reimbursements = await storage.getReimbursementsByUser(userId);
      }
      
      res.json(reimbursements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reimbursements" });
    }
  });

  app.post("/api/reimbursements", requireAuth, async (req, res) => {
    try {
      const validated = insertReimbursementSchema.parse(req.body);
      const reimbursement = await storage.createReimbursement(validated);

      // Send email notification to manager
      try {
        const employee = await storage.getUserProfile(reimbursement.userId);
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
    } catch (error) {
      res.status(400).json({ message: "Failed to create reimbursement" });
    }
  });

  app.patch("/api/reimbursements/:id/approve-manager", allowRoles('Manager', 'HR', 'Admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = 'admin-user'; // In production, get from session

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
            'Manager Approved',
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
      const accountantId = 'admin-user'; // In production, get from session

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
            'Approved',
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
      const userId = 'admin-user'; // In production, get from session

      if (!comments) {
        return res.status(400).json({ message: "Comments are required for rejection" });
      }

      const reimbursement = await storage.rejectReimbursement(id, userId, comments);
      if (!reimbursement) {
        return res.status(404).json({ message: "Reimbursement not found" });
      }

      // In production, send email notification here

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

  // Payroll Routes - Employees can view own, HR/Accountant/Admin can manage
  app.get("/api/payroll", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // HR, Accountants, and Admins can view all payrolls; Managers and employees view their own only
      const canViewAll = ['Admin', 'HR', 'Accountant'].includes(userRole?.accessLevel || '');
      
      let payrolls;
      if (canViewAll) {
        // For elevated roles, get all payrolls
        payrolls = await storage.getAllPayrolls();
      } else {
        // For employees, only show their own
        payrolls = await storage.getPayrollsByUser(userId);
      }
      
      res.json(payrolls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", allowRoles('HR', 'Accountant', 'Admin'), async (req, res) => {
    try {
      const validated = insertPayrollSchema.parse(req.body);
      const payroll = await storage.createPayroll(validated);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payroll" });
    }
  });

  app.patch("/api/payroll/:id/approve", allowRoles('HR', 'Accountant', 'Admin'), async (req, res) => {
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