import bcrypt from 'bcryptjs';
import { db } from './db';
import * as schema from './db/schema';
import { Role } from '@nepocorp/shared';
import { eq } from 'drizzle-orm';

async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { username: 'admin', email: 'admin@nepo.vn', phone: '0900000000', passwordHash, role: Role.ADMIN, fullName: 'Trần Văn Admin' },
    { username: 'giamdoc', email: 'giamdoc@nepo.vn', phone: '0900000001', passwordHash, role: Role.MANAGER, fullName: 'Lê Văn Tỉnh' },
    { username: 'ketoan', email: 'ketoan@nepo.vn', phone: '0900000002', passwordHash, role: Role.ACCOUNTANT, fullName: 'Nguyễn Thị Mai' },
    { username: 'laixe', email: 'laixe@nepo.vn', phone: '0900000003', passwordHash, role: Role.DRIVER, fullName: 'Phạm Văn Hùng' },
  ];

  for (const user of users) {
    await db.insert(schema.users).values(user).onConflictDoNothing();
  }

  console.log('✅ Users seeded!');
  for (const u of users) {
    console.log(`  ${u.username} / admin123 (${u.role})`);
  }

  const categories = [
    { name: 'Sửa chữa', isRenewable: false, status: 'ACTIVE' },
    { name: 'Phụ tùng', isRenewable: false, status: 'ACTIVE' },
    { name: 'Vật tư', isRenewable: false, status: 'ACTIVE' },
    { name: 'Bảo hiểm', isRenewable: true, reminderLeadDays: 30, status: 'ACTIVE' },
    { name: 'Đăng kiểm', isRenewable: true, reminderLeadDays: 30, status: 'ACTIVE' },
    { name: 'Phí đường bộ', isRenewable: true, reminderLeadDays: 30, status: 'ACTIVE' },
  ];

  // Deduplicate existing categories
  const allCats = await db.select().from(schema.expenseCategories);
  const nameToIds = new Map<string, number[]>();
  for (const c of allCats) {
    const ids = nameToIds.get(c.name) || [];
    ids.push(c.id);
    nameToIds.set(c.name, ids);
  }

  for (const [name, ids] of nameToIds.entries()) {
    if (ids.length > 1) {
      const keepId = ids[0];
      const dupIds = ids.slice(1);
      for (const dupId of dupIds) {
        await db.update(schema.expenses)
          .set({ categoryId: keepId })
          .where(eq(schema.expenses.categoryId, dupId));
        await db.delete(schema.expenseCategories)
          .where(eq(schema.expenseCategories.id, dupId));
      }
      console.log(`  Deduplicated category "${name}": kept ID ${keepId}, removed duplicates [${dupIds.join(', ')}]`);
    }
  }

  const existingCats = await db.select({ name: schema.expenseCategories.name })
    .from(schema.expenseCategories);
  const existingCatNames = new Set(existingCats.map(c => c.name));
  const newCats = categories.filter(c => !existingCatNames.has(c.name));
  if (newCats.length > 0) {
    for (const cat of newCats) {
      await db.insert(schema.expenseCategories).values(cat);
    }
    console.log(`✅ Expense categories seeded! (${newCats.length} new)`);
  } else {
    console.log('✅ Expense categories already exist, skipping.');
  }

  const trucks = [
    { licensePlate: '60C-12345', trailerPlateNumber: '70C-12345', trailerType: '40FT' as const, status: 'ACTIVE' as const },
    { licensePlate: '60C-23456', trailerPlateNumber: '70C-67890', trailerType: '20FT' as const, status: 'ACTIVE' as const },
    { licensePlate: '60C-34567', status: 'ACTIVE' as const },
    { licensePlate: '60C-45678', status: 'ACTIVE' as const },
    { licensePlate: '60C-56789', trailerPlateNumber: '70C-11111', trailerType: '40FT' as const, status: 'MAINTENANCE' as const },
  ];

  for (const truck of trucks) {
    await db.insert(schema.trucks).values(truck).onConflictDoNothing();
  }

  console.log('✅ Trucks seeded!');
  for (const t of trucks) {
    console.log(`  ${t.licensePlate}${t.trailerPlateNumber ? ` → rơ moóc ${t.trailerPlateNumber} (${t.trailerType})` : ''}`);
  }

  const penaltyReasons = [
    { reasonText: 'Đi trễ', defaultAmount: '100000' },
    { reasonText: 'Vi phạm tốc độ', defaultAmount: '200000' },
    { reasonText: 'Sử dụng điện thoại khi lái xe', defaultAmount: '300000' },
    { reasonText: 'Không tuân thủ tuyến đường', defaultAmount: '200000' },
    { reasonText: 'Xe không sạch sẽ', defaultAmount: '50000' },
    { reasonText: 'Thiếu giấy tờ', defaultAmount: '150000' },
    { reasonText: 'Không đội mũ bảo hiểm', defaultAmount: '100000' },
    { reasonText: 'Lái xe khi say xỉn', defaultAmount: '1000000' },
  ];

  const existingReasons = await db.select({ reasonText: schema.penaltyReasons.reasonText })
    .from(schema.penaltyReasons);
  const existingReasonTexts = new Set(existingReasons.map(r => r.reasonText));
  const newReasons = penaltyReasons.filter(r => !existingReasonTexts.has(r.reasonText));
  if (newReasons.length > 0) {
    for (const reason of newReasons) {
      await db.insert(schema.penaltyReasons).values(reason);
    }
    console.log(`✅ Penalty reasons seeded! (${newReasons.length} new)`);
  } else {
    console.log('✅ Penalty reasons already exist, skipping.');
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
