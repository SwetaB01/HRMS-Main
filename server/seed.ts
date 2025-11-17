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
  if (existingDepts.length === 0) {
    console.log('Seeding departments...');
    await db.insert(departments).values([
      { id: 'project-management', name: 'Project Management', parentDeptId: null },
      { id: 'marketing', name: 'Marketing', parentDeptId: null },
      { id: 'sales', name: 'Sales', parentDeptId: null },
      { id: 'hr', name: 'Human Resources', parentDeptId: null },
      { id: 'accounts', name: 'Accounts', parentDeptId: null },
      { id: 'inventory', name: 'Inventory', parentDeptId: null },
      { id: 'it', name: 'IT', parentDeptId: null },
    ]);
  }

  // Check if roles need to be reset
  const existingRoles = await db.select().from(userRoles);
  const desiredRoles = ['Developer', 'Tech Lead', 'HR Executive', 'Project Manager'];
  const needsReset = existingRoles.length === 0 || 
                     !desiredRoles.every(role => existingRoles.some(r => r.roleName === role));

  if (needsReset) {
    console.log('Resetting roles...');
    
    // First, set all user profiles roleId to null to avoid foreign key constraint
    await db.update(userProfiles).set({ roleId: null });
    
    // Now delete all existing roles
    await db.delete(userRoles);

    // Seed new roles
    const rolesData = [
      { roleName: 'Developer', roleDescription: 'Software developer', accessType: 'Limited Access', accessLevel: 'Employee' },
      { roleName: 'Tech Lead', roleDescription: 'Technical team leader', accessType: 'Limited Access', accessLevel: 'Manager' },
      { roleName: 'HR Executive', roleDescription: 'Human resources executive', accessType: 'Limited Access', accessLevel: 'Manager' },
      { roleName: 'Project Manager', roleDescription: 'Project management lead', accessType: 'Limited Access', accessLevel: 'Manager' },
    ];

    console.log('Adding new roles...');
    for (const role of rolesData) {
      await db.insert(userRoles).values(role);
    }
    
    console.log('Roles reset complete. Please reassign roles to users.');
  }

  // Only create admin user and default data if it doesn't exist
  if (!userAlreadyExists) {
    // Create default admin role
    const [adminRole] = await db.insert(userRoles).values({
      roleName: 'Administrator',
      roleDescription: 'Full system access',
      accessType: 'Admin',
      accessLevel: 'Full',
    }).returning();

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin', 10);
    await db.insert(userProfiles).values({
      roleId: adminRole.id,
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
    });

    // Create default leave types
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

    // Create default reimbursement types
    await db.insert(reimbursementTypes).values([
      { name: 'Travel' },
      { name: 'Meals & Entertainment' },
      { name: 'Office Supplies' },
      { name: 'Accommodation' },
      { name: 'Phone & Internet' },
      { name: 'Others' },
    ]);
  }

  console.log('Database seeding completed!');
}