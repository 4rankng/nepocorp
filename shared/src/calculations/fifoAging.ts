export interface FifoAgingInput {
  timestamp: string | null;
  debit: string | number;
  credit: string | number;
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

    if (debit > 0 && entry.timestamp) {
      let debitRemaining = debit;
      if (unappliedCredit > 0) {
        const apply = Math.min(unappliedCredit, debitRemaining);
        unappliedCredit -= apply;
        debitRemaining -= apply;
      }
      if (debitRemaining > 0) {
        openInvoices.push({ ts: entry.timestamp, open: debitRemaining });
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

  const aging: AgingBuckets = { current: 0, d30: 0, d60: 0, over90: 0 };

  for (const inv of openInvoices) {
    if (inv.open <= 0) continue;
    const ageDays = (referenceDate.getTime() - new Date(inv.ts).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays <= 30) aging.current += inv.open;
    else if (ageDays <= 60) aging.d30 += inv.open;
    else if (ageDays <= 90) aging.d60 += inv.open;
    else aging.over90 += inv.open;
  }

  return { aging, openInvoices };
}
