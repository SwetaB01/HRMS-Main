import { db } from './db';
import { userRoles, userProfiles, leaveTypes, reimbursementTypes, userTypes, departments, reimbursements } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { storage } from './storage';
import { randomUUID } from 'crypto';

export async function seedDatabase() {
  console.log('Seeding database...');

  // Check if admin user already exists
  const existingUsers = await db.select().from(userProfiles);
  const userAlreadyExists = existingUsers.length > 0;

  // Seed user types
  const userTypesData = [
    { name: 'Admin' },
    { name: 'Manager' },
    { name: 'Individual' },
    { name: 'Vendor' },
    { name: 'Contractor' },
  ];

  for (const type of userTypesData) {
    const exists = await db.select().from(userTypes).where(eq(userTypes.name, type.name)).limit(1);
    if (exists.length === 0) {
      await db.insert(userTypes).values(type);
    }
  }

  // Seed departments if not exist
  const existingDepts = await db.select().from(departments);
  let itDept: any = null; // Declare itDept here

  if (existingDepts.length === 0) {
    console.log('Seeding departments...');
    const deptData = [
      { id: 'project-management', name: 'Project Management', parentDeptId: null },
      { id: 'marketing', name: 'Marketing', parentDeptId: null },
      { id: 'sales', name: 'Sales', parentDeptId: null },
      { id: 'hr', name: 'Human Resources', parentDeptId: null },
      { id: 'accounts', name: 'Accounts', parentDeptId: null },
      { id: 'inventory', name: 'Inventory', parentDeptId: null },
      { id: 'it', name: 'IT', parentDeptId: null },
    ];
    for (const dept of deptData) {
      await db.insert(departments).values(dept);
    }
    itDept = deptData.find(d => d.id === 'it'); // Assign itDept here
  } else {
    // If departments already exist, find the 'it' department
    const [foundItDept] = await db.select().from(departments).where(eq(departments.id, 'it'));
    itDept = foundItDept;
  }


  // Check if roles need to be reset
  const existingRoles = await db.select().from(userRoles);
  const desiredRoles = ['Super Admin', 'HR Admin', 'Manager', 'Employee', 'Accountant'];
  const needsReset = existingRoles.length === 0 ||
                     !desiredRoles.every(role => existingRoles.some(r => r.roleName === role));

  if (needsReset) {
    console.log('Resetting roles...');

    // First, set all user profiles roleId to null to avoid foreign key constraint
    await db.update(userProfiles).set({ roleId: null });

    // Now delete all existing roles
    await db.delete(userRoles);

    // Seed standardized roles with proper access levels and hierarchy
    const rolesData = [
      {
        roleName: 'Super Admin',
        roleDescription: 'Full system access with all permissions',
        accessType: 'Full Access',
        accessLevel: 'Admin',
        level: 1 // Highest hierarchy level
      },
      {
        roleName: 'Manager',
        roleDescription: 'Team manager with approval and team management permissions',
        accessType: 'Limited Access',
        accessLevel: 'Manager',
        level: 2
      },
      {
        roleName: 'HR Admin',
        roleDescription: 'HR department with employee, payroll, and leave management access',
        accessType: 'Limited Access',
        accessLevel: 'HR',
        level: 3
      },
      {
        roleName: 'Accountant',
        roleDescription: 'Finance department with payroll and reimbursement access',
        accessType: 'Limited Access',
        accessLevel: 'Accountant',
        level: 4
      },
      {
        roleName: 'Employee',
        roleDescription: 'Regular employee with access to own data only',
        accessType: 'Limited Access',
        accessLevel: 'Employee',
        level: 5 // Lowest hierarchy level
      },
    ];

    console.log('Adding new roles...');
    for (const role of rolesData) {
      await db.insert(userRoles).values(role);
    }

    console.log('Roles reset complete. Please reassign roles to users.');
  }

  // Only create admin user and default data if it doesn't exist
  if (!userAlreadyExists) {
    // Get the Super Admin role (it should already exist from the roles reset above)
    const [adminRole] = await db.select().from(userRoles).where(eq(userRoles.roleName, 'Super Admin'));

    if (!adminRole) {
      throw new Error('Super Admin role not found! Database seeding failed.');
    }

    // Create admin user with Admin role
    const adminUser = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'admin') });
    if (!adminUser) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      await db.insert(userProfiles).values({
        roleId: adminRole.id, // Assign Admin role
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@midcai.com',
        username: 'admin',
        passwordHash: hashedPassword,
        status: 'Active',
        userType: 'Admin',
        language: 'English',
        timezone: 'Asia/Kolkata',
        insuranceOpted: false,
        departmentId: itDept ? itDept.id : null, // Assign departmentId if itDept exists
      });
    } else if (!adminUser.roleId) {
      // Update existing admin user to have Admin role
      console.log('Assigning Admin role to existing admin user...');
      await db.update(userProfiles).set({ roleId: adminRole.id }).where(eq(userProfiles.id, adminUser.id));
    }

    // Create default leave types if they don't exist
    const existingLeaveTypes = await db.select().from(leaveTypes);
    if (existingLeaveTypes.length === 0) {
      await db.insert(leaveTypes).values([
        {
          name: 'Casual Leave',
          maxConsecutiveDays: 5,
          isCarryForward: false,
        },
        {
          name: 'Sick Leave',
          maxConsecutiveDays: 10,
          isCarryForward: false,
        },
        {
          name: 'Earned Leave',
          maxConsecutiveDays: 15,
          isCarryForward: true,
        },
      ]);
    }

    // Create default reimbursement types if they don't exist
    const existingReimbTypes = await db.select().from(reimbursementTypes);
    if (existingReimbTypes.length === 0) {
      await db.insert(reimbursementTypes).values([
        { name: 'Travel' },
        { name: 'Meals & Entertainment' },
        { name: 'Office Supplies' },
        { name: 'Accommodation' },
        { name: 'Phone & Internet' },
        { name: 'Others' },
      ]);
    }
  }

  // Create a second employee with administration role (outside userAlreadyExists check)
  const [adminRole] = await db.select().from(userRoles).where(eq(userRoles.roleName, 'Super Admin'));
  if (adminRole) {
    const adminEmployee = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'john.admin') });
    if (!adminEmployee) {
      console.log('Creating admin employee john.admin...');
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db.insert(userProfiles).values({
        roleId: adminRole.id, // Assign Admin role
        firstName: 'John',
        lastName: 'Administrator',
        email: 'john.admin@midcai.com',
        username: 'john.admin',
        passwordHash: hashedPassword,
        status: 'Active',
        userType: 'Admin',
        language: 'English',
        timezone: 'Asia/Kolkata',
        insuranceOpted: false,
        joiningDate: new Date().toISOString().split('T')[0],
        departmentId: itDept ? itDept.id : null, // Assign departmentId if itDept exists
      });
    }
  }

  // Create a Manager role user if not exists, or update existing one with department
  const [managerRole] = await db.select().from(userRoles).where(eq(userRoles.roleName, 'Manager'));
  const managerUser = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
  if (managerRole && !managerUser) {
    console.log('Creating manager user...');
    const hashedPassword = await bcrypt.hash('manager123', 10);
    await db.insert(userProfiles).values({
      roleId: managerRole.id,
      firstName: 'John',
      lastName: 'Manager',
      email: 'manager@midcai.com',
      username: 'manager',
      passwordHash: hashedPassword,
      status: 'Active',
      userType: 'Employee',
      language: 'English',
      timezone: 'Asia/Kolkata',
      joiningDate: '2023-01-15',
      departmentId: itDept ? itDept.id : null,
      managerId: null,
    });
  } else if (managerUser && itDept && !managerUser.departmentId) {
    // Update existing manager with department
    console.log('Updating existing manager user with department...');
    await db.update(userProfiles)
      .set({ departmentId: itDept.id })
      .where(eq(userProfiles.id, managerUser.id));
  }

  // Create a regular Employee user if not exists, or update existing one with department
  const [employeeRole] = await db.select().from(userRoles).where(eq(userRoles.roleName, 'Employee'));
  const employeeUserExists = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'employee') });
  if (employeeRole && !employeeUserExists) {
    console.log('Creating employee user...');
    const hashedPassword = await bcrypt.hash('employee123', 10);
    const managerUserData = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
    await db.insert(userProfiles).values({
      roleId: employeeRole.id,
      firstName: 'Jane',
      lastName: 'Employee',
      email: 'employee@midcai.com',
      username: 'employee',
      passwordHash: hashedPassword,
      status: 'Active',
      userType: 'Employee',
      language: 'English',
      timezone: 'Asia/Kolkata',
      joiningDate: '2023-03-01',
      departmentId: itDept ? itDept.id : null,
      managerId: managerUserData ? managerUserData.id : null,
    });
  } else if (employeeUserExists && itDept && !employeeUserExists.departmentId) {
    // Update existing employee with department
    console.log('Updating existing employee user with department...');
    const managerUserData = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
    await db.update(userProfiles)
      .set({
        departmentId: itDept.id,
        managerId: managerUserData ? managerUserData.id : employeeUserExists.managerId
      })
      .where(eq(userProfiles.id, employeeUserExists.id));
  }

  // Create additional test employees if they don't exist
  const additionalEmployees = [
    { firstName: 'Bob', lastName: 'Smith', username: 'bsmith', email: 'bob.smith@midcai.com', joiningDate: '2023-04-15' },
    { firstName: 'Alice', lastName: 'Johnson', username: 'ajohnson', email: 'alice.johnson@midcai.com', joiningDate: '2023-05-01' },
  ];

  for (const emp of additionalEmployees) {
    const existingEmployee = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, emp.username) });
    if (employeeRole && !existingEmployee) {
      console.log(`Creating employee ${emp.username}...`);
      const hashedPassword = await bcrypt.hash('employee123', 10);
      const managerUserData = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
      await db.insert(userProfiles).values({
        roleId: employeeRole.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        username: emp.username,
        passwordHash: hashedPassword,
        status: 'Active',
        userType: 'Employee',
        language: 'English',
        timezone: 'Asia/Kolkata',
        joiningDate: emp.joiningDate,
        departmentId: itDept ? itDept.id : null,
        managerId: managerUserData ? managerUserData.id : null,
      });
    } else if (existingEmployee && itDept && !existingEmployee.departmentId) {
      // Update existing employee with department
      console.log(`Updating existing employee ${emp.username} with department...`);
      const managerUserData = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
      await db.update(userProfiles)
        .set({
          departmentId: itDept.id,
          managerId: managerUserData ? managerUserData.id : existingEmployee.managerId
        })
        .where(eq(userProfiles.id, existingEmployee.id));
    }
  }


  // First, clean up any duplicate holidays in the database
  console.log('Checking for duplicate holidays...');
  const allHolidays = await storage.getAllHolidays();
  const uniqueHolidaysMap = new Map();
  const duplicatesToDelete = [];

  for (const holiday of allHolidays) {
    const key = `${holiday.name}-${holiday.fromDate}`;
    if (uniqueHolidaysMap.has(key)) {
      // This is a duplicate, mark for deletion
      duplicatesToDelete.push(holiday.id);
    } else {
      uniqueHolidaysMap.set(key, holiday);
    }
  }

  // Delete duplicates
  if (duplicatesToDelete.length > 0) {
    console.log(`Deleting ${duplicatesToDelete.length} duplicate holidays...`);
    for (const id of duplicatesToDelete) {
      await storage.deleteHoliday(id);
    }
  }

  // Seed National Holidays for 2025-2026 with types
  const holidaysData = [
    { name: "New Year's Day", fromDate: "2025-01-01", toDate: "2025-01-01", totalHolidays: 1, type: "National" },
    { name: "Republic Day", fromDate: "2025-01-26", toDate: "2025-01-26", totalHolidays: 1, type: "National" },
    { name: "Holi", fromDate: "2025-03-14", toDate: "2025-03-14", totalHolidays: 1, type: "National" },
    { name: "Mahavir Jayanti", fromDate: "2025-04-10", toDate: "2025-04-10", totalHolidays: 1, type: "Optional" },
    { name: "Good Friday", fromDate: "2025-04-18", toDate: "2025-04-18", totalHolidays: 1, type: "Regional" },
    { name: "Eid ul-Fitr", fromDate: "2025-04-21", toDate: "2025-04-21", totalHolidays: 1, type: "National" },
    { name: "Buddha Purnima", fromDate: "2025-05-12", toDate: "2025-05-12", totalHolidays: 1, type: "Optional" },
    { name: "Independence Day", fromDate: "2025-08-15", toDate: "2025-08-15", totalHolidays: 1, type: "National" },
    { name: "Janmashtami", fromDate: "2025-08-16", toDate: "2025-08-16", totalHolidays: 1, type: "Regional" },
    { name: "Ganesh Chaturthi", fromDate: "2025-09-03", toDate: "2025-09-03", totalHolidays: 1, type: "Regional" },
    { name: "Dussehra", fromDate: "2025-10-02", toDate: "2025-10-02", totalHolidays: 1, type: "National" },
    { name: "Gandhi Jayanti", fromDate: "2025-10-02", toDate: "2025-10-02", totalHolidays: 1, type: "National" },
    { name: "Diwali", fromDate: "2025-10-20", toDate: "2025-10-21", totalHolidays: 2, type: "National" },
    { name: "Guru Nanak Jayanti", fromDate: "2025-11-15", toDate: "2025-11-15", totalHolidays: 1, type: "Optional" },
    { name: "Christmas", fromDate: "2025-12-25", toDate: "2025-12-25", totalHolidays: 1, type: "National" },

    { name: "New Year's Day", fromDate: "2026-01-01", toDate: "2026-01-02", totalHolidays: 2, type: "National" },
    { name: "Makar Sankranti", fromDate: "2026-01-14", toDate: "2026-01-14", totalHolidays: 1, type: "Regional" },
    { name: "Republic Day", fromDate: "2026-01-26", toDate: "2026-01-26", totalHolidays: 1, type: "National" },
    { name: "Maha Shivaratri", fromDate: "2026-02-17", toDate: "2026-02-17", totalHolidays: 1, type: "Optional" },
    { name: "Holi", fromDate: "2026-03-04", toDate: "2026-03-04", totalHolidays: 1, type: "National" },
    { name: "Good Friday", fromDate: "2026-04-03", toDate: "2026-04-03", totalHolidays: 1, type: "Regional" },
    { name: "Eid ul-Fitr", fromDate: "2026-04-10", toDate: "2026-04-10", totalHolidays: 1, type: "National" },
    { name: "Mahavir Jayanti", fromDate: "2026-04-29", toDate: "2026-04-29", totalHolidays: 1, type: "Optional" },
    { name: "Buddha Purnima", fromDate: "2026-05-01", toDate: "2026-05-01", totalHolidays: 1, type: "Optional" },
    { name: "Eid ul-Adha", fromDate: "2026-05-28", toDate: "2026-05-28", totalHolidays: 1, type: "National" },
    { name: "Muharram", fromDate: "2026-06-26", toDate: "2026-06-26", totalHolidays: 1, type: "Optional" },
    { name: "Janmashtami", fromDate: "2026-08-05", toDate: "2026-08-05", totalHolidays: 1, type: "Regional" },
    { name: "Independence Day", fromDate: "2026-08-15", toDate: "2026-08-15", totalHolidays: 1, type: "National" },
    { name: "Ganesh Chaturthi", fromDate: "2026-08-16", toDate: "2026-08-16", totalHolidays: 1, type: "Regional" },
    { name: "Milad un-Nabi", fromDate: "2026-08-25", toDate: "2026-08-25", totalHolidays: 1, type: "Optional" },
    { name: "Dussehra", fromDate: "2026-09-21", toDate: "2026-09-21", totalHolidays: 1, type: "National" },
    { name: "Gandhi Jayanti", fromDate: "2026-10-02", toDate: "2026-10-02", totalHolidays: 1, type: "National" },
    { name: "Diwali", fromDate: "2026-10-09", toDate: "2026-10-10", totalHolidays: 2, type: "National" },
    { name: "Guru Nanak Jayanti", fromDate: "2026-11-24", toDate: "2026-11-24", totalHolidays: 1, type: "Optional" },
    { name: "Christmas", fromDate: "2026-12-25", toDate: "2026-12-25", totalHolidays: 1, type: "National" },
  ];

  // Get fresh list after cleanup
  const currentHolidays = await storage.getAllHolidays();

  // Create holidays only if they don't exist
  for (const holiday of holidaysData) {
    const exists = currentHolidays.some(
      h => h.name === holiday.name && h.fromDate === holiday.fromDate
    );

    if (!exists) {
      await storage.createHoliday({
        ...holiday,
        companyId: null,
      });
    }
  }

  // Create reimbursement types
  const reimbTypes = await storage.getAllReimbursementTypes();
  if (reimbTypes.length === 0) {
    await storage.createReimbursementType({
      name: 'Travel',
    });

    await storage.createReimbursementType({
      name: 'Meals & Entertainment',
    });

    await storage.createReimbursementType({
      name: 'Office Supplies',
    });

    await storage.createReimbursementType({
      name: 'Accommodation',
    });

    await storage.createReimbursementType({
      name: 'Phone & Internet',
    });

    await storage.createReimbursementType({
      name: 'Others',
    });

    console.log('Reimbursement types created');
  }

  // Create sample reimbursements
  console.log('Creating sample reimbursements...');
  const existingReimbursements = await storage.getAllReimbursements();
  console.log('Reimbursements already exist:', existingReimbursements.length);

  // Always recreate reimbursements to ensure they exist
  const travelType = await storage.getAllReimbursementTypes().then(types =>
    types.find(t => t.name === 'Travel')
  );
  const mealsType = await storage.getAllReimbursementTypes().then(types =>
    types.find(t => t.name === 'Meals & Entertainment')
  );
  const officeSuppliesType = await storage.getAllReimbursementTypes().then(types =>
    types.find(t => t.name === 'Office Supplies')
  );

  if (!travelType || !mealsType || !officeSuppliesType) {
    console.log('Reimbursement types not found, skipping reimbursement creation');
    return;
  }

  // Find a manager user for reimbursement approval
  const managerUserForReimb = await storage.getAllUserProfiles().then(users =>
    users.find(u => u.roleId === managerRole.id)
  );

  if (!managerUserForReimb) {
    console.log('Manager not found, skipping reimbursement creation');
    return;
  }

  if (existingReimbursements.length === 0) {
    const reimbursements = [
      {
        id: randomUUID(),
        userId: johnDoe.id,
        reimbursementTypeId: travelType.id,
        date: '2025-01-15',
        amount: '1500.00',
        category: 'Client meeting travel expenses',
        attachment: null,
        status: 'Pending',
        managerId: managerUserForReimb.id,
        managerApprovalDate: null,
        managerComments: null,
        accountantId: null,
        accountantApprovalDate: null,
        accountantComments: null,
        createdAt: new Date('2025-01-15'),
      },
      {
        id: randomUUID(),
        userId: johnDoe.id,
        reimbursementTypeId: mealsType.id,
        date: '2025-01-10',
        amount: '850.00',
        category: 'Team lunch with client',
        attachment: null,
        status: 'Manager Approved',
        managerId: managerUserForReimb.id,
        managerApprovalDate: new Date('2025-01-11'),
        managerComments: 'Approved',
        accountantId: null,
        accountantApprovalDate: null,
        accountantComments: null,
        createdAt: new Date('2025-01-10'),
      },
      {
        id: randomUUID(),
        userId: adminUser.id,
        reimbursementTypeId: officeSuppliesType.id,
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
      {
        id: randomUUID(),
        userId: johnDoe.id,
        reimbursementTypeId: officeSuppliesType.id,
        date: '2025-01-08',
        amount: '500.00',
        category: 'Office stationery',
        attachment: null,
        status: 'Rejected',
        managerId: managerUserForReimb.id,
        managerApprovalDate: new Date('2025-01-09'),
        managerComments: 'Not required',
        accountantId: null,
        accountantApprovalDate: null,
        accountantComments: null,
        createdAt: new Date('2025-01-08'),
      },
    ];

    for (const reimb of reimbursements) {
      await db.insert(reimbursements).values(reimb);
    }
  }

  console.log('Database seeded successfully!');
}