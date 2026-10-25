import { describe, expect, it } from 'vitest';
import type { DashboardDecisionItem } from '@tingting/shared';
import type { ApprovalQueueItem } from '../hooks/useApprovalQueue';
import { mergeAttentionRows } from './attentionRows';

const decision = (over: Partial<DashboardDecisionItem>): DashboardDecisionItem => ({
  id: 'd',
  kind: 'receivables',
  severity: 'warning',
  title: 't',
  subtitle: 's',
  actionLabel: 'Mở',
  route: '/debt',
  priority: 50,
  ...over,
});

const approval = (over: Partial<ApprovalQueueItem>): ApprovalQueueItem => ({
  id: 'advances:1',
  type: 'advances',
  title: 'Tạm ứng',
  subtitle: 'Nguyễn Si Quân',
  amount: 20_000_000,
  requestedAt: '2026-10-20T00:00:00Z',
  href: '/forwarder/advances/1',
  severity: 'normal',
  ...over,
});

describe('mergeAttentionRows (NEPO-25 rail)', () => {
  it('sorts by severity band first: critical decisions and urgent approvals above the rest', () => {
    const rows = mergeAttentionRows(
      [
        decision({ id: 'info-1', severity: 'info' }),
        decision({ id: 'crit-1', severity: 'critical' }),
        decision({ id: 'warn-1', severity: 'warning' }),
      ],
      [approval({ id: 'advances:urgent', severity: 'urgent' })],
    );
    expect(rows.map((r) => r.key)).toEqual([
      'decision:crit-1',
      'approval:advances:urgent',
      'decision:warn-1',
      'decision:info-1',
    ]);
  });

  it('inside a band, decisions order by priority, approvals oldest-pending first', () => {
    const rows = mergeAttentionRows(
      [
        decision({ id: 'low', severity: 'warning', priority: 10 }),
        decision({ id: 'high', severity: 'warning', priority: 90 }),
      ],
      [
        approval({ id: 'advances:new', requestedAt: '2026-10-24T00:00:00Z' }),
        approval({ id: 'advances:old', requestedAt: '2026-10-08T00:00:00Z' }),
        approval({ id: 'fees:old', type: 'ancillaryFees', requestedAt: '2026-10-01T00:00:00Z' }),
      ],
    );
    expect(rows.map((r) => r.key)).toEqual([
      'decision:high',
      'decision:low',
      'approval:fees:old',
      'approval:advances:old',
      'approval:advances:new',
    ]);
  });

  it('keeps the all-clear success row last', () => {
    const rows = mergeAttentionRows(
      [
        decision({ id: 'ok', severity: 'success' }),
        decision({ id: 'warn', severity: 'warning' }),
      ],
      [],
    );
    expect(rows[rows.length - 1].key).toBe('decision:ok');
  });

  it('gộp: approval rows count as "Duyệt" items and survive a decisions-only-free page', () => {
    const rows = mergeAttentionRows([], [approval({})]);
    expect(rows).toHaveLength(1);
    expect(rows[0].source).toBe('approval');
    expect(rows[0].rank).toBe(2);
  });
});
