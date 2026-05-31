import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';
import { TxnType, computeFifoAging } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';
import { ApiError } from '../errors';

export interface CustomerStatementData {
  customer: { id: number; name: string; contactInfo: string | null };
  ledgerRows: any[];
  totalOutstanding: number;
  unpaidTrips: Array<{ tripId: number; date: string; outstanding: number; note: string }>;
  agingBuckets: Array<{ range: string; amount: number }>;
}

export interface SupplierStatementData {
  supplier: { id: number; name: string; phone: string | null; contactPerson: string | null };
  ledgerRows: any[];
  totalOutstanding: number;
  agingBuckets: Array<{ range: string; amount: number }>;
}

interface StatementExportConfig {
  heading: string;
  sheetName?: string;
  entityLabel: string;
  entityName: string;
  contactLines: string[];
  txnLabels: Record<string, string>;
  ledgerRows: any[];
  totalOutstanding: number;
  agingBuckets: Array<{ range: string; amount: number }>;
}

export function formatLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ỹ ]/g, '').replace(/\s+/g, '-');
}

const TXN_LABELS: Record<string, string> = {
  TRIP_REVENUE: 'Doanh thu chuyến',
  PAYMENT_RECEIVED: 'Thu tiền',
  PENALTY: 'Phạt',
  MANAGEMENT_FEE: 'Phí quản lý',
  ADJUSTMENT: 'Điều chỉnh',
  DRIVER_SALARY: 'Lương tài xế',
};

const VENDOR_TXN_LABELS: Record<string, string> = {
  VENDOR_EXPENSE: 'Ghi nhận chi phí',
  VENDOR_PAYMENT: 'Thanh toán công nợ',
  ADJUSTMENT: 'Điều chỉnh',
};

const SHARED_CSS = `body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 900px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  .total { font-size: 16px; font-weight: 700; color: #111827; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12.5px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .aging { width: auto; margin-top: 8px; }
  .aging td { padding: 4px 12px 4px 0; }
  @media print { body { margin: 0; } }`;

export async function getStatementData(customerId: number): Promise<CustomerStatementData | null> {
  const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, customerId)).limit(1);
  if (!customer) return null;

  const ledgerRows = await LedgerService.getEntriesByEntity('CUSTOMER', customerId);

  const now = new Date();
  const { aging, openInvoices } = computeFifoAging(
    ledgerRows.map((r: any) => ({
      timestamp: r.timestamp,
      debit: r.debit ?? '0',
      credit: r.credit ?? '0',
    })),
    now,
  );

  const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

  const revenueEntries = ledgerRows.filter((r: any) => r.txnType === TxnType.TRIP_REVENUE);
  const tripNotes = new Map<number, string>();
  for (const entry of revenueEntries) {
    if (entry.txnId && !tripNotes.has(entry.txnId)) {
      tripNotes.set(entry.txnId, entry.note || '');
    }
  }

  const tsToTripId = new Map<string, number>();
  for (const entry of revenueEntries) {
    if (entry.txnId && entry.timestamp) {
      tsToTripId.set(new Date(entry.timestamp).toISOString(), entry.txnId);
    }
  }

  const tripOutstanding = new Map<number, { tripId: number; date: string; outstanding: number; note: string }>();
  for (const inv of openInvoices) {
    if (inv.open <= 0) continue;
    const tsRaw: unknown = inv.ts;
    if (tsRaw == null) continue;
    const tsKey = tsRaw instanceof Date ? tsRaw.toISOString() : String(tsRaw);
    const tripId = tsToTripId.get(tsKey) ?? 0;
    if (!tripId) continue;
    const existing = tripOutstanding.get(tripId);
    if (existing) {
      existing.outstanding += inv.open;
    } else {
      tripOutstanding.set(tripId, {
        tripId,
        date: tsKey.slice(0, 10),
        outstanding: inv.open,
        note: tripNotes.get(tripId) || '',
      });
    }
  }

  const unpaidTrips = Array.from(tripOutstanding.values())
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    customer: { id: customer.id, name: customer.name, contactInfo: customer.contactInfo },
    ledgerRows,
    totalOutstanding,
    unpaidTrips,
    agingBuckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
  };
}

export async function exportStatementXlsx(data: CustomerStatementData, dateStr: string, writable: import('stream').Writable): Promise<void> {
  return buildStatementXlsx({
    heading: 'Sao kê công nợ',
    sheetName: 'Sao kê công nợ',
    entityLabel: 'Khách hàng',
    entityName: data.customer.name,
    contactLines: [`Liên hệ: ${data.customer.contactInfo || '—'}`],
    txnLabels: TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr, writable);
}

export function exportStatementHtml(data: CustomerStatementData, dateStr: string): string {
  return buildStatementHtml({
    heading: 'Sao kê công nợ',
    entityLabel: 'Khách hàng',
    entityName: data.customer.name,
    contactLines: [`Liên hệ: ${data.customer.contactInfo || '—'}`],
    txnLabels: TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr);
}

export async function getSupplierStatement(supplierId: number): Promise<SupplierStatementData> {
  const [supplier] = await db.select({
    id: s.suppliers.id,
    name: s.suppliers.name,
    phone: s.suppliers.phone,
    contactPerson: s.suppliers.contactPerson,
  }).from(s.suppliers).where(eq(s.suppliers.id, supplierId)).limit(1);

  if (!supplier) throw new ApiError(404, 'Không tìm thấy nhà cung cấp');

  const ledgerRows = await LedgerService.getEntriesByEntity('VENDOR', supplierId);

  const now = new Date();
  const { aging } = computeFifoAging(
    ledgerRows.map((r: any) => ({
      timestamp: r.timestamp,
      debit: r.credit ?? '0',
      credit: r.debit ?? '0',
    })),
    now,
  );

  const totalOutstanding = aging.current + aging.d30 + aging.d60 + aging.over90;

  return {
    supplier,
    ledgerRows,
    totalOutstanding,
    agingBuckets: [
      { range: '0-30 ngày', amount: aging.current },
      { range: '31-60 ngày', amount: aging.d30 },
      { range: '61-90 ngày', amount: aging.d60 },
      { range: 'Trên 90 ngày', amount: aging.over90 },
    ],
  };
}

export async function exportSupplierStatementXlsx(
  data: SupplierStatementData,
  dateStr: string,
  writable: import('stream').Writable,
): Promise<void> {
  return buildStatementXlsx({
    heading: 'Sao kê công nợ nhà cung cấp',
    sheetName: 'Sao kê công nợ NCC',
    entityLabel: 'Nhà cung cấp',
    entityName: data.supplier.name,
    contactLines: [
      `Liên hệ: ${data.supplier.phone || '—'}`,
      `Người liên hệ: ${data.supplier.contactPerson || '—'}`,
    ],
    txnLabels: VENDOR_TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr, writable);
}

export function exportSupplierStatementHtml(
  data: SupplierStatementData,
  dateStr: string,
): string {
  return buildStatementHtml({
    heading: 'Sao kê công nợ nhà cung cấp',
    entityLabel: 'Nhà cung cấp',
    entityName: data.supplier.name,
    contactLines: [
      `Liên hệ: ${data.supplier.phone || '—'}`,
      `Người liên hệ: ${data.supplier.contactPerson || '—'}`,
    ],
    txnLabels: VENDOR_TXN_LABELS,
    ledgerRows: data.ledgerRows,
    totalOutstanding: data.totalOutstanding,
    agingBuckets: data.agingBuckets,
  }, dateStr);
}

async function buildStatementXlsx(config: StatementExportConfig, dateStr: string, writable: import('stream').Writable): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(config.sheetName);

  const numContacts = config.contactLines.length;

  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `NEPO Logistics — ${config.heading}: ${config.entityName}`;
  titleCell.font = { size: 14, bold: true };

  config.contactLines.forEach((line, i) => {
    sheet.getCell(`A${2 + i}`).value = line;
  });

  const dateRow = 2 + numContacts;
  const totalRow = dateRow + 1;
  const agingLabelRow = totalRow + 2;
  const agingStartRow = agingLabelRow + 1;
  const headerRow = agingStartRow + 5;

  sheet.getCell(`A${dateRow}`).value = `Ngày xuất: ${dateStr}`;
  sheet.getCell(`A${totalRow}`).value = `Tổng nợ: ${config.totalOutstanding.toLocaleString('vi-VN')} ₫`;

  sheet.getCell(`A${agingLabelRow}`).value = 'Thống kê aging:';
  config.agingBuckets.forEach((b, i) => {
    sheet.getCell(agingStartRow + i, 1).value = b.range;
    sheet.getCell(agingStartRow + i, 2).value = b.amount;
    sheet.getCell(agingStartRow + i, 2).numFmt = '#,##0';
  });

  sheet.getRow(headerRow).values = ['Ngày', 'Loại GD', 'Nợ', 'Có', 'Số dư', 'Ghi chú'];
  sheet.getRow(headerRow).font = { bold: true };
  sheet.getRow(headerRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  config.ledgerRows.forEach((row: any, i: number) => {
    const r = headerRow + 1 + i;
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');
    sheet.getCell(r, 1).value = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    sheet.getCell(r, 2).value = config.txnLabels[row.txnType] || row.txnType;
    sheet.getCell(r, 3).value = debit || '';
    if (debit) sheet.getCell(r, 3).numFmt = '#,##0';
    sheet.getCell(r, 4).value = credit || '';
    if (credit) sheet.getCell(r, 4).numFmt = '#,##0';
    sheet.getCell(r, 5).value = balance;
    sheet.getCell(r, 5).numFmt = '#,##0';
    sheet.getCell(r, 6).value = row.note || '';
  });

  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 22;
  sheet.getColumn(3).width = 16;
  sheet.getColumn(4).width = 16;
  sheet.getColumn(5).width = 18;
  sheet.getColumn(6).width = 32;

  await workbook.xlsx.write(writable);
}

function buildStatementHtml(config: StatementExportConfig, dateStr: string): string {
  const rows = config.ledgerRows.map((row: any) => {
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');
    const date = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    return `<tr>
      <td>${date}</td>
      <td>${config.txnLabels[row.txnType] || row.txnType}</td>
      <td class="num">${debit ? debit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${credit ? credit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${balance.toLocaleString('vi-VN')}</td>
      <td>${escapeHtml(row.note || '')}</td>
    </tr>`;
  }).join('');

  const agingRows = config.agingBuckets.map(b =>
    `<tr><td>${b.range}</td><td class="num">${b.amount.toLocaleString('vi-VN')} ₫</td></tr>`
  ).join('');

  const contactHtml = config.contactLines.map(l => escapeHtml(l)).join('<br>\n  ');

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<title>${escapeHtml(config.heading)} — ${escapeHtml(config.entityName)}</title>
<style>
  ${SHARED_CSS}
</style>
</head><body>
<h1>NEPO Logistics — ${escapeHtml(config.heading)}</h1>
<div class="meta">
  ${config.entityLabel}: <strong>${escapeHtml(config.entityName)}</strong><br>
  ${contactHtml}<br>
  Ngày xuất: ${dateStr}
</div>
<div class="total">Tổng nợ: ${config.totalOutstanding.toLocaleString('vi-VN')} ₫</div>
<table class="aging">${agingRows}</table>
<table>
  <thead><tr><th>Ngày</th><th>Loại GD</th><th class="num">Nợ</th><th class="num">Có</th><th class="num">Số dư</th><th>Ghi chú</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
