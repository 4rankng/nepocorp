import { formatCurrency } from '../../lib/format';
import { parseAdvanceBalanceFigures, type AdvanceBalanceFigures } from './advanceBalanceFormula';
import './AdvanceBalanceNote.css';

// The formula types + helpers live in ./advanceBalanceFormula so this module
// exports only the AdvanceBalanceNote component (React Fast Refresh).

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
