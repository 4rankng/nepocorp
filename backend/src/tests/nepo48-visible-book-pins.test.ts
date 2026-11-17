/**
 * NEPO-48 wave 5 — visible-book pins, frozen from the demo DB
 * (card 979, adjudication round 7, build c8576018).
 *
 * src/tests/fixtures/nepo48-visible-fixture.json holds the RAW ledger rows of
 * the two disputed AR books — entity 11 (Thanh Thịnh) and entity 8 (Việt Lộc)
 * — exactly as measured by the orchestrator. Three properties are pinned:
 *
 * 1. The collapse survivors of family TRP-202607-0044: the standing booking
 *    (revenue 1717 + receipt row 1750 + chi-hộ 2150/2151/2171) survives on
 *    its original posting dates; the whole 10/8 unlock/re-post chain stays
 *    hidden (owner decision, wave 4).
 * 2. The visible sums: entity 11 = 289.485.599₫, entity 8 = 410.835.600₫ —
 *    the numbers the detail header shows, and (wave 5) the /debt list's AR
 *    column must show the same: aging over the visible book equals the sum.
 * 3. The receipt-9214 FIFO/netting decision: the ONLY standing payment row of
 *    family 0044 is ledger id 1750, and it carries receiptId '9214' — it IS
 *    receipt 9214's own stored split row, not an independent earlier payment.
 *    Netting it against 0044's invoice BEFORE allocating the receipt's credit
 *    would count the same 28.200.000₫ twice (once closing the invoice, once
 *    still inside the receipt's 90.978.520₫ pool flowing to other trips).
 *    The walk therefore nets family payments the only sound way — invoice
 *    closure: 0044's charges are covered (absent from unpaidTrips) while the
 *    receipt re-attributes 9.592.000₫ into 0044 (= its full visible charge,
 *    adjudication round 7: ĐÚNG) and Σ derived pairs = receipt total.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFifoAging, TxnType } from '@tingting/shared';
import {
  buildCustomerBookContext,
  visibleCustomerBook,
  type EnrichedLedgerRow,
} from '../services/ledger-visibility';
import { reattributePaymentRows } from '../services/statement.service';

interface FixtureRow {
  id: number; txnTable: string | null; txnType: string; txnId: number | null;
  receiptId: string | null; note: string | null; debit: number; credit: number;
  balance: number; entityType: string; entityId: number; ts: string;
}

const fixture: FixtureRow[] = JSON.parse(
  readFileSync(new URL('./fixtures/nepo48-visible-fixture.json', import.meta.url), 'utf8'),
);

// Demo enrichment (adjudication round 7): chi-hộ fee id → owning trip for the
// pinned family. Every other fee's trip is unknown to this fixture — the
// foreign-chi-hộ check passes it through (same as production, where an
// unknown owner resolves undefined → keep). Measured state: ALL fee ids the
// fixture shows are live trip_expenses rows of customer 11 (the wave-3
// docstring's "dead 382/383/384" describes an older demo state; the measured
// header keeps those rows and the measured FIFO maps only 377/378/380 to
// trip 138), so nothing is orphan here.
const FEE_TRIP: Record<number, number> = { 377: 138, 378: 138, 380: 138 };

/** Ledger timestamps are Indochina wall time at UTC-offset 0 (repo display
 * convention: toISOString().slice(0,10) is the posting date). Production
 * reads them from Postgres with a UTC connection, so the fixture strings
 * must parse as UTC — parsing them as local time shifts receipt 9214's day
 * and reorders the voucher-day FIFO. */
function toUtcDate(ts: string): Date {
  return new Date(`${ts.replace(' ', 'T').replace(/(\.\d{3})\d+$/, '$1')}Z`);
}

