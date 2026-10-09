import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  reconcileFuelRows,
  normalizePlate,
  normalizeReconcileDate,
  toNumber,
} from '../services/fuel-reconcile.service';

/**
 * The supplier's own fuel sheet has no agreed column layout — the real file is
 * sheet "NEPO", 376 rows x 132 columns, organised by vehicle and oil type, and
 * every "T.Tiền" cell reads 0.0 (kanban 081026215250). The operator therefore
 * maps the columns at upload time, and this matcher receives labelled rows.
 *
 * Matching is by (vehicle, day) on the TOTAL liters: a supplier bills per
 * vehicle per day, and one vehicle can draw two oil types that day.
 */
const sys = (licensePlate: string, departureDate: string, liters: number | null, amount: number, tripCode = 'TRP-1') => ({
  licensePlate, departureDate, liters, amount, tripCode,
});

describe('normalizePlate', () => {
  it('treats dashed, spaced and dotted plates as one vehicle', () => {
    assert.equal(normalizePlate('15C-136.31'), '15C13631');
    assert.equal(normalizePlate('15c 136.31'), '15C13631');
    assert.equal(normalizePlate(' 15C13631 '), '15C13631');
  });
});

describe('normalizeReconcileDate', () => {
  it('reads the shapes the sheet mixes', () => {
    assert.equal(normalizeReconcileDate('2026-10-09'), '2026-10-09');
    assert.equal(normalizeReconcileDate('09/10/2026'), '2026-10-09');
    assert.equal(normalizeReconcileDate('9/10/2026'), '2026-10-09');
    assert.equal(normalizeReconcileDate('09-10-2026'), '2026-10-09');
    assert.equal(normalizeReconcileDate('09/10/26'), '2026-10-09');
  });

  it('reads an Excel serial number', () => {
    assert.equal(normalizeReconcileDate('46234'), '2026-07-31');
  });

  it('returns null for an unusable cell rather than guessing', () => {
    assert.equal(normalizeReconcileDate(''), null);
    assert.equal(normalizeReconcileDate('không rõ'), null);
    assert.equal(normalizeReconcileDate('31/02/2026'), null);
  });
});

describe('toNumber', () => {
  it('reads Vietnamese and plain separators', () => {
    assert.equal(toNumber('1.234,56'), 1234.56);
    assert.equal(toNumber('1234.56'), 1234.56);
    assert.equal(toNumber('1.234'), 1234);
    assert.equal(toNumber('225 lít'), 225);
    assert.equal(toNumber(225), 225);
    assert.equal(toNumber(''), null);
  });
});

describe('reconcileFuelRows', () => {
  it('matches a row that agrees on vehicle, day and liters', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-136.31', date: '09/10/2026', liters: 225, amount: 6221250 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    assert.equal(out.rows.length, 1);
    assert.equal(out.rows[0].status, 'MATCHED');
    assert.equal(out.summary.matched, 1);
    assert.equal(out.summary.litersMismatch, 0);
  });

  it('sums two oil types on one day into the total the supplier bills', () => {
    const out = reconcileFuelRows(
      [
        { licensePlate: '15C-136.31', date: '09/10/2026', liters: 100, oilType: 'DO' },
        { licensePlate: '15C-136.31', date: '09/10/2026', liters: 125, oilType: 'Xăng' },
      ],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    assert.equal(out.rows.length, 1);
    assert.equal(out.rows[0].status, 'MATCHED');
    assert.equal(out.rows[0].fileLiters, 225);
    assert.deepEqual(out.rows[0].fileRows, [1, 2]);
  });

  it('flags a liters mismatch and keeps both figures', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-136.31', date: '09/10/2026', liters: 200 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    assert.equal(out.rows[0].status, 'LITERS_MISMATCH');
    assert.equal(out.rows[0].fileLiters, 200);
    assert.equal(out.rows[0].systemLiters, 225);
    assert.match(out.rows[0].note, /Lệch/);
  });

  it('flags an amount mismatch when the liters agree', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-136.31', date: '09/10/2026', liters: 225, amount: 6000000 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    assert.equal(out.rows[0].status, 'AMOUNT_MISMATCH');
    assert.match(out.rows[0].note, /lệch/);
  });

  it('matches when the file has no money column at all (T.Tiền = 0)', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-136.31', date: '09/10/2026', liters: 225, amount: 0 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    assert.equal(out.rows[0].status, 'MATCHED');
    assert.equal(out.rows[0].fileAmount, null);
    assert.match(out.rows[0].note, /không ghi số tiền/);
  });

  it('reports a row only the supplier has', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-999.99', date: '09/10/2026', liters: 100 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    const statuses = out.rows.map((r) => r.status).sort();
    assert.deepEqual(statuses, ['ONLY_IN_FILE', 'ONLY_IN_SYSTEM']);
    assert.equal(out.summary.onlyInFile, 1);
    assert.equal(out.summary.onlyInSystem, 1);
  });

  it('keeps an unreadable row visible instead of dropping it', () => {
    const out = reconcileFuelRows(
      [{ licensePlate: '15C-136.31', date: 'không rõ', liters: 225, sourceRow: 7 }],
      [sys('15C-136.31', '2026-10-09', 225, 6221250)],
    );
    const bad = out.rows.find((r) => r.status === 'UNREADABLE_DATE');
    assert.ok(bad, 'the unreadable row must still be reported');
    assert.deepEqual(bad.fileRows, [7]);
    assert.equal(out.summary.unreadable, 1);
  });

  it('totals both sides for the reconciliation header', () => {
    const out = reconcileFuelRows(
      [
        { licensePlate: '15C-136.31', date: '09/10/2026', liters: 225, amount: 6221250 },
        { licensePlate: '15C-180.99', date: '10/10/2026', liters: 95, amount: 2626750 },
      ],
      [sys('15C-136.31', '2026-10-09', 225, 6221250), sys('15C-180.99', '2026-10-10', 95, 2626750)],
    );
    assert.equal(out.summary.fileTotalLiters, 320);
    assert.equal(out.summary.systemTotalLiters, 320);
    assert.equal(out.summary.fileTotalAmount, 8848000);
    assert.equal(out.summary.systemTotalAmount, 8848000);
    assert.equal(out.summary.matched, 2);
  });
});
