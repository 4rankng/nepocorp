import { describe, it, expect } from 'vitest';
import { groupRecentAuditEntries } from './audit-helpers';

function entry(id: number, timestamp: string, overrides: Partial<{ userName: string; action: string; message: string }> = {}) {
  return { id, timestamp, userName: 'Quản trị viên Nguyễn Viết Dũng', action: 'ENTITY_UPDATED', message: 'đã cập nhật thông tin lệnh vận chuyển TRP-202610-0068', ...overrides };
}

const HOUR = 60 * 60 * 1000;

describe('groupRecentAuditEntries (NEPO-15)', () => {
  it('collapses same actor+action+object repeats inside the window, keeping the latest timestamp', () => {
    const t0 = '2026-10-24T04:00:00Z';
    const t1 = new Date(Date.parse(t0) - 3 * HOUR).toISOString();
    const grouped = groupRecentAuditEntries([entry(2, t0), entry(1, t1)]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].count).toBe(2);
    expect(Date.parse(grouped[0].timestamp)).toBe(Date.parse(t0));
    expect(grouped[0].id).toBe(2);
  });

  it('keeps the same event beyond the collapse window as separate rows', () => {
    const t0 = '2026-10-24T04:00:00Z';
    const t1 = new Date(Date.parse(t0) - 30 * HOUR).toISOString();
    expect(groupRecentAuditEntries([entry(2, t0), entry(1, t1)])).toHaveLength(2);
  });

  it('does not merge across different actors, actions or objects', () => {
    const t0 = '2026-10-24T04:00:00Z';
    const t1 = new Date(Date.parse(t0) - HOUR).toISOString();
    const rows = groupRecentAuditEntries([
      entry(3, t0),
      entry(2, t1, { userName: 'Kế toán Phạm Ngọc Ánh' }),
      entry(1, t1, { action: 'USER_LOGIN', message: 'đã đăng nhập vào hệ thống' }),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.count === 1)).toBe(true);
  });

  it('merges into the newest group even when the feed is oldest-first', () => {
    const t0 = '2026-10-24T04:00:00Z';
    const t1 = new Date(Date.parse(t0) - 2 * HOUR).toISOString();
    const grouped = groupRecentAuditEntries([entry(1, t1), entry(2, t0)]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].count).toBe(2);
    expect(Date.parse(grouped[0].timestamp)).toBe(Date.parse(t0));
  });

  it('passes a single-row feed through untouched', () => {
    const rows = [entry(1, '2026-10-24T04:00:00Z')];
    const grouped = groupRecentAuditEntries(rows);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].count).toBe(1);
  });
});
