import type { FastStatementDetail } from '@tingting/shared';

/**
 * NEPO-47 — 'SỔ CHI TIẾT CÔNG NỢ' đúng mẫu Fast: letterhead công ty (khi có),
 * khối giữa (tiêu đề + dòng tài khoản 131111 + KHÁCH HÀNG (MST) + TỪ/ĐẾN
 * NGÀY), SỐ DƯ ĐẦU KỲ 2 ô Nợ|Có (fill băng, hiển thị cả số 0) nằm ngay trên
 * bảng, bảng STT | CHỨNG TỪ (NGÀY | SỐ) | DIỄN GIẢI | TK Đ.ỨNG | SỐ PHÁT
 * SINH (NỢ | CÓ) với mỗi chứng từ một STT (nhiều dòng nghiệp vụ dưới một
 * STT — cước vận chuyển + chi hộ cùng chuyến; 2 dòng Nợ/Có của cùng phiếu,
 * NGÀY dd-mm), TỔNG PHÁT SINH + SỐ DƯ CUỐI KỲ 2 ô Nợ|Có (fill băng đủ cột),
 * khối ký tên NGƯỜI LẬP BIỂU / KẾ TOÁN TRƯỞNG.
 *
 * KHÔNG cột dư từng dòng (mẫu không có) — số dư chỉ đọc ở đầu kỳ + tổng +
 * cuối kỳ. TK Đ.ỨNG trống khi dòng không có mã cố định.
 *
 * Dữ liệu (`fast`) đi thẳng từ statement API (integer VND, đã cộng dồn đúng
 * ledger) — component này chỉ hiển thị, KHÔNG tính lại tiền. Tiền hiển thị
 * '#,##0' không ₫ (đúng mẫu Fast); số 0 của đầu/cuối kỳ hiện '0', số 0 của
 * dòng phát sinh để trống.
 */

const ACCOUNT_LINE = 'TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD (VND)';

// undefined (đang tải) → ô trống; 0 → '0' (ô dư đầu/cuối luôn hiện số).
const vnd = (v?: number) => (v === undefined ? '' : v.toLocaleString('vi-VN'));
const dm = (iso: string) => (/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}-${iso.slice(5, 7)}` : iso);
const dmy = (iso: string | undefined) => {
  const s = iso ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}` : (s || '……');
};

interface StatementLedgerProps {
  /** Payload Fast từ statement API (opening/vouchers/totals/closing). */
  fast?: FastStatementDetail;
  customerName?: string;
  customerCode?: string | null;
  dateFrom?: string;
  dateTo?: string;
  /** Letterhead (mẫu Fast) — tên + địa chỉ công ty; bỏ prop = ẩn dòng. */
  companyName?: string;
  companyAddress?: string;
  isLoading?: boolean;
}

