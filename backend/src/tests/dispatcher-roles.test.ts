/**
 * NEPO-63 phân quyền — DISPATCHER (điều xe) casbin gates + the audit trail of
 * admin-only debit-note edits.
 *
 * Pins:
 *  - DISPATCHER reads/writes trips + reads shipments/lô, but NEVER reaches
 *    financial or audit_logs resources.
 *  - Ops biển (FORWARDER) keeps shipments write; ACCOUNTANT keeps read-only lô
 *    (kế toán owns Báo nợ, not the lô) per the landed policy contract.
 *  - PUT /api/finance/billing-documents/:id resolves to the dedicated
 *    DEBIT_NOTE_UPDATED audit event (sửa Báo nợ đã phát hành phải có log).
 *
 * The casbin enforcer reads policy.csv at init — no DB needed.
 */
import assert from 'node:assert/strict';
// Importing the routers populates the audit registry at module load —
// the same registrations the running server uses.
import '../routes/financial';
import '../routes/trips';
import { initEnforcer, getEnforcer } from '../casbin/enforcer';
import { resolveAuditEvent } from '../services/audit-registry';
import { renderAuditMessage } from '../services/audit-templates';
import type { AuditPayload } from '../services/audit-types';
import { describe, test } from './payment-ledger-test-utils';

describe('dispatcher role gates', () => {
  test('policy: điều xe làm việc trên chuyến, không chạm tiền', async () => {
    await initEnforcer();
    const enforcer = getEnforcer();

    assert.equal(await enforcer.enforce('DISPATCHER', 'trips', 'read'), true);
    assert.equal(await enforcer.enforce('DISPATCHER', 'trips', 'write'), true);
    assert.equal(await enforcer.enforce('DISPATCHER', 'shipments', 'read'), true, 'điều xe đọc lô để gắn chuyến');
    assert.equal(await enforcer.enforce('DISPATCHER', 'financial', 'read'), false, 'tiền không thuộc điều xe');
    assert.equal(await enforcer.enforce('DISPATCHER', 'financial', 'write'), false);
    assert.equal(await enforcer.enforce('DISPATCHER', 'audit_logs', 'read'), false);
    assert.equal(await enforcer.enforce('DISPATCHER', 'salary', 'read'), false);

    // Ops biển = FORWARDER: tạo/sửa lô biển (không có delete endpoint nhưng policy giữ delete).
    assert.equal(await enforcer.enforce('FORWARDER', 'shipments', 'write'), true);
    assert.equal(await enforcer.enforce('FORWARDER', 'financial', 'write'), false);

    // Kế toán: tạo Báo nợ (financial write) nhưng KHÔNG sửa lô (policy landed contract).
    assert.equal(await enforcer.enforce('ACCOUNTANT', 'financial', 'write'), true);
    assert.equal(await enforcer.enforce('ACCOUNTANT', 'shipments', 'write'), false);
    assert.equal(await enforcer.enforce('ACCOUNTANT', 'shipments', 'read'), true);

    // Admin wildcard giữ nguyên.
    assert.equal(await enforcer.enforce('ADMIN', 'anything', 'write'), true);
  });
});

describe('debit-note edit audit trail', () => {
  test('PUT billing-documents/:id resolves to the dedicated debit-note event', () => {
    assert.equal(
      resolveAuditEvent('PUT', '/api/finance/billing-documents/12'),
      'DEBIT_NOTE_UPDATED',
    );
    // Other methods on the same surface keep their generic events.
    assert.equal(resolveAuditEvent('POST', '/api/finance/billing-documents'), 'ENTITY_CREATED');
    assert.equal(resolveAuditEvent('PUT', '/api/trips/9/pre-departure'), 'TRIP_UPDATED_PRE_DEPARTURE');
  });

  test('the audit sentence names the issued note and the ledger adjustment', () => {
    const payload: AuditPayload = {
      event: 'DEBIT_NOTE_UPDATED',
      entityType: 'billing_documents',
      entityId: 12,
      entityKey: 'DN2026110007',
      actorRole: 'ADMIN',
      actorName: 'Minh Admin',
    };
    const message = renderAuditMessage(payload);
    assert.match(message, /Minh Admin/);
    assert.match(message, /DN2026110007/);
    assert.match(message, /Giấy báo nợ/);
    assert.match(message, /bút toán/);
  });
});
