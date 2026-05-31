/**
 * Cap-table history dedup utility.
 *
 * cap_table_history is a *history* — each row is a snapshot of the
 * ownership distribution at a given `effectiveDate`. Multiple rows can
 * share the same effectiveDate (one per partner). We pick the latest
 * snapshot date that has been reached today, then dedupe to the most
 * recent entry per partner name.
 *
 * Percentages are auto-calculated from contribution amounts — never stored.
 */

interface CapTableEntry {
  partnerName: string;
  effectiveDate: string;
  createdAt: string;
  contributionAmount: string;
}

export interface ActivePartner {
  partnerName: string;
  contributionAmount: number;
  percentage: number;
}

export function getActiveCapTable(
  entries: CapTableEntry[],
): ActivePartner[] {
  const named = entries.filter(c => c.partnerName);
  if (!named.length) return [];

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

  const partners = Array.from(byName.values()).map(c => ({
    partnerName: c.partnerName,
    contributionAmount: parseFloat(c.contributionAmount) || 0,
  }));

  const total = partners.reduce((sum, p) => sum + p.contributionAmount, 0);

  return partners.map(p => ({
    ...p,
    percentage: total > 0 ? Math.round((p.contributionAmount / total) * 10000) / 100 : 0,
  }));
}