function toLedgerRow(r: FixtureRow): EnrichedLedgerRow {
  const tripId = r.txnTable === 'trip_expenses'
    ? (FEE_TRIP[r.txnId ?? -1] ?? null)
    : r.txnId;
  return {
    id: r.id,
    timestamp: toUtcDate(r.ts),
    createdAt: toUtcDate(r.ts),
    txnType: r.txnType as EnrichedLedgerRow['txnType'],
    txnId: r.txnId,
    txnTable: r.txnTable,
    receiptId: r.receiptId,
    paymentMethod: null,
    entityType: r.entityType,
    entityId: r.entityId,
    debit: String(r.debit),
    credit: String(r.credit),
    balance: String(r.balance),
    note: r.note,
    tripId,
  };
}

/** Production-shaped context: every fee the fixture shows is live (measured
 * demo state); no trip-ownership rows → foreign check keeps all. */
function bookContext(rows: FixtureRow[]) {
  const fees = rows
    .filter((r) => r.txnTable === 'trip_expenses' && r.txnId != null)
    .map((r) => ({ feeId: r.txnId!, tripId: FEE_TRIP[r.txnId!] ?? -1, customerId: r.entityId }));
  const trips = rows
    .filter((r) => r.txnTable === 'trips' && r.txnType === TxnType.TRIP_REVENUE && r.txnId != null)
    .map((r) => ({ tripId: r.txnId!, customerId: r.entityId }));
  return buildCustomerBookContext(fees, trips);
}

function visibleBookOf(entityId: number): EnrichedLedgerRow[] {
  const rows = fixture.filter((r) => r.entityId === entityId).map(toLedgerRow);
  return visibleCustomerBook(rows, bookContext(fixture.filter((r) => r.entityId === entityId)), entityId);
}

function netOf(rows: EnrichedLedgerRow[]): number {
  return rows.reduce((sum, r) => sum + Number(r.debit ?? 0) - Number(r.credit ?? 0), 0);
}

/** The aging-list AR figure: FIFO total over the visible book, the same
 * LedgerEntry mapping fetchLedgerGrouped's customer-AR branch produces. */
function agingTotalOf(rows: EnrichedLedgerRow[]): number {
  const { aging } = computeFifoAging(rows.map((r) => ({
    timestamp: r.timestamp.toISOString(),
    debit: r.debit ?? '0',
    credit: r.credit ?? '0',
    ref: String(r.id),
  })), new Date());
  return aging.current + aging.d30 + aging.d60 + aging.over90;
}

describe('NEPO-48 wave 5 — visible book pins (demo fixture)', () => {
  test('family TRP-202607-0044 survivors: 1717, 1750, 2150, 2151, 2171', () => {
    const book = visibleBookOf(11);
    const fam = book
      .filter((r) => r.txnId === 138 || (r.txnId != null && FEE_TRIP[r.txnId] === 138))
      .map((r) => r.id)
      .sort((a, b) => a - b);
    assert.deepEqual(fam, [1717, 1750, 2150, 2151, 2171]);
    // The 10/8 re-post chain stays hidden.
    for (const id of [2483, 2486, 2487, 2488, 2489, 2492, 2493, 2494]) {
      assert.ok(!book.some((r) => r.id === id), `reversal-chain row ${id} must stay hidden`);
    }
  });

  test('visible sums: entity 11 = 289.485.599, entity 8 = 410.835.600', () => {
    for (const [entityId, visible, raw] of [
      [11, 289_485_599, 279_889_199],
      [8, 410_835_600, 361_503_600],
    ] as const) {
      const rows = fixture.filter((r) => r.entityId === entityId).map(toLedgerRow);
      assert.equal(netOf(rows), raw, `raw book of entity ${entityId}`);
      assert.equal(netOf(visibleBookOf(entityId)), visible, `visible book of entity ${entityId}`);
      assert.notEqual(raw, visible, 'collapse must have moved the number');
    }
  });

  test('/debt list AR column = header: aging over the visible book equals the visible sum', () => {
    assert.equal(agingTotalOf(visibleBookOf(11)), 289_485_599);
    assert.equal(agingTotalOf(visibleBookOf(8)), 410_835_600);
    // And it is NOT the raw book's figure — the fix is actually exercised.
    assert.equal(agingTotalOf(fixture.filter((r) => r.entityId === 11).map(toLedgerRow)), 279_889_199);
  });
});

