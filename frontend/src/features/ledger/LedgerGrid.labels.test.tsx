import { describe, expect, it } from 'vitest';
import source from './LedgerGrid.tsx?raw';

/**
 * NEPO-3 — pin the user-facing copy rendered inside the Bảng số liệu
 * grid. The grid itself needs live query/auth providers to mount, so these
 * assertions pin the exact JSX literals at the source (the strings ARE the
 * rendered output — static caption + aria-label, no interpolation).
 */

describe('LedgerGrid surface labels (NEPO-3)', () => {
  it('toolbar aria-label uses the new screen name', () => {
    expect(source).toContain('aria-label="Bộ lọc bảng số liệu"');
    expect(source).not.toContain('Bộ lọc bảng kế hoạch');
  });

  it('table caption reads "Kế hoạch vận chuyển — bảng thu chi…"', () => {
    expect(source).toContain('<caption>Kế hoạch vận chuyển — bảng thu chi');
    expect(source).not.toContain('<caption>Sổ chuyến đi');
  });

  it('carries no stale "Bảng kế hoạch" copy', () => {
    expect(source).not.toContain('Bảng kế hoạch');
  });
});
