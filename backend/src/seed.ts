import bcrypt from 'bcryptjs';
import { db } from './db';
import * as schema from './db/schema';
import { Role } from '@nepocorp/shared';

async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { username: 'admin', email: 'admin@nepo.vn', phone: '0900000000', passwordHash, role: Role.ADMIN, fullName: 'Quản trị' },
    { username: 'giamdoc', email: 'giamdoc@nepo.vn', phone: '0900000001', passwordHash, role: Role.MANAGER, fullName: 'Giám đốc' },
    { username: 'ketoan', email: 'ketoan@nepo.vn', phone: '0900000002', passwordHash, role: Role.ACCOUNTANT, fullName: 'Kế toán' },
    { username: 'laixe', email: 'laixe@nepo.vn', phone: '0900000003', passwordHash, role: Role.DRIVER, fullName: 'Lái xe' },
  ];

  for (const user of users) {
    await db.insert(schema.users).values(user).onConflictDoNothing();
  }

  console.log('✅ Users seeded!');
  for (const u of users) {
    console.log(`  ${u.username} / admin123 (${u.role})`);
  }
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
