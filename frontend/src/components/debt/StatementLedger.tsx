import { Fragment, useMemo } from 'react';
import { Wallet } from 'lucide-react';
import type { StatementLine, StatementPeriodTotals } from '@tingting/shared';
import { formatCurrency, formatDatePadded } from '../../lib/format';

/**
 * NEPO-46 — 'Sổ chi tiết công nợ' (MISA 'Sổ chi tiết thanh toán với người
 * mua' layout) for a customer statement period:
 *
 *   Dư đầu kỳ · lines grouped by month (ngày ghi sổ | số hiệu | ngày CT |
 *   diễn giải | TK ĐỐI ỨNG — NEPO-47) · THANH TOÁN rows reading 'KH trả
 *   X ₫ ngày dd/mm' as one aggregate document · phát sinh Nợ/Có + dư cuối
 *   cộng dồn per line · tổng kết kỳ footer.
 *
 * Lines and totals come straight from the statement API (integer VND) —
 * this component is display-only; the running balance is never recomputed
 * here, so the screen always matches the ledger's own arithmetic.
 */

const monthLabel = (month: string): string =>
  `Tháng ${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;

interface StatementLedgerProps {
  lines: StatementLine[];
  totals?: StatementPeriodTotals;
  isLoading?: boolean;
}

export function StatementLedger({ lines, totals, isLoading = false }: StatementLedgerProps) {
  const groups = useMemo(() => {
    const out: Array<{ month: string; lines: StatementLine[] }> = [];
    for (const line of lines) {
      const last = out[out.length - 1];
      if (last && last.month === line.month) last.lines.push(line);
      else out.push({ month: line.month, lines: [line] });
    }
    return out;
  }, [lines]);

  const opening = totals?.openingBalance ?? 0;
  const closing = totals?.closingBalance ?? 0;
  const closingNegative = closing < 0;

  return (
    <div className="so-ke" data-testid="statement-ledger">
      <div className="table-scroll">
        <table className="dd-table so-ke-table" aria-label="Sổ chi tiết công nợ">
          <thead>
            <tr>
              <th>NGÀY GHI SỔ</th>
              <th>SỐ HIỆU</th>
              <th>NGÀY CT</th>
              <th>DIỄN GIẢI</th>
              <th className="so-ke-tk">TK ĐỐI ỨNG</th>
              <th className="dd-r so-ke-n">PHÁT SINH NỢ</th>
              <th className="dd-r so-ke-c">PHÁT SINH CÓ</th>
              <th className="dd-r">DƯ CUỐI</th>
            </tr>
          </thead>
          <tbody>
            <tr className="so-ke-opening">
              <td />
              <td />
              <td />
              <td>Dư đầu kỳ</td>
              <td className="so-ke-tk" />
              <td className="dd-r so-ke-n" />
              <td className="dd-r so-ke-c" />
              <td className="dd-r so-ke-bal">{formatCurrency(opening)}</td>
            </tr>
            {groups.map(group => (
              <Fragment key={group.month}>
                <tr className="so-ke-month">
                  <td colSpan={8}>{monthLabel(group.month)}</td>
                </tr>
                {group.lines.map(line => (
                  line.kind === 'payment' ? (
                    <tr key={line.id} className="so-ke-payment" data-testid="so-ke-payment-row">
                      <td className="so-ke-date">{formatDatePadded(line.postedDate)}</td>
                      <td className="so-ke-docno">{line.docNo ?? '—'}</td>
                      <td className="so-ke-date">{formatDatePadded(line.docDate ?? line.postedDate)}</td>
                      <td>
                        <span className="so-ke-badge">Thanh toán</span>
                        <strong>{line.description}</strong>
                      </td>
                      <td className="so-ke-tk">{line.contraAccount ?? '—'}</td>
                      <td className="dd-r so-ke-n">{line.debit ? formatCurrency(line.debit) : ''}</td>
                      <td className="dd-r so-ke-c">{line.credit ? formatCurrency(line.credit) : ''}</td>
                      <td className={`dd-r so-ke-bal${line.balance < 0 ? ' so-ke-bal--advance' : ''}`}>{formatCurrency(line.balance)}</td>
                    </tr>
                  ) : (
                    <tr key={line.id}>
                      <td className="so-ke-date">{formatDatePadded(line.postedDate)}</td>
                      <td className="so-ke-docno">{line.docNo ?? '—'}</td>
                      <td className="so-ke-date">{formatDatePadded(line.docDate ?? line.postedDate)}</td>
                      <td>
                        <span className="so-ke-desc">{line.description}</span>
                        {line.routeName && <span className="so-ke-route">{line.routeName}</span>}
                        {line.containerNumbers && line.containerNumbers.length > 0 && (
                          <span className="so-ke-cont">{line.containerNumbers.join(', ')}</span>
                        )}
                      </td>
                      <td className="so-ke-tk">{line.contraAccount ?? '—'}</td>
                      <td className="dd-r so-ke-n">{line.debit ? formatCurrency(line.debit) : ''}</td>
                      <td className="dd-r so-ke-c">{line.credit ? formatCurrency(line.credit) : ''}</td>
                      <td className={`dd-r so-ke-bal${line.balance < 0 ? ' so-ke-bal--advance' : ''}`}>{formatCurrency(line.balance)}</td>
                    </tr>
                  )
                ))}
              </Fragment>
            ))}
            {groups.length === 0 && (
              <tr>
                <td colSpan={8} className="dd-table-empty">
                  {isLoading ? 'Đang tải sổ chi tiết…' : 'Không có giao dịch trong kỳ'}
                </td>
              </tr>
            )}
          </tbody>
          {totals && groups.length > 0 && (
            <tfoot>
              <tr className="so-ke-total">
                <td colSpan={5}>Tổng phát sinh trong kỳ</td>
                <td className="dd-r so-ke-n">{formatCurrency(totals.debitTotal)}</td>
                <td className="dd-r so-ke-c">{formatCurrency(totals.creditTotal)}</td>
                <td className="dd-r" />
              </tr>
              <tr className="so-ke-closing">
                <td colSpan={5}>
                  {closingNegative ? (
                    <span className="so-ke-advance-label">
                      <Wallet size={14} aria-hidden />
                      Dư cuối kỳ — khách đã trả trước {formatCurrency(Math.abs(closing))}
                    </span>
                  ) : (
                    'Dư cuối kỳ'
                  )}
                </td>
                <td className="dd-r so-ke-n" />
                <td className="dd-r so-ke-c" />
                <td className={`dd-r so-ke-bal${closingNegative ? ' so-ke-bal--advance' : ' so-ke-bal--debt'}`}>{formatCurrency(closing)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
