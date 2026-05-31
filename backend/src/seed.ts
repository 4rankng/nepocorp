import bcrypt from 'bcryptjs';
import { db } from './db';
import * as schema from './db/schema';
import { Role } from '@nepocorp/shared';

async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await db.insert(schema.users).values({
    username: 'admin',
    email: 'admin@nepo.vn',
    phone: '0900000000',
    passwordHash,
    role: Role.ADMIN,
  }).onConflictDoNothing();

  console.log('✅ Admin user seeded!');
  console.log('  admin / admin123');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
