import { describe, it, expect } from 'vitest';
import { buildStatementExportUrl, statementExportFilename } from './statementExport';
import { periodFromLatestActivity } from '../components/debt/PeriodFilter';

describe('buildStatementExportUrl', () => {
  const base = '/ledger/suppliers/10/statement/export';

  it('mirrors the applied period into the query', () => {
    const url = buildStatementExportUrl(base, 'xlsx', { dateFrom: '2026-09-01', dateTo: '2026-09-30' });
    expect(url).toContain('format=xlsx');
    expect(url).toContain('dateFrom=2026-09-01');
    expect(url).toContain('dateTo=2026-09-30');
    expect(url).not.toContain('type=fuel');
  });

  it('flags the fuel variant', () => {
    const url = buildStatementExportUrl(base, 'xlsx', { dateFrom: '2026-09-01', dateTo: '2026-09-30' }, { fuel: true });
    expect(url).toContain('type=fuel');
  });

  it('omits empty range bounds (unscoped export)', () => {
    const url = buildStatementExportUrl(base, 'xlsx', { dateFrom: '', dateTo: '' });
    expect(url).toBe(`${base}?format=xlsx`);
  });
});

describe('statementExportFilename', () => {
  it('slugs diacritics and includes the period', () => {
    expect(statementExportFilename(
      'bang-ke-xang-dau',
      'CÔNG TY TNHH MTV PETROLIMEX HẢI PHÒNG',
      { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
    )).toBe('bang-ke-xang-dau-CONG-TY-TNHH-MTV-PETROLIMEX-HAI-PHONG-2026-09-01_den_2026-09-30.xlsx');
  });

  it('falls back to whole-ledger slug when no range', () => {
    expect(statementExportFilename('sao-ke-kh', 'Khách A')).toBe('sao-ke-kh-Khach-A-toan-bo.xlsx');
  });
});

describe('periodFromLatestActivity', () => {
  it('aligns to the month of the latest ledger entry', () => {
    expect(periodFromLatestActivity('2026-09-28')).toEqual({
      mode: 'month',
      month: 9,
      year: 2026,
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    });
  });

  it('returns null without usable activity', () => {
    expect(periodFromLatestActivity(null)).toBeNull();
    expect(periodFromLatestActivity(undefined)).toBeNull();
    expect(periodFromLatestActivity('garbage')).toBeNull();
  });
});
