import assert from 'node:assert/strict';
import { test } from 'node:test';
import { settlementApprovalNotificationMessage } from '../services/advance.service';
import { renderSettlementHtml } from '../services/settlement-export.service';

test('settlement HTML shows a company reimbursement as a balanced cash direction', () => {
  const html = renderSettlementHtml({
    id: 1,
    code: 'PT-TEST',
    createdAt: '2026-07-29T00:00:00.000Z',
    forwarderName: 'Nguyễn Văn A',
    refundAmount: 0,
    reimbursementAmount: 5_513_200,
    note: null,
    linkedRequests: [{
      amount: 50_000_000,
      reason: 'Tạm ứng chi phí',
      createdAt: '2026-07-01T00:00:00.000Z',
    }],
    linkedExpenses: [{
      id: 1,
      tripId: 1,
      expenseType: 'LIFTING',
      amount: 55_513_200,
      containerNumber: 'CONT0001',
      invoiceNumber: null,
      note: null,
      createdAt: '2026-07-02T00:00:00.000Z',
    }],
  });

  assert.match(html, /Công ty hoàn thêm:/);
  assert.match(html, /5\.513\.200/);
  assert.match(html, /Đã cân đối:/);
  assert.match(html, />0 ₫</);
});

test('settlement approval notification reports the reimbursement direction, not total expenses', () => {
  const message = settlementApprovalNotificationMessage({
    code: 'PT-TEST',
    totalExpenseAmount: '55513200',
    refundAmount: '0',
    reimbursementAmount: '5513200',
  }, 0);

  assert.match(message, /Công ty hoàn thêm 5\.513\.200 ₫/);
  assert.match(message, /tổng chi phí 55\.513\.200 ₫/);
});

test('settlement surplus is labelled as the next Ops advance, not a company refund', () => {
  const html = renderSettlementHtml({
    id: 2,
    code: 'PT-CARRY',
    createdAt: '2026-08-01T00:00:00.000Z',
    forwarderName: 'Nguyễn Văn A',
    refundAmount: 3_237_400,
    reimbursementAmount: 0,
    note: null,
    linkedRequests: [{ amount: 41_457_000, reason: 'Tạm ứng', createdAt: '2026-08-01T00:00:00.000Z' }],
    linkedExpenses: [{
      id: 2,
      tripId: 2,
      expenseType: 'CUSTOMS',
      amount: 38_219_600,
      containerNumber: 'CONT0002',
      invoiceNumber: null,
      note: null,
      createdAt: '2026-08-02T00:00:00.000Z',
    }],
  });
  const message = settlementApprovalNotificationMessage({
    code: 'PT-CARRY',
    totalExpenseAmount: '38219600',
    refundAmount: '3237400',
    reimbursementAmount: '0',
  }, 0);

  assert.match(html, /Ops tạm ứng chuyển kỳ sau:/);
  assert.doesNotMatch(html, /phải hoàn/);
  assert.match(message, /Ops tạm ứng chuyển kỳ sau 3\.237\.400 ₫/);
});