describe('NEPO-48 wave 5 — receipt 9214 FIFO/netting decision', () => {
  // The four trips receipt 9214 (18/7) covers, per adjudication round 7, plus
  // the receipt's own stored split rows. Trip 91's charges are NOT in the
  // slice (its stored row 1747 merges into the receipt's pool regardless).
  const SLICE_TRIPS = [102, 125, 138, 139];
  const sliceRows = fixture
    .filter((r) => r.entityId === 11
      && (r.receiptId === '9214'
        || (r.txnTable === 'trips' && r.txnId != null && SLICE_TRIPS.includes(r.txnId))
        || (r.txnTable === 'trip_expenses' && r.txnId != null && SLICE_TRIPS.includes(FEE_TRIP[r.txnId] ?? -1))))
    .map(toLedgerRow);
  // Production order: the walk reads the COLLAPSED book (getStatementData
  // feeds visibleLedgerRows output into both computeFifoAging and
  // reattributePaymentRows) — never the raw rows.
  const slice = visibleCustomerBook(sliceRows, bookContext(fixture.filter((r) => r.entityId === 11)), 11);
  // All four trips departed 17/7 (0044 + 0045 measured; the walk only needs
  // every slice invoice to predate the receipt).
  const departures = new Map(SLICE_TRIPS.map((t) => [t, '2026-07-17']));

  function voucherDayOf(r: EnrichedLedgerRow): string {
    if (r.txnType === TxnType.PAYMENT_RECEIVED) return r.timestamp.toISOString().slice(0, 10);
    const departure = r.tripId != null ? departures.get(r.tripId) : undefined;
    return departure ?? r.timestamp.toISOString().slice(0, 10);
  }

  test('family netting closes 0044: its invoice does not survive into unpaidTrips', () => {
    const { openInvoices } = computeFifoAging(slice.map((r) => ({
      timestamp: `${voucherDayOf(r)}T00:00:00.000Z`,
      debit: r.debit ?? '0',
      credit: r.credit ?? '0',
      ref: String(r.id),
    })), new Date());
    const rev1717 = openInvoices.find((i) => i.ref === '1717');
    assert.ok(rev1717, 'invoice for ledger row 1717 must exist');
    assert.equal(rev1717.open, 0, '0044 revenue invoice must close (trip absent from unpaidTrips)');
  });

  test('9214 re-attributes 9.592.000 into 0044; Σ pairs = receipt total (no double-count)', () => {
    const tripDetails = new Map(SLICE_TRIPS.map((t) => [t, { tripCode: `TRP-slice-${t}`, routeName: null }]));
    const display = reattributePaymentRows(slice, voucherDayOf, tripDetails);
    const receipt = display.filter((r) => r.receiptId === '9214');

    const intoTrip = new Map<number, number>();
    let unallocated = 0;
    for (const r of receipt) {
      if (r.txnId != null) intoTrip.set(r.txnId, (intoTrip.get(r.txnId) ?? 0) + Number(r.credit));
      else unallocated += Number(r.credit);
    }
    assert.equal(intoTrip.get(138), 9_592_000,
      '0044 receives its full visible charge (6.750.000 + 2.842.000 chi-hộ)');
    assert.equal(intoTrip.get(102), 7_728_000, 'each trip closes exactly its own invoice');
    assert.equal(intoTrip.get(125), 7_728_000, 'each trip closes exactly its own invoice');
    assert.equal(intoTrip.get(139), 6_750_000, 'each trip closes exactly its own invoice');
    // Measured full-book unallocated (muse round 7) was 47.486.521 with the
    // chi-hộ of trips 102/125/139 included; their fee→trip ownership is not
    // reconstructable from this ledger-only fixture, so the slice carries
    // revenue-only invoices for them and the surplus grows by exactly those
    // missing invoices (11.693.999).
    const total = [...intoTrip.values()].reduce((a, b) => a + b, 0) + unallocated;
    assert.equal(total, 90_978_520, 'Σ derived pairs = receipt total (no double-count)');
    assert.equal(unallocated, 59_180_520);
  });
});
