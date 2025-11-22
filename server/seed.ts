import { db } from './db';
import { userRoles, userProfiles, leaveTypes, reimbursementTypes, userTypes, departments } from '@shared/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

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

  // Create a Manager role user if not exists
  const [managerRole] = await db.select().from(userRoles).where(eq(userRoles.roleName, 'Manager'));
  const managerUserExists = await db.query.userProfiles.findFirst({ where: eq(userProfiles.username, 'manager') });
  if (managerRole && !managerUserExists) {
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
  }

  // Create a regular Employee user if not exists
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
    }
  }


  console.log('Database seeding completed!');
}