import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { TxnType } from '@tingting/shared';
import type { StatementLine } from '@tingting/shared';
import { buildFastStatementHtml } from '../services/statement.service';

/**
 * The Fast 'SỔ CHI TIẾT CÔNG NỢ' print page must replicate the template:
 * company letterhead, navy two-tier header WITH the TK Đ.ỨNG column between
 * DIỄN GIẢI and SỐ PHÁT SINH, opening band with visible zeros above the
 * table, full-width band totals, and the Fast signature texts.
 */

const line = (id: number, overrides: Partial<StatementLine>): StatementLine => ({
  id,
  kind: 'transaction',
  month: '2026-07',
  postedDate: '2026-07-04',
  docDate: '2026-07-04',
  docNo: 'TRP-202607-0001',
  description: 'Doanh thu chuyến',
  counterAccount: null,
  debit: 0,
  credit: 0,
  balance: 0,
  txnType: TxnType.TRIP_REVENUE,
  tripId: id,
  ...overrides,
});

const config = {
  heading: 'SỔ CHI TIẾT CÔNG NỢ',
  entityLabel: 'Khách hàng',
  entityName: 'CÔNG TY CỔ PHẦN VẬN TẢI TEST',
  contactLines: [],
  txnLabels: {},
  ledgerRows: [],
  totalOutstanding: 0,
  agingBuckets: [],
  statementLines: [
    line(1, { description: 'Doanh thu chuyến — Hải Phòng — Hà Nội', debit: 10_000_000, counterAccount: '5111' }),
    line(2, { description: 'Phí chi hộ', debit: 2_000_000, txnType: TxnType.SERVICE_FEE, counterAccount: '5111' }),
    line(3, {
      kind: 'payment', month: '2026-10', postedDate: '2026-10-15', docDate: '2026-10-15', docNo: 'RB1',
      description: 'KH trả 8.000.000 ₫ ngày 15/10/2026 (chuyển khoản)', credit: 8_000_000, txnType: TxnType.PAYMENT_RECEIVED,
      tripId: null, rowCount: 1, counterAccount: '1121',
    }),
  ],
  statementTotals: { openingBalance: 5_000_000, debitTotal: 12_000_000, creditTotal: 8_000_000, closingBalance: 9_000_000 },
  periodSummary: null,
  fast: {
    accountLine: 'TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD (VND)',
    customerCode: '0312345678',
    period: { dateFrom: '2026-07-01', dateTo: '2026-10-31' },
    companyName: 'CÔNG TY TNHH NEPO',
    companyAddress: 'Thôn 1, Xã An Thịnh, Huyện Lập Thạch, Tỉnh Vĩnh Phúc',
  },
};

describe('buildFastStatementHtml — Fast mẫu chuẩn', () => {
  test('letterhead + khối giữa + kỳ dd-mm-yyyy', () => {
    const html = buildFastStatementHtml(config);
    assert.match(html, /<div class="lh-name">CÔNG TY TNHH NEPO<\/div>/);
    assert.match(html, /<div class="lh-addr">Thôn 1, Xã An Thịnh[^<]*<\/div>/);
    assert.match(html, /TÀI KHOẢN: 131111 - PHẢI THU NGẮN HẠN KHÁCH HÀNG: HOẠT ĐỘNG SXKD \(VND\)/);
    assert.match(html, /TỪ NGÀY: 01-07-2026 ĐẾN NGÀY: 31-10-2026/);
  });

  test('header 2 tầng có TK Đ.ỨNG giữa DIỄN GIẢI và SỐ PHÁT SINH, nền 244677', () => {
    const html = buildFastStatementHtml(config);
    assert.match(html, /<th rowspan="2">DIỄN GIẢI<\/th><th rowspan="2">TK Đ\.ỨNG<\/th><th colspan="2">SỐ PHÁT SINH<\/th>/);
    assert.match(html, /background: #244677/);
  });

  test('dòng chứng từ: ngày dd-mm, TK Đ.ỨNG per dòng, không badge/strong', () => {
    const html = buildFastStatementHtml(config);
    assert.match(html, /<td class="c">04-07<\/td>/);
    assert.match(html, /<td class="c">5111<\/td>/);
    assert.match(html, /<td class="c">1121<\/td>/);
    assert.doesNotMatch(html, /<strong>|soke-payment|class="badge"/);
    assert.match(html, /<tr class="z">/); // zebra trên dòng phát sinh lẻ
  });

  test('SỐ DƯ ĐẦU KỲ phía trên bảng, hiện cả số 0; tổng/dư cuối băng đủ cột', () => {
    const html = buildFastStatementHtml(config);
    assert.match(html, /SỐ DƯ ĐẦU KỲ:<\/span>\s*<span class="amt num">5\.000\.000<\/span>\s*<span class="amt num">0<\/span>/);
    assert.match(html, /TỔNG PHÁT SINH:<\/td><td class="num">12\.000\.000<\/td><td class="num">8\.000\.000<\/td>/);
    assert.match(html, /SỐ DƯ CUỐI KỲ:<\/td><td class="num">9\.000\.000<\/td><td class="num">0<\/td>/);
  });

  test('khối ký tên đúng chữ mẫu', () => {
    const html = buildFastStatementHtml(config);
    assert.match(html, /Ngày \.\.\.\.\. tháng \.\.\.\.\. năm \.\.\.\.\.\.\.\.\./);
    assert.match(html, /NGƯỜI LẬP BIỂU<span>\(Ký, họ tên\)<\/span>/);
    assert.match(html, /KẾ TOÁN TRƯỞNG<span>\(Ký, họ tên\)<\/span>/);
  });
});