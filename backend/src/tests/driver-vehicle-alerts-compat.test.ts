import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { and, eq, like } from 'drizzle-orm';
import { Role, VehicleComponent, VehicleScheduleKind, VehicleScheduleStatus } from '@tingting/shared';
import { client, db } from '../db';
import * as s from '../db/schema';
import { getDriverVehicleAlerts } from '../services/driver.service';
import {
  cancelVehicleSchedule,
  completeVehicleSchedule,
  listVehicleSchedules,
  updateVehicleSchedule,
} from '../services/vehicle-schedule.service';

const NS = `driver-alert-compat-${Date.now()}`;

let actorUserId = 0;
let driverUserId = 0;
let driverId = 0;
let truckId = 0;
const userIds: number[] = [];
const driverIds: number[] = [];
const truckIds: number[] = [];
const supplierIds: number[] = [];
const expenseCategoryIds: number[] = [];
const expenseIds: number[] = [];
const scheduleIds: number[] = [];

function remember(target: number[], id: number): number {
  target.push(id);
  return id;
}

function addDays(base: Date, days: number): Date {
  const value = new Date(base);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

async function insertTruck(values: Partial<typeof s.trucks.$inferInsert> = {}) {
  const [truck] = await db.insert(s.trucks).values({
    licensePlate: `15C-${String(Date.now() + truckIds.length).slice(-5)}`,
    status: 'ACTIVE',
    ...values,
  }).returning({ id: s.trucks.id });
  truckIds.push(truck.id);
  return truck.id;
}

async function insertVehicleSchedule(values: Omit<typeof s.vehicleSchedules.$inferInsert, 'createdBy' | 'updatedBy'>) {
  const [schedule] = await db.insert(s.vehicleSchedules).values({
    ...values,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  }).returning({ id: s.vehicleSchedules.id });
  scheduleIds.push(schedule.id);
  return schedule.id;
}

async function insertSupplier(name: string) {
  const [supplier] = await db.insert(s.suppliers).values({
    name,
    status: 'ACTIVE',
  }).returning({ id: s.suppliers.id });
  supplierIds.push(supplier.id);
  return supplier.id;
}

async function insertExpenseCategory(name: string) {
  const [category] = await db.insert(s.expenseCategories).values({
    name,
    isRenewable: true,
    reminderLeadDays: 30,
    status: 'ACTIVE',
  }).returning({ id: s.expenseCategories.id });
  expenseCategoryIds.push(category.id);
  return category.id;
}

async function insertRenewableExpense(values: Omit<typeof s.expenses.$inferInsert, 'supplierId' | 'categoryId' | 'createdBy' | 'amount' | 'paymentStatus'> & {
  supplierId: number;
  categoryId: number;
}) {
  const [expense] = await db.insert(s.expenses).values({
    amount: '1000000',
    paymentStatus: 'PAID',
    createdBy: actorUserId,
    ...values,
  }).returning({ id: s.expenses.id });
  expenseIds.push(expense.id);
  return expense.id;
}

async function applyRenewableBackfillHarness(vehicleIds: number[]): Promise<void> {
  type Candidate = {
    expenseId: number;
    vehicleComponent: 'TRUCK' | 'TRAILER';
    vehicleId: number;
    kind: 'INSURANCE';
    title: 'Bảo hiểm';
    validTo: Date;
    remindAt: Date;
  };

  const rows = await db.select({
    expenseId: s.expenses.id,
    vehicleComponent: s.expenses.vehicleComponent,
    vehicleId: s.expenses.truckId,
    categoryName: s.expenseCategories.name,
    validTo: s.expenses.validTo,
    reminderLeadDays: s.expenseCategories.reminderLeadDays,
  }).from(s.expenses)
    .innerJoin(s.expenseCategories, eq(s.expenses.categoryId, s.expenseCategories.id))
    .where(and(
      eq(s.expenseCategories.isRenewable, true),
      eq(s.expenseCategories.name, 'Bảo hiểm'),
    ));

  const latestByVehicle = new Map<string, Candidate>();
  for (const row of rows) {
    if (!row.vehicleId || !row.vehicleComponent || !row.validTo) continue;
    if (!vehicleIds.includes(row.vehicleId)) continue;

    const remindAt = new Date(row.validTo);
    remindAt.setUTCDate(remindAt.getUTCDate() - (row.reminderLeadDays ?? 30));

    const candidate: Candidate = {
      expenseId: row.expenseId,
      vehicleComponent: row.vehicleComponent,
      vehicleId: row.vehicleId,
      kind: VehicleScheduleKind.INSURANCE,
      title: 'Bảo hiểm',
      validTo: row.validTo,
      remindAt,
    };
    const key = `${candidate.vehicleComponent}:${candidate.vehicleId}:${candidate.kind}`;
    const current = latestByVehicle.get(key);
    if (
      !current
      || current.validTo.getTime() < candidate.validTo.getTime()
      || (
        current.validTo.getTime() === candidate.validTo.getTime()
        && current.expenseId < candidate.expenseId
      )
    ) {
      latestByVehicle.set(key, candidate);
    }
  }

  for (const candidate of latestByVehicle.values()) {
    const desiredSourceKey = `renewable-expense:${candidate.expenseId}`;
    const [existingBackfilled] = await db.select({
      id: s.vehicleSchedules.id,
      sourceKey: s.vehicleSchedules.sourceKey,
    }).from(s.vehicleSchedules)
      .where(and(
        eq(s.vehicleSchedules.vehicleComponent, candidate.vehicleComponent),
        eq(s.vehicleSchedules.vehicleId, candidate.vehicleId),
        eq(s.vehicleSchedules.kind, candidate.kind),
        eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
        like(s.vehicleSchedules.sourceKey, 'renewable-expense:%'),
      ))
      .orderBy(s.vehicleSchedules.updatedAt, s.vehicleSchedules.id)
      .limit(1);

    if (existingBackfilled) {
      if (existingBackfilled.sourceKey !== desiredSourceKey) {
        await db.update(s.vehicleSchedules).set({
          sourceKey: desiredSourceKey,
          title: candidate.title,
          dueAt: candidate.validTo,
          remindAt: candidate.remindAt,
          updatedAt: new Date(),
          updatedBy: actorUserId,
        }).where(eq(s.vehicleSchedules.id, existingBackfilled.id));
      }
      continue;
    }

    const [activeUserSchedule] = await db.select({ id: s.vehicleSchedules.id })
      .from(s.vehicleSchedules)
      .where(and(
        eq(s.vehicleSchedules.vehicleComponent, candidate.vehicleComponent),
        eq(s.vehicleSchedules.vehicleId, candidate.vehicleId),
        eq(s.vehicleSchedules.kind, candidate.kind),
        eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
      ))
      .limit(1);

    if (activeUserSchedule) continue;

    const [created] = await db.insert(s.vehicleSchedules).values({
      vehicleComponent: candidate.vehicleComponent,
      vehicleId: candidate.vehicleId,
      kind: candidate.kind,
      sourceKey: desiredSourceKey,
      title: candidate.title,
      dueAt: candidate.validTo,
      remindAt: candidate.remindAt,
      status: VehicleScheduleStatus.ACTIVE,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    }).returning({ id: s.vehicleSchedules.id });
    scheduleIds.push(created.id);
  }
}

before(async () => {
  const [actor] = await db.insert(s.users).values({
    username: `${NS}-actor`,
    fullName: 'Compat Actor',
    email: `${NS}-actor@test.local`,
    passwordHash: 'x',
    role: Role.ADMIN,
    status: 'ACTIVE',
  }).returning({ id: s.users.id });
  actorUserId = remember(userIds, actor.id);

  const [driverUser] = await db.insert(s.users).values({
    username: `${NS}-driver`,
    fullName: 'Compat Driver',
    email: `${NS}-driver@test.local`,
    passwordHash: 'x',
    role: Role.DRIVER,
    status: 'ACTIVE',
  }).returning({ id: s.users.id });
  driverUserId = remember(userIds, driverUser.id);

  const now = new Date();
  const [truck] = await db.insert(s.trucks).values({
    licensePlate: `15C-${String(Date.now()).slice(-5)}`,
    status: 'ACTIVE',
    nextInspectionDate: formatDateOnly(addDays(now, 7)),
    insuranceExpiryDate: formatDateOnly(addDays(now, 8)),
    lastOilServiceDate: formatDateOnly(addDays(now, 9)),
  }).returning({ id: s.trucks.id });
  truckId = remember(truckIds, truck.id);

  const [driver] = await db.insert(s.drivers).values({
    userId: driverUserId,
    name: 'Compat Driver',
    assignedTruckId: truckId,
    status: 'ACTIVE',
  }).returning({ id: s.drivers.id });
  driverId = remember(driverIds, driver.id);

  const schedules = await db.insert(s.vehicleSchedules).values([
    {
      vehicleComponent: VehicleComponent.TRUCK,
      vehicleId: truckId,
      kind: VehicleScheduleKind.INSPECTION,
      title: 'Đăng kiểm',
      dueAt: addDays(now, 2),
      remindAt: addDays(now, 1),
      status: VehicleScheduleStatus.ACTIVE,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      vehicleComponent: VehicleComponent.TRUCK,
      vehicleId: truckId,
      kind: VehicleScheduleKind.INSURANCE,
      title: 'Bảo hiểm',
      dueAt: addDays(now, 3),
      remindAt: addDays(now, -1),
      status: VehicleScheduleStatus.ACTIVE,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
    {
      vehicleComponent: VehicleComponent.TRUCK,
      vehicleId: truckId,
      kind: VehicleScheduleKind.MAINTENANCE,
      title: 'Thay dầu kế tiếp',
      dueAt: addDays(now, 1),
      remindAt: addDays(now, -1),
      status: VehicleScheduleStatus.ACTIVE,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    },
  ]);
  void schedules;

  const seededSchedules = await db.select({ id: s.vehicleSchedules.id })
    .from(s.vehicleSchedules)
    .where(eq(s.vehicleSchedules.vehicleId, truckId))
    .orderBy(s.vehicleSchedules.id);
  for (const schedule of seededSchedules) scheduleIds.push(schedule.id);
});

after(async () => {
  try {
    for (const scheduleId of [...scheduleIds].reverse()) {
      await db.delete(s.vehicleSchedules).where(eq(s.vehicleSchedules.id, scheduleId));
    }
    for (const expenseId of [...expenseIds].reverse()) {
      await db.delete(s.expenses).where(eq(s.expenses.id, expenseId));
    }
    for (const driverRowId of [...driverIds].reverse()) {
      await db.delete(s.drivers).where(eq(s.drivers.id, driverRowId));
    }
    for (const truckRowId of [...truckIds].reverse()) {
      await db.delete(s.trucks).where(eq(s.trucks.id, truckRowId));
    }
    for (const categoryId of [...expenseCategoryIds].reverse()) {
      await db.delete(s.expenseCategories).where(eq(s.expenseCategories.id, categoryId));
    }
    for (const supplierId of [...supplierIds].reverse()) {
      await db.delete(s.suppliers).where(eq(s.suppliers.id, supplierId));
    }
    await db.delete(s.users).where(like(s.users.username, `${NS}%`));
  } finally {
    await client.end();
  }
});

test('getDriverVehicleAlerts prefers active canonical schedules and falls back to legacy truck dates when a schedule reminder is not active yet', async () => {
  const alerts = await getDriverVehicleAlerts(driverId);
  assert.ok(alerts);

  assert.deepEqual(
    alerts.map((item) => ({ field: item.field, date: item.date })),
    [
      { field: 'lastOilServiceDate', date: formatDateOnly(addDays(new Date(), 1)) },
      { field: 'insuranceExpiryDate', date: formatDateOnly(addDays(new Date(), 3)) },
    ],
  );
});

test('canonical completed or future schedules suppress stale legacy alerts for the mapped field', async () => {
  const tombstoneTruckId = await insertTruck({
    nextInspectionDate: '2026-07-29',
    insuranceExpiryDate: '2026-07-29',
    lastOilServiceDate: '2026-07-29',
  });
  const [user] = await db.insert(s.users).values({
    username: `${NS}-driver-tombstone`,
    fullName: 'Tombstone Driver',
    email: `${NS}-driver-tombstone@test.local`,
    passwordHash: 'x',
    role: Role.DRIVER,
    status: 'ACTIVE',
  }).returning({ id: s.users.id });
  userIds.push(user.id);
  const [driver] = await db.insert(s.drivers).values({
    userId: user.id,
    name: 'Tombstone Driver',
    assignedTruckId: tombstoneTruckId,
    status: 'ACTIVE',
  }).returning({ id: s.drivers.id });
  driverIds.push(driver.id);

  await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: tombstoneTruckId,
    kind: VehicleScheduleKind.INSPECTION,
    sourceKey: 'legacy-truck:nextInspectionDate:tombstone',
    title: 'Đăng kiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-08-10T00:00:00.000Z'),
    remindAt: new Date('2026-08-01T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });
  await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: tombstoneTruckId,
    kind: VehicleScheduleKind.INSURANCE,
    sourceKey: 'legacy-truck:insuranceExpiryDate:tombstone',
    title: 'Bảo hiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-08-02T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.COMPLETED,
    completedAt: new Date('2026-07-21T00:00:00.000Z'),
    completedBy: actorUserId,
  });
  await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: tombstoneTruckId,
    kind: VehicleScheduleKind.MAINTENANCE,
    sourceKey: 'legacy-truck:lastOilServiceDate:tombstone',
    title: 'Thay dầu kế tiếp',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-08-03T00:00:00.000Z'),
    remindAt: new Date('2026-08-01T00:00:00.000Z'),
    status: VehicleScheduleStatus.CANCELLED,
    cancelledAt: new Date('2026-07-22T00:00:00.000Z'),
    cancelledBy: actorUserId,
  });

  const alerts = await getDriverVehicleAlerts(driver.id);
  assert.deepEqual(alerts, []);
});

