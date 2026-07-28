import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createVehicleScheduleSchema,
  updateVehicleScheduleSchema,
  vehicleScheduleListQuerySchema,
  VehicleComponent,
  VehicleScheduleKind,
} from '../index';

test('createVehicleScheduleSchema accepts exact timezone-aware timestamps and preserves the Vietnam boundary instant', () => {
  const parsed = createVehicleScheduleSchema.safeParse({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: 7,
    kind: VehicleScheduleKind.INSPECTION,
    title: 'Đăng kiểm quý 3',
    dueAt: '2026-07-29T00:00:00+07:00',
    remindAt: '2026-07-28T08:30:00+07:00',
  });

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(
    new Date(parsed.data.dueAt).toISOString(),
    '2026-07-28T17:00:00.000Z',
  );
  assert.equal(
    new Date(parsed.data.remindAt).toISOString(),
    '2026-07-28T01:30:00.000Z',
  );
});

test('createVehicleScheduleSchema rejects remindAt after dueAt', () => {
  const parsed = createVehicleScheduleSchema.safeParse({
    vehicleComponent: VehicleComponent.TRAILER,
    vehicleId: 12,
    kind: VehicleScheduleKind.ROAD_FEE,
    title: 'Phí đường bộ',
    dueAt: '2026-07-29T00:00:00+07:00',
    remindAt: '2026-07-29T00:01:00+07:00',
  });

  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.equal(parsed.error.issues[0]?.path.join('.'), 'remindAt');
});

test('updateVehicleScheduleSchema accepts optional nullable notes fields but still requires timezone-aware timestamps when provided', () => {
  const parsed = updateVehicleScheduleSchema.safeParse({
    title: 'Bảo dưỡng 10.000 km',
    documentNumber: null,
    notes: null,
    dueAt: '2026-07-30T09:00:00Z',
    remindAt: '2026-07-29T09:00:00Z',
  });

  assert.equal(parsed.success, true);
});

test('vehicleScheduleListQuerySchema defaults to active reminders only', () => {
  const parsed = vehicleScheduleListQuerySchema.parse({});

  assert.equal(parsed.history, false);
  assert.equal(parsed.vehicleComponent, undefined);
  assert.equal(parsed.vehicleId, undefined);
});

test('vehicleScheduleListQuerySchema rejects locale-ambiguous timestamps without an explicit offset', () => {
  const parsed = createVehicleScheduleSchema.safeParse({
    vehicleComponent: VehicleComponent.TRUCK,
    vehicleId: 1,
    kind: VehicleScheduleKind.MAINTENANCE,
    title: 'Bảo dưỡng định kỳ',
    dueAt: '2026-07-29T00:00:00',
    remindAt: '2026-07-28T00:00:00+07:00',
  });

  assert.equal(parsed.success, false);
  if (parsed.success) return;
  assert.equal(parsed.error.issues[0]?.path.join('.'), 'dueAt');
});

test('vehicle schedule vehicle ids stay within the PostgreSQL serial range', () => {
  const base = {
    vehicleComponent: VehicleComponent.TRUCK,
    kind: VehicleScheduleKind.INSPECTION,
    title: 'Đăng kiểm',
    dueAt: '2026-07-30T10:00:00.000Z',
    remindAt: '2026-07-28T01:00:00.000Z',
  };

  assert.equal(createVehicleScheduleSchema.safeParse({ ...base, vehicleId: 2147483647 }).success, true);
  assert.equal(createVehicleScheduleSchema.safeParse({ ...base, vehicleId: 2147483648 }).success, false);
  assert.equal(vehicleScheduleListQuerySchema.safeParse({ history: true, vehicleId: '2147483648' }).success, false);
});
