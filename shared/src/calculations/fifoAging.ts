export interface FifoAgingInput {
  timestamp: string | null;
  debit: string | number;
  credit: string | number;
  /**
   * Optional label carried onto the open invoice this entry produces. The
   * payables aging tags every entry with its transaction type so a category
   * view can sum exactly the debits that are STILL OPEN after FIFO allocation,
   * instead of every debit of that type regardless of what paid it
   * (kanban 101026203120).
   */
  ref?: string;
}

export interface AgingBuckets {
  current: number;
  d30: number;
  d60: number;
  over90: number;
}

export interface OpenInvoice {
  ts: string;
  open: number;
  /** The `ref` of the entry this invoice came from, when the caller supplied one. */
  ref?: string;
}

/**
 * Bucket still-open invoices by age. Each bucket addition is rounded so sums
 * stay stable across hundreds of entries.
 *
 * Shared with the per-transaction-type projections in the payables aging: one
 * definition of "which bucket is this invoice in" for every caller.
 */
export function bucketOpenInvoices(
  invoices: readonly OpenInvoice[],
  referenceDate: Date = new Date(),
): AgingBuckets {
  const aging: AgingBuckets = { current: 0, d30: 0, d60: 0, over90: 0 };

  for (const inv of invoices) {
    if (inv.open <= 0) continue;
    const ageDays = (referenceDate.getTime() - new Date(inv.ts).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) aging.current += Math.round(inv.open);
    else if (ageDays <= 60) aging.d30 += Math.round(inv.open);
    else if (ageDays <= 90) aging.d60 += Math.round(inv.open);
    else aging.over90 += Math.round(inv.open);
  }

  return aging;
}

/** Whole days since the OLDEST still-open invoice; 0 when nothing is open. */
export function maxOpenInvoiceAgeDays(
  invoices: readonly OpenInvoice[],
  referenceDate: Date = new Date(),
): number {
  let max = 0;
  for (const inv of invoices) {
    if (inv.open <= 0) continue;
    const ageDays = Math.floor((referenceDate.getTime() - new Date(inv.ts).getTime()) / 86400000);
    if (ageDays > max) max = ageDays;
  }
  return max;
}

export function computeFifoAging(
  entries: FifoAgingInput[],
  referenceDate: Date = new Date(),
): { aging: AgingBuckets; openInvoices: OpenInvoice[] } {
  const chronological = [...entries].sort((a, b) => {
    const at = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const bt = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return at - bt;
  });

  const openInvoices: OpenInvoice[] = [];
  let unappliedCredit = 0;

  for (const entry of chronological) {
    const debit = typeof entry.debit === 'number' ? entry.debit : parseFloat(entry.debit || '0');
    const credit = typeof entry.credit === 'number' ? entry.credit : parseFloat(entry.credit || '0');

    // Previously a missing timestamp dropped the debit on the floor —
    // it still showed up in the running balance but never made it into
    // an aging bucket, so totals didn't reconcile. Fall back to "now"
    // (the reference date) so the debt lands in the current bucket and
    // sum-of-buckets matches total outstanding.
    if (debit > 0) {
      let debitRemaining = debit;
      if (unappliedCredit > 0) {
        const apply = Math.min(unappliedCredit, debitRemaining);
        unappliedCredit -= apply;
        debitRemaining -= apply;
      }
      if (debitRemaining > 0) {
        const ts = entry.timestamp ?? referenceDate.toISOString();
        openInvoices.push(entry.ref === undefined
          ? { ts, open: debitRemaining }
          : { ts, open: debitRemaining, ref: entry.ref });
      }
    }

    if (credit > 0) {
      let remaining = credit;
      for (const inv of openInvoices) {
        if (remaining <= 0) break;
        if (inv.open <= 0) continue;
        const apply = Math.min(inv.open, remaining);
        inv.open -= apply;
        remaining -= apply;
      }
      if (remaining > 0) {
        unappliedCredit += remaining;
      }
    }
  }

  return { aging: bucketOpenInvoices(openInvoices, referenceDate), openInvoices };
}
