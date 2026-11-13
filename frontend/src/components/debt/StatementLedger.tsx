import type { FastStatementDetail } from '@tingting/shared';
import { formatCurrency, formatDatePadded } from '../../lib/format';

/**
 * NEPO-47 — 'SỔ CHI TIẾT CÔNG NỢ' đúng mẫu Fast (thay layout MISA của
 * NEPO-46): tiêu đề + dòng tài khoản 131111 + KHÁCH HÀNG (MST) + TỪ/ĐẾN
 * NGÀY, SỐ DƯ ĐẦU KỲ 2 ô Nợ|Có, bảng STT | CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI
 * | SỐ PHÁT SINH (NỢ | CÓ) với mỗi chứng từ một STT (nhiều dòng nghiệp vụ
 * dưới một STT — cước vận chuyển + chi hộ cùng chuyến; 2 dòng Nợ/Có của
 * cùng phiếu), TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ 2 ô Nợ|Có, khối ký tên
 * NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG + 'Ngày … tháng … năm …'.
 *
 * KHÔNG cột TK ĐỐI ỨNG (khách bỏ), KHÔNG cột dư cuối từng dòng (mẫu không
 * có) — số dư chỉ đọc ở đầu kỳ + tổng + cuối kỳ.
 *
 * Dữ liệu (`fast`) đi thẳng từ statement API (integer VND, đã cộng dồn đúng
 * ledger) — component này chỉ hiển thị, KHÔNG tính lại tiền.
 */

const ACCOUNT_LINE = '131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG';

interface StatementLedgerProps {
  /** Payload Fast từ statement API (opening/vouchers/totals/closing). */
  fast?: FastStatementDetail;
  customerName?: string;
  customerCode?: string | null;
  dateFrom?: string;
  dateTo?: string;
  isLoading?: boolean;
}

export function StatementLedger({ fast, customerName, customerCode, dateFrom, dateTo, isLoading = false }: StatementLedgerProps) {
  const opening = fast?.opening;
  const closing = fast?.closing;
  const vouchers = fast?.vouchers ?? [];
  const hasVouchers = vouchers.length > 0;
  const showFoot = !!fast && hasVouchers;

  return (
    <div className="so-ke" data-testid="statement-ledger">
      {/* Fast header: tiêu đề + tài khoản + khách hàng + kỳ báo cáo */}
      <div className="so-ke-head">
        <div className="so-ke-title">SỔ CHI TIẾT CÔNG NỢ</div>
        <div>{ACCOUNT_LINE}</div>
        <div>
          KHÁCH HÀNG: {customerName ?? '—'}
          {customerCode ? ` (${customerCode})` : ''}
        </div>
        <div>
          TỪ NGÀY {dateFrom ? formatDatePadded(dateFrom) : '……'} ĐẾN NGÀY {dateTo ? formatDatePadded(dateTo) : '……'}
        </div>
      </div>

      <div className="table-scroll">
        <table className="dd-table so-ke-table" aria-label="Sổ chi tiết công nợ">
          <thead>
            <tr>
              <th rowSpan={2} className="so-ke-stt-h">STT</th>
              <th colSpan={2}>CHỨNG TỪ</th>
              <th rowSpan={2}>DIỄN GIẢI</th>
              <th colSpan={2}>SỐ PHÁT SINH</th>
            </tr>
            <tr>
              <th className="so-ke-date-h">NGÀY</th>
              <th>SỐ</th>
              <th className="dd-r so-ke-n">NỢ</th>
              <th className="dd-r so-ke-c">CÓ</th>
            </tr>
          </thead>
          <tbody>
            <tr className="so-ke-opening" data-testid="so-ke-opening-row">
              <td colSpan={4}>SỐ DƯ ĐẦU KỲ</td>
              <td className="dd-r so-ke-n">{opening?.debit ? formatCurrency(opening.debit) : ''}</td>
              <td className="dd-r so-ke-c">{opening?.credit ? formatCurrency(opening.credit) : ''}</td>
            </tr>
            {vouchers.map(voucher => voucher.lines.map((line, lineIdx) => (
              <tr
                key={`${voucher.stt}-${lineIdx}`}
                className={voucher.kind === 'payment' ? 'so-ke-payment' : undefined}
                data-testid={voucher.kind === 'payment' ? 'so-ke-payment-row' : undefined}
              >
                <td className="so-ke-stt">{lineIdx === 0 ? voucher.stt : ''}</td>
                <td className="so-ke-date">{lineIdx === 0 && voucher.docDate ? formatDatePadded(voucher.docDate) : ''}</td>
                <td className="so-ke-docno">{lineIdx === 0 ? (voucher.docNo ?? '—') : ''}</td>
                <td>
                  {voucher.kind === 'payment' ? (
                    <>
                      <span className="so-ke-badge">Thanh toán</span>
                      <strong>{line.description}</strong>
                    </>
                  ) : (
                    <span className="so-ke-desc">{line.description}</span>
                  )}
                </td>
                <td className="dd-r so-ke-n">{line.debit ? formatCurrency(line.debit) : ''}</td>
                <td className="dd-r so-ke-c">{line.credit ? formatCurrency(line.credit) : ''}</td>
              </tr>
            )))}
            {!hasVouchers && (
              <tr>
                <td colSpan={6} className="dd-table-empty">
                  {isLoading ? 'Đang tải sổ chi tiết…' : 'Không có giao dịch trong kỳ'}
                </td>
              </tr>
            )}
          </tbody>
          {showFoot && fast && (
            <tfoot>
              <tr className="so-ke-total">
                <td colSpan={4}>TỔNG PHÁT SINH</td>
                <td className="dd-r so-ke-n">{formatCurrency(fast.totals.debitTotal)}</td>
                <td className="dd-r so-ke-c">{formatCurrency(fast.totals.creditTotal)}</td>
              </tr>
              <tr className="so-ke-closing" data-testid="so-ke-closing-row">
                <td colSpan={4}>SỐ DƯ CUỐI KỲ</td>
                <td className="dd-r so-ke-n so-ke-bal--debt">{closing?.debit ? formatCurrency(closing.debit) : ''}</td>
                <td className="dd-r so-ke-c so-ke-bal--advance">{closing?.credit ? formatCurrency(closing.credit) : ''}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showFoot && (
        <div className="so-ke-sign" aria-label="Chữ ký">
          <div className="so-ke-sign-date">Ngày …… tháng …… năm ……</div>
          <div className="so-ke-sign-row">
            <div>
              NGƯỜI LẬP BIỂU
              <br />
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
            <div>
              KẾ TOÁN TRƯỞNG
              <br />
              <span>(Ký, ghi rõ họ tên)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
