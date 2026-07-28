import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeVehicleAlerts } from './vehicleAlerts';

test('computeVehicleAlerts uses Asia/Ho_Chi_Minh calendar days instead of server-local UTC day boundaries', () => {
  const alerts = computeVehicleAlerts(
    { nextInspectionDate: '2026-07-29' },
    new Date('2026-07-28T17:30:00.000Z'),
    30,
  );

  assert.deepEqual(
    alerts.map((item) => ({ field: item.field, daysUntil: item.daysUntil, status: item.status })),
    [
      { field: 'nextInspectionDate', daysUntil: 0, status: 'due' },
    ],
  );
});

test('computeVehicleAlerts preserves explicit today override and marks the previous Vietnam day as overdue at the UTC boundary', () => {
  const alerts = computeVehicleAlerts(
    { insuranceExpiryDate: '2026-07-28' },
    new Date('2026-07-28T17:30:00.000Z'),
    30,
  );

  assert.deepEqual(
    alerts.map((item) => ({ field: item.field, daysUntil: item.daysUntil, status: item.status })),
    [
      { field: 'insuranceExpiryDate', daysUntil: -1, status: 'overdue' },
    ],
  );
});
