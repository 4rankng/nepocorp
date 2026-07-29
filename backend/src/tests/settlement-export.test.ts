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