test('operational active list excludes schedules whose truck is soft-deleted but history retains them', async () => {
  const now = new Date('2026-07-28T03:00:00.000Z');
  const deletedTruckId = await insertTruck();
  await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
    kind: VehicleScheduleKind.INSPECTION,
    sourceKey: null,
    title: 'Đăng kiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-07-27T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });
  await db.update(s.trucks).set({ deletedAt: new Date('2026-07-28T04:00:00.000Z') })
    .where(eq(s.trucks.id, deletedTruckId));

  const activeItems = await listVehicleSchedules(db, {
    history: false,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
  }, now);
  const historyItems = await listVehicleSchedules(db, {
    history: true,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
  }, now);

  assert.deepEqual(activeItems, []);
  assert.equal(historyItems.length, 1);
});

test('vehicle schedules remain listable and clearable after the linked truck is soft-deleted, while unchanged updates still work', async () => {
  const now = new Date('2026-07-28T03:00:00.000Z');
  const deletedTruckId = await insertTruck();
  const completeId = await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
    kind: VehicleScheduleKind.INSPECTION,
    sourceKey: null,
    title: 'Đăng kiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-07-27T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });
  const cancelId = await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
    kind: VehicleScheduleKind.INSURANCE,
    sourceKey: null,
    title: 'Bảo hiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-07-28T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });

  await db.update(s.trucks).set({ deletedAt: new Date('2026-07-28T04:00:00.000Z') })
    .where(eq(s.trucks.id, deletedTruckId));

  const listedBefore = await listVehicleSchedules(db, {
    history: true,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
  }, now);

  assert.equal(listedBefore.length, 2);
  assert.ok(listedBefore.every((item) => item.vehiclePlate.startsWith('15C-')));

  const updated = await updateVehicleSchedule(db, completeId, {
    notes: 'Xe đã ngừng khai thác',
  }, actorUserId);
  assert.equal(updated.notes, 'Xe đã ngừng khai thác');
  assert.ok(updated.vehiclePlate.startsWith('15C-'));

  const completed = await completeVehicleSchedule(db, completeId, actorUserId);
  const cancelled = await cancelVehicleSchedule(db, cancelId, actorUserId);
  assert.equal(completed.status, VehicleScheduleStatus.COMPLETED);
  assert.equal(cancelled.status, VehicleScheduleStatus.CANCELLED);
  assert.ok(completed.vehiclePlate.startsWith('15C-'));
  assert.ok(cancelled.vehiclePlate.startsWith('15C-'));

  const listedAfter = await listVehicleSchedules(db, {
    history: false,
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: deletedTruckId,
  }, now);
  assert.deepEqual(listedAfter, []);
});