export function StatementLedger({ fast, customerName, customerCode, dateFrom, dateTo, companyName, companyAddress, isLoading = false }: StatementLedgerProps) {
  const opening = fast?.opening;
  const closing = fast?.closing;
  const vouchers = fast?.vouchers ?? [];
  const hasVouchers = vouchers.length > 0;
  const showFoot = !!fast && hasVouchers;

  return (
    <div className="so-ke" data-testid="statement-ledger">
      {(companyName || companyAddress) && (
        <div className="so-ke-letterhead">
          {companyName && <div className="so-ke-lh-name">{companyName}</div>}
          {companyAddress && <div className="so-ke-lh-addr">{companyAddress}</div>}
        </div>
      )}

      {/* Fast header: tiêu đề + tài khoản + khách hàng + kỳ báo cáo */}
      <div className="so-ke-head">
        <div className="so-ke-title">SỔ CHI TIẾT CÔNG NỢ</div>
        <div>{ACCOUNT_LINE}</div>
        <div>
          KHÁCH HÀNG: {customerName ?? '—'}
          {customerCode ? ` (${customerCode})` : ''}
        </div>
        <div>TỪ NGÀY: {dmy(dateFrom)} ĐẾN NGÀY: {dmy(dateTo)}</div>
      </div>

      <div className="table-scroll">
        <table className="dd-table so-ke-table" aria-label="Sổ chi tiết công nợ">
          <thead>
            {/* Dòng SỐ DƯ ĐẦU KỲ — 4 cột trái trống không viền, label + 2 ô
                Nợ|Có fill băng; hiển thị cả số 0 như mẫu Fast. */}
            <tr className="so-ke-opening" data-testid="so-ke-opening-row">
              <td colSpan={4} />
              <td className="so-ke-band so-ke-band-right">SỐ DƯ ĐẦU KỲ:</td>
              <td className="dd-r so-ke-n so-ke-band">{vnd(opening?.debit)}</td>
              <td className="dd-r so-ke-c so-ke-band">{vnd(opening?.credit)}</td>
            </tr>
            <tr>
              <th rowSpan={2}>STT</th>
              <th colSpan={2}>CHỨNG TỪ</th>
              <th rowSpan={2}>DIỄN GIẢI</th>
              <th rowSpan={2}>TK Đ.ỨNG</th>
              <th colSpan={2}>SỐ PHÁT SINH</th>
            </tr>
            <tr>
              <th>NGÀY</th>
              <th>SỐ</th>
              <th className="dd-r so-ke-n">NỢ</th>
              <th className="dd-r so-ke-c">CÓ</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map(voucher => voucher.lines.map((line, lineIdx) => (
              <tr
                key={`${voucher.stt}-${lineIdx}`}
                data-testid={voucher.kind === 'payment' ? 'so-ke-payment-row' : undefined}
              >
                <td className="so-ke-stt">{lineIdx === 0 ? voucher.stt : ''}</td>
                <td className="so-ke-date">{lineIdx === 0 && voucher.docDate ? dm(voucher.docDate) : ''}</td>
                <td className="so-ke-docno">{lineIdx === 0 ? (voucher.docNo ?? '—') : ''}</td>
                <td className="so-ke-desc">{line.description}</td>
                <td className="so-ke-tk">{line.contraAccount ?? ''}</td>
                <td className="dd-r so-ke-n">{line.debit ? vnd(line.debit) : ''}</td>
                <td className="dd-r so-ke-c">{line.credit ? vnd(line.credit) : ''}</td>
              </tr>
            )))}
            {!hasVouchers && (
              <tr>
                <td colSpan={7} className="dd-table-empty">
                  {isLoading ? 'Đang tải sổ chi tiết…' : 'Không có giao dịch trong kỳ'}
                </td>
              </tr>
            )}
          </tbody>
          {showFoot && fast && (
            <tfoot>
              <tr className="so-ke-total" data-testid="so-ke-total-row">
                <td colSpan={4} className="so-ke-band" />
                <td className="so-ke-band so-ke-band-right">TỔNG PHÁT SINH:</td>
                <td className="dd-r so-ke-n so-ke-band">{vnd(fast.totals.debitTotal)}</td>
                <td className="dd-r so-ke-c so-ke-band">{vnd(fast.totals.creditTotal)}</td>
              </tr>
              <tr className="so-ke-closing" data-testid="so-ke-closing-row">
                <td colSpan={4} className="so-ke-band" />
                <td className="so-ke-band so-ke-band-right">SỐ DƯ CUỐI KỲ:</td>
                <td className="dd-r so-ke-n so-ke-band">{vnd(closing?.debit)}</td>
                <td className="dd-r so-ke-c so-ke-band">{vnd(closing?.credit)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {showFoot && (
        <div className="so-ke-sign" aria-label="Chữ ký">
          <div className="so-ke-sign-date">Ngày ..... tháng ..... năm .........</div>
          <div className="so-ke-sign-row">
            <div>
              NGƯỜI LẬP BIỂU
              <br />
              <span>(Ký, họ tên)</span>
            </div>
            <div>
              KẾ TOÁN TRƯỞNG
              <br />
              <span>(Ký, họ tên)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}