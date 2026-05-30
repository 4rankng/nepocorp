/**
 * Cap-table history dedup utility.
 *
 * cap_table_history is a *history* — each row is a snapshot of the
 * ownership distribution at a given `effectiveDate`. Multiple rows can
 * share the same effectiveDate (one per partner). We pick the latest
 * snapshot date that has been reached today, then dedupe to the most
 * recent entry per partner name.
 */

interface CapTableEntry {
  partnerName: string;
  effectiveDate: string;
  createdAt: string;
  percentage: string;
}

export interface ActivePartner {
  partnerName: string;
  percentage: number;
}

const DEFAULT_PARTNERS: ActivePartner[] = [
  { partnerName: 'Ông Phụng', percentage: 70.45 },
  { partnerName: 'Ông Thương', percentage: 29.55 },
];

export function getActiveCapTable(
  entries: CapTableEntry[],
  fallback = DEFAULT_PARTNERS,
): ActivePartner[] {
  const named = entries.filter(c => c.partnerName);
  if (!named.length) return fallback;

  const today = new Date().toISOString().slice(0, 10);
  const reached = named.filter(c => c.effectiveDate <= today);
  const pool = reached.length > 0 ? reached : named;

  const latestDate = pool.reduce(
    (acc, c) => (c.effectiveDate > acc ? c.effectiveDate : acc),
    pool[0].effectiveDate,
  );
  const snapshot = pool.filter(c => c.effectiveDate === latestDate);

  const byName = new Map<string, CapTableEntry>();
  for (const row of snapshot) {
    const prev = byName.get(row.partnerName);
    if (!prev || new Date(row.createdAt) > new Date(prev.createdAt)) {
      byName.set(row.partnerName, row);
    }
  }

  return Array.from(byName.values()).map(c => ({
    partnerName: c.partnerName,
    percentage: parseFloat(c.percentage) || 0,
  }));
}
