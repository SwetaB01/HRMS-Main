import { db } from './db';
import { userRoles, userProfiles, leaveTypes, reimbursementTypes } from '@shared/schema';
import bcrypt from 'bcryptjs';

export async function seedDatabase() {
  console.log('Seeding database...');

  // Check if admin user already exists
  const existingUsers = await db.select().from(userProfiles);
  if (existingUsers.length > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

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

  console.log('Database seeding completed!');
}
