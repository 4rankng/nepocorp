import bcrypt from 'bcryptjs';
import { db } from './db';
import * as schema from './db/schema';
import { Role } from '@nepocorp/shared';
import { eq, and, desc } from 'drizzle-orm';

async function seed() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  const users = [
    { username: 'admin', email: 'admin@nepo.vn', phone: '0900000000', passwordHash, role: Role.ADMIN, fullName: 'Trần Văn Admin' },
    { username: 'giamdoc', email: 'giamdoc@nepo.vn', phone: '0900000001', passwordHash, role: Role.MANAGER, fullName: 'Lê Văn Tỉnh' },
    { username: 'ketoan', email: 'ketoan@nepo.vn', phone: '0900000002', passwordHash, role: Role.ACCOUNTANT, fullName: 'Nguyễn Thị Mai' },
    { username: 'laixe', email: 'laixe@nepo.vn', phone: '0900000003', passwordHash, role: Role.DRIVER, fullName: 'Phạm Văn Hùng' },
    { username: 'giaonhan', email: 'giaonhan@nepo.vn', phone: '0900000004', passwordHash, role: Role.FORWARDER, fullName: 'Nguyễn Văn Giao' },
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

  // Fix typo in existing penalty reasons (CFG3)
  const typoRows = await db.select().from(schema.penaltyReasons)
    .where(eq(schema.penaltyReasons.reasonText, 'Không chùy mũ bảo hiểm'));
  if (typoRows.length > 0) {
    await db.update(schema.penaltyReasons)
      .set({ reasonText: 'Không đội mũ bảo hiểm' })
      .where(eq(schema.penaltyReasons.reasonText, 'Không chùy mũ bảo hiểm'));
    console.log(`✅ Penalty reason typo fixed (${typoRows.length} row(s)).`);
  } else {
    console.log('✅ No penalty reason typo found, skipping fix.');
  }

  // Seed cap table (CAP1, CAP2)
  // Previous version did insert-only-if-empty, so an earlier broken seed run
  // (5 rows all "Ông Thương" 0%) couldn't be corrected without manual SQL.
  // Now we detect bad seed data (all rows have 0% or only one partner) and
  // reset to the canonical 60/40 split.
  const existingCap = await db.select().from(schema.capTableHistory);
  const distinctPartners = new Set(existingCap.map(r => r.partnerName));
  const hasNonZeroPct = existingCap.some(r => parseFloat(r.percentage as any) > 0);
  const needsReset =
    existingCap.length === 0 ||
    distinctPartners.size < 2 ||
    !hasNonZeroPct;
  if (needsReset) {
    if (existingCap.length > 0) {
      await db.delete(schema.capTableHistory);
      console.log(`⚠️  Cap table had ${existingCap.length} stale row(s) — clearing and reseeding.`);
    }
    const now = new Date();
    await db.insert(schema.capTableHistory).values([
      {
        partnerName: 'Ông Thương',
        contributionAmount: '0',
        percentage: '60.00',
        effectiveDate: `${now.getFullYear()}-01-01`,
      },
      {
        partnerName: 'Bà Hạnh',
        contributionAmount: '0',
        percentage: '40.00',
        effectiveDate: `${now.getFullYear()}-01-01`,
      },
    ]);
    console.log('✅ Cap table seeded! (60/40 split)');
  } else {
    console.log(`✅ Cap table OK (${existingCap.length} row(s), ${distinctPartners.size} partner(s)), skipping.`);
  }

  // Backfill ledger entries for UNPAID expenses that never posted (PAY1)
  // -------------------------------------------------------------------
  // We've seen UNPAID expenses created via API end up in `expenses` but
  // miss the matching `ledger` row (entityType=VENDOR), so /payables
  // displays 0đ even though the company genuinely owes the supplier.
  // For every UNPAID, non-deleted expense, ensure a VENDOR_EXPENSE
  // ledger row exists; if not, post one.
  const unpaidExpenses = await db.select({
    id: schema.expenses.id,
    supplierId: schema.expenses.supplierId,
    amount: schema.expenses.amount,
    categoryId: schema.expenses.categoryId,
    createdAt: schema.expenses.createdAt,
  }).from(schema.expenses)
    .where(eq(schema.expenses.paymentStatus, 'UNPAID'));

  let backfilledLedger = 0;
  for (const exp of unpaidExpenses) {
    const amount = parseFloat(exp.amount as any);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const existingLedger = await db.select({ id: schema.ledger.id })
      .from(schema.ledger)
      .where(and(
        eq(schema.ledger.entityType, 'VENDOR'),
        eq(schema.ledger.entityId, exp.supplierId),
        eq(schema.ledger.credit, exp.amount as any),
      ))
      .limit(1);
    if (existingLedger.length > 0) continue;
    // Compute running balance for this vendor and post the entry directly
    // (skip the LedgerService since we're outside its tx contract).
    const [lastEntry] = await db.select({ balance: schema.ledger.balance })
      .from(schema.ledger)
      .where(and(
        eq(schema.ledger.entityType, 'VENDOR'),
        eq(schema.ledger.entityId, exp.supplierId),
      ))
      .orderBy(desc(schema.ledger.id))
      .limit(1);
    const prevBalance = lastEntry ? parseFloat(lastEntry.balance as any) : 0;
    // Vendor: credit increases payable balance.
    const newBalance = prevBalance + amount;
    await db.insert(schema.ledger).values({
      txnType: 'VENDOR_EXPENSE',
      entityType: 'VENDOR',
      entityId: exp.supplierId,
      debit: '0',
      credit: String(amount),
      balance: String(newBalance),
      timestamp: exp.createdAt ?? new Date(),
      note: `Backfill: chi phí #${exp.id}`,
    } as any);
    backfilledLedger++;
  }
  if (backfilledLedger > 0) {
    console.log(`✅ Backfilled ${backfilledLedger} VENDOR ledger entr${backfilledLedger === 1 ? 'y' : 'ies'} for orphan UNPAID expenses.`);
  } else {
    console.log('✅ No orphan UNPAID expenses found, ledger is in sync.');
  }

  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
