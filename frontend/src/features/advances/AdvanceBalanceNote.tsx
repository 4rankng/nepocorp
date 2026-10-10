import { formatCurrency } from '../../lib/format';
import './AdvanceBalanceNote.css';

/**
 * The three sides of the TỒN TẠM ỨNG formula, as `/advance-balances` sends them
 * (money as strings).
 */
export interface AdvanceBalanceFigures {
  totalOutstanding?: string | number | null;
  approvedTotal?: string | number | null;
  settledTotal?: string | number | null;
}

export interface ParsedAdvanceBalance {
  /** Σ APPROVED advance requests. */
  approved: number;
  /** Σ APPROVED requests already linked to an APPROVED settlement. */
  settled: number;
  /** approved − settled, as the API reports it. */
  total: number;
}

/**
 * Parse the formula's sides, or null when the payload does not carry them.
 *
 * The components are optional on purpose: a stale module graph or a mocked hook
 * can hand the page only `totalOutstanding` + `items` (both admin advance pages
 * have a test that mounts them with exactly that payload), and the note must
 * then render nothing instead of "NaN ₫".
 */
export function parseAdvanceBalanceFigures(
  figures?: AdvanceBalanceFigures | null,
): ParsedAdvanceBalance | null {
  if (!figures || figures.approvedTotal == null || figures.settledTotal == null) return null;
  const approved = Number(figures.approvedTotal);
  const settled = Number(figures.settledTotal);
  const total = figures.totalOutstanding == null ? approved - settled : Number(figures.totalOutstanding);
  if (!Number.isFinite(approved) || !Number.isFinite(settled) || !Number.isFinite(total)) return null;
  return { approved, settled, total };
}

/** "991.606.600 ₫ − 782.274.800 ₫ = 209.331.800 ₫" */
export function advanceBalanceFormula(figures?: AdvanceBalanceFigures | null): string | null {
  const parsed = parseAdvanceBalanceFigures(figures);
  if (!parsed) return null;
  return `${formatCurrency(parsed.approved)} − ${formatCurrency(parsed.settled)} = ${formatCurrency(parsed.total)}`;
}

/**
 * Publishes TỒN TẠM ỨNG as an auditable subtraction instead of a bare total.
 *
 * The balance is loaded on two admin surfaces (`/advances` and
 * `/advance-settlements`) and the reporter could not reproduce it from the
 * screens: the agreed formula — approved requests minus the requests already
 * written into an APPROVED settlement — existed only in a code comment, so the
 * number read as wrong (kanban 101026203110). Both surfaces render this note,
 * fed by `/advance-balances`, so the accountant can do the same subtraction on
 * screen.
 */
export function AdvanceBalanceNote({ figures }: { figures?: AdvanceBalanceFigures | null }) {
  const parsed = parseAdvanceBalanceFigures(figures);
  if (!parsed) return null;

  return (
    <p className="adv-balance-note">
      Tồn tạm ứng (tất cả các tháng) = tạm ứng đã duyệt <b>{formatCurrency(parsed.approved)}</b>
      {' − '}tạm ứng đã vào phiếu hoàn ứng đã duyệt <b>{formatCurrency(parsed.settled)}</b>
      {' = '}<b>{formatCurrency(parsed.total)}</b>. Phiếu hoàn ứng chưa duyệt không trừ vào tồn.
    </p>
  );
}
