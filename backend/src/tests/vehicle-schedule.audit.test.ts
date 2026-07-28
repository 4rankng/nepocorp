import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Role } from '@tingting/shared';
import { AuditEvent } from '../services/audit-types';
import { resolveAuditEvent } from '../services/audit-registry';
import {
  parsePositiveId,
  VEHICLE_SCHEDULE_OFFICE_ROLES,
} from '../routes/vehicle-schedules';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('vehicle schedule route contract', () => {
  test('office roles are ADMIN, MANAGER, and ACCOUNTANT only', () => {
    assert.deepEqual(VEHICLE_SCHEDULE_OFFICE_ROLES, [
      Role.ADMIN,
      Role.MANAGER,
      Role.ACCOUNTANT,
    ]);
  });

  test('audit registry maps create, update, complete, and cancel mutations', async () => {
    await import('../routes/vehicle-schedules');

    assert.equal(
      resolveAuditEvent('POST', '/api/vehicle-schedules'),
      AuditEvent.VEHICLE_SCHEDULE_CREATED,
    );
    assert.equal(
      resolveAuditEvent('PUT', '/api/vehicle-schedules/4'),
      AuditEvent.VEHICLE_SCHEDULE_UPDATED,
    );
    assert.equal(
      resolveAuditEvent('POST', '/api/vehicle-schedules/4/complete'),
      AuditEvent.VEHICLE_SCHEDULE_COMPLETED,
    );
    assert.equal(
      resolveAuditEvent('POST', '/api/vehicle-schedules/4/cancel'),
      AuditEvent.VEHICLE_SCHEDULE_CANCELLED,
    );
  });

  test('path id parser accepts only positive integers', () => {
    assert.equal(parsePositiveId('4'), 4);
    assert.throws(() => parsePositiveId('4abc'), /ID không hợp lệ/);
    assert.throws(() => parsePositiveId('1.2'), /ID không hợp lệ/);
    assert.throws(() => parsePositiveId('0'), /ID không hợp lệ/);
    assert.throws(() => parsePositiveId('2147483648'), /ID không hợp lệ/);
    assert.throws(() => parsePositiveId('9007199254740993'), /ID không hợp lệ/);
    assert.throws(() => parsePositiveId('9'.repeat(400)), /ID không hợp lệ/);
  });

  test('0113 renewable backfill converts valid_to with Asia/Ho_Chi_Minh timezone semantics', () => {
    const sql = readFileSync(
      join(process.cwd(), 'src/tests/../../drizzle/0113_hard_malcolm_colcord.sql'),
      'utf8',
    );
    assert.match(sql, /candidate\."valid_to"\s+AT TIME ZONE 'Asia\/Ho_Chi_Minh'/);
    assert.match(sql, /\(candidate\."valid_to"\s*-\s*make_interval\(days => candidate\."reminder_lead_days"\)\)\s+AT TIME ZONE 'Asia\/Ho_Chi_Minh'/);
  });
});