test('complete then cancel on the same schedule returns a deterministic conflict, and terminal schedules reject updates', async () => {
  const truckForRaceId = await insertTruck();
  const scheduleId = await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: truckForRaceId,
    kind: VehicleScheduleKind.INSPECTION,
    sourceKey: null,
    title: 'Đăng kiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-08-01T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });

  const completed = await completeVehicleSchedule(db, scheduleId, actorUserId);
  assert.equal(completed.status, VehicleScheduleStatus.COMPLETED);
  await assert.rejects(
    () => cancelVehicleSchedule(db, scheduleId, actorUserId),
    /Lịch nhắc việc đã được xử lý, không thể chỉnh sửa/,
  );
  await assert.rejects(
    () => updateVehicleSchedule(db, scheduleId, { notes: 'muộn rồi' }, actorUserId),
    /Lịch nhắc việc đã được xử lý, không thể chỉnh sửa/,
  );
});

test('changing a schedule to a soft-deleted truck still fails live vehicle validation', async () => {
  const liveTruckId = await insertTruck();
  const deletedTruckId = await insertTruck();
  const scheduleId = await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: liveTruckId,
    kind: VehicleScheduleKind.INSPECTION,
    sourceKey: null,
    title: 'Đăng kiểm',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-08-01T00:00:00.000Z'),
    remindAt: new Date('2026-07-20T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });

  await db.update(s.trucks).set({ deletedAt: new Date('2026-07-28T05:00:00.000Z') })
    .where(eq(s.trucks.id, deletedTruckId));

  await assert.rejects(
    () => updateVehicleSchedule(db, scheduleId, {
      vehicleId: deletedTruckId,
    }, actorUserId),
    /Không tìm thấy xe đầu kéo/,
  );
});

test('renewable backfill rerun updates the existing auto-backfilled schedule to the latest expense without duplicating user-created active schedules', async () => {
  const supplierId = await insertSupplier(`${NS}-supplier`);
  const categoryId = await insertExpenseCategory('Bảo hiểm');
  const autoTruckId = await insertTruck();
  const manualTruckId = await insertTruck();

  const firstExpenseId = await insertRenewableExpense({
    expenseDate: '2026-06-01',
    supplierId,
    categoryId,
    truckId: autoTruckId,
    vehicleComponent: VehicleComponent.TRUCK,
    validTo: new Date('2026-08-15T00:00:00.000Z'),
    validFrom: null,
    receiptId: null,
    note: `${NS}-expense-1`,
  });
  await applyRenewableBackfillHarness([autoTruckId, manualTruckId]);

  const [firstSchedule] = await db.select({
    id: s.vehicleSchedules.id,
    sourceKey: s.vehicleSchedules.sourceKey,
    dueAt: s.vehicleSchedules.dueAt,
  }).from(s.vehicleSchedules)
    .where(and(
      eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRUCK),
      eq(s.vehicleSchedules.vehicleId, autoTruckId),
      eq(s.vehicleSchedules.kind, VehicleScheduleKind.INSURANCE),
      eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
    ))
    .limit(1);

  assert.ok(firstSchedule);
  assert.equal(firstSchedule.sourceKey, `renewable-expense:${firstExpenseId}`);
  assert.equal(firstSchedule.dueAt.toISOString(), '2026-08-15T00:00:00.000Z');

  const secondExpenseId = await insertRenewableExpense({
    expenseDate: '2026-07-01',
    supplierId,
    categoryId,
    truckId: autoTruckId,
    vehicleComponent: VehicleComponent.TRUCK,
    validTo: new Date('2026-09-15T00:00:00.000Z'),
    validFrom: null,
    receiptId: null,
    note: `${NS}-expense-2`,
  });
  await insertVehicleSchedule({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: manualTruckId,
    kind: VehicleScheduleKind.INSURANCE,
    sourceKey: null,
    title: 'Bảo hiểm do người dùng tạo',
    documentNumber: null,
    notes: null,
    dueAt: new Date('2026-10-01T00:00:00.000Z'),
    remindAt: new Date('2026-09-01T00:00:00.000Z'),
    status: VehicleScheduleStatus.ACTIVE,
  });
  await insertRenewableExpense({
    expenseDate: '2026-07-02',
    supplierId,
    categoryId,
    truckId: manualTruckId,
    vehicleComponent: VehicleComponent.TRUCK,
    validTo: new Date('2026-11-15T00:00:00.000Z'),
    validFrom: null,
    receiptId: null,
    note: `${NS}-expense-3`,
  });

  await applyRenewableBackfillHarness([autoTruckId, manualTruckId]);

  const autoSchedules = await db.select({
    id: s.vehicleSchedules.id,
    sourceKey: s.vehicleSchedules.sourceKey,
    dueAt: s.vehicleSchedules.dueAt,
  }).from(s.vehicleSchedules)
    .where(and(
      eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRUCK),
      eq(s.vehicleSchedules.vehicleId, autoTruckId),
      eq(s.vehicleSchedules.kind, VehicleScheduleKind.INSURANCE),
      eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
    ));

  assert.equal(autoSchedules.length, 1);
  assert.equal(autoSchedules[0].id, firstSchedule.id);
  assert.equal(autoSchedules[0].sourceKey, `renewable-expense:${secondExpenseId}`);
  assert.equal(autoSchedules[0].dueAt.toISOString(), '2026-09-15T00:00:00.000Z');

  const manualSchedules = await db.select({
    id: s.vehicleSchedules.id,
    sourceKey: s.vehicleSchedules.sourceKey,
    title: s.vehicleSchedules.title,
  }).from(s.vehicleSchedules)
    .where(and(
      eq(s.vehicleSchedules.vehicleComponent, VehicleComponent.TRUCK),
      eq(s.vehicleSchedules.vehicleId, manualTruckId),
      eq(s.vehicleSchedules.kind, VehicleScheduleKind.INSURANCE),
      eq(s.vehicleSchedules.status, VehicleScheduleStatus.ACTIVE),
    ));

  assert.equal(manualSchedules.length, 1);
  assert.equal(manualSchedules[0].sourceKey, null);
  assert.equal(manualSchedules[0].title, 'Bảo hiểm do người dùng tạo');
});
