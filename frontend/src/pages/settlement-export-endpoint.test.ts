import { describe, expect, it } from 'vitest';
import { settlementExportEndpoint } from './settlement-export-endpoint';

describe('settlementExportEndpoint', () => {
  it('uses the forwarder GET export route for portal users', () => {
    expect(settlementExportEndpoint(true, 7, 'html'))
      .toBe('/forwarder/me/advance-settlements/7/export?format=html');
    expect(settlementExportEndpoint(true, 7, 'xlsx'))
      .toBe('/forwarder/me/advance-settlements/7/export');
  });

  it('uses the finance GET export route for office users', () => {
    // Mounted at the /api root — a '/finance' prefix returns 404 (kanban 20260921_19).
    expect(settlementExportEndpoint(false, 7, 'html'))
      .toBe('/advance-settlements/7/export?format=html');
    expect(settlementExportEndpoint(false, 7, 'xlsx'))
      .toBe('/advance-settlements/7/export');
  });
});
