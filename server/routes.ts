import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserProfileSchema, insertLeaveSchema, insertHolidaySchema, insertReimbursementSchema, insertPayrollSchema } from "@shared/schema";
import bcrypt from "bcryptjs";
import { emailService } from "./email";

export async function registerRoutes(app: Express): Promise<Server> {
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

      // Get user role information
      let roleName = 'Employee';
      if (user.roleId) {
        const role = await storage.getUserRole(user.roleId);
        if (role) roleName = role.roleName;
      }

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

  // Employee Management Routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllUserProfiles();

      // Remove passwordHash from all employee records before returning
      const sanitizedEmployees = employees.map(({ passwordHash, ...employee }) => employee);

      res.json(sanitizedEmployees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      // Validate request body with schema (it expects password field)
      const validated = insertUserProfileSchema.parse(req.body);

      // Store the plain password before hashing for email notification
      const plainPassword = validated.password;

      // Create employee with validated data (storage will hash password)
      const employee = await storage.createUserProfile(validated);

      // Send welcome email to new employee
      try {
        if (employee.email) {
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

  app.patch("/api/employees/:id", async (req, res) => {
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

  app.delete("/api/employees/:id", async (req, res) => {
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

  // Dashboard Routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Attendance Routes
  app.get("/api/attendance", async (req, res) => {
    try {
      const userId = req.query.userId as string || 'admin-user'; // Default to admin for now
      const fromDate = req.query.fromDate as string;
      const toDate = req.query.toDate as string;

      const attendance = await storage.getAttendanceByUser(userId, fromDate, toDate);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.get("/api/attendance/today-status", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const todayStatus = await storage.getTodayAttendance(userId);
      res.json(todayStatus || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch today's status" });
    }
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const attendance = await storage.checkIn(userId);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Check-in failed" });
    }
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const attendance = await storage.checkOut(userId);
      if (!attendance) {
        return res.status(400).json({ message: "No check-in found for today" });
      }
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Check-out failed" });
    }
  });

  // Leave Routes
  app.get("/api/leaves", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const leaves = await storage.getLeavesByUser(userId);
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaves" });
    }
  });

  app.get("/api/leave-balance", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const balance = await storage.getLeaveLedgerByUser(userId);
      res.json(balance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave balance" });
    }
  });

  app.post("/api/leaves", async (req, res) => {
    try {
      const validated = insertLeaveSchema.parse(req.body);
      const leave = await storage.createLeave(validated);

      // Send email notification to manager
      try {
        const employee = await storage.getUserProfile(leave.userId);
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
      res.status(400).json({ message: "Failed to apply for leave" });
    }
  });

  app.patch("/api/leaves/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = 'admin-user'; // In production, get from session

      const leave = await storage.approveLeave(id, managerId, comments);
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
            'Approved',
            comments
          );
        }
      } catch (emailError) {
        console.error('Failed to send leave approval email:', emailError);
        // Continue even if email fails
      }

      res.json(leave);
    } catch (error) {
      res.status(500).json({ message: "Failed to approve leave" });
    }
  });

  app.patch("/api/leaves/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const managerId = 'admin-user'; // In production, get from session

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

  // Leave Type Routes
  app.get("/api/leave-types", async (req, res) => {
    try {
      const types = await storage.getAllLeaveTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leave types" });
    }
  });

  // Holiday Routes
  app.get("/api/holidays", async (req, res) => {
    try {
      const holidays = await storage.getAllHolidays();
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch holidays" });
    }
  });

  app.post("/api/holidays", async (req, res) => {
    try {
      const validated = insertHolidaySchema.parse(req.body);
      const holiday = await storage.createHoliday(validated);
      res.status(201).json(holiday);
    } catch (error) {
      res.status(400).json({ message: "Failed to create holiday" });
    }
  });

  app.patch("/api/holidays/:id", async (req, res) => {
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

  app.delete("/api/holidays/:id", async (req, res) => {
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
      const userId = 'admin-user'; // In production, get from session
      const reimbursements = await storage.getReimbursementsByUser(userId);
      res.json(reimbursements);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reimbursements" });
    }
  });

  app.post("/api/reimbursements", async (req, res) => {
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

  app.patch("/api/reimbursements/:id/approve-manager", async (req, res) => {
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

  app.patch("/api/reimbursements/:id/approve-accountant", async (req, res) => {
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

  app.patch("/api/reimbursements/:id/reject", async (req, res) => {
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

  // Reimbursement Type Routes
  app.get("/api/reimbursement-types", async (req, res) => {
    try {
      const types = await storage.getAllReimbursementTypes();
      res.json(types);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reimbursement types" });
    }
  });

  // Payroll Routes
  app.get("/api/payroll", async (req, res) => {
    try {
      const userId = 'admin-user'; // In production, get from session
      const payrolls = await storage.getPayrollsByUser(userId);
      res.json(payrolls);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch payroll" });
    }
  });

  app.post("/api/payroll", async (req, res) => {
    try {
      const validated = insertPayrollSchema.parse(req.body);
      const payroll = await storage.createPayroll(validated);
      res.status(201).json(payroll);
    } catch (error) {
      res.status(400).json({ message: "Failed to create payroll" });
    }
  });

  app.patch("/api/payroll/:id/approve", async (req, res) => {
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

  // Company Routes
  app.get("/api/company", async (req, res) => {
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

  // Department Routes
  app.get("/api/departments", async (req, res) => {
    try {
      const departments = await storage.getAllDepartments();
      res.json(departments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  // User Role Routes
  app.get("/api/roles", async (req, res) => {
    try {
      const roles = await storage.getAllUserRoles();
      res.json(roles);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch roles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}