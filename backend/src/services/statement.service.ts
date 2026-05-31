import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';
import { TxnType, computeFifoAging } from '@nepocorp/shared';
import { LedgerService } from './ledger.service';

export interface CustomerStatementData {
  customer: { id: number; name: string; contactInfo: string | null };
  ledgerRows: any[];
  totalOutstanding: number;
  unpaidTrips: Array<{ tripId: number; date: string; outstanding: number; note: string }>;
  agingBuckets: Array<{ range: string; amount: number }>;
}

/**
 * Fetch the data needed to render or export a customer statement.
 *
 * Aging buckets are computed via FIFO (oldest invoice first) so the four
 * bucket totals reconcile to `totalOutstanding`. The naive "sum gross
 * TRIP_REVENUE by age" approach previously showed "0-30 NGÀY: 53M" when
 * the customer's open balance was only 50.6M because the 2.4M of payments
 * weren't being subtracted from the buckets.
 */
export async function getStatementData(customerId: number): Promise<CustomerStatementData | null> {
  const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, customerId)).limit(1);
  if (!customer) return null;

  const ledgerRows = await LedgerService.getEntriesByEntity('CUSTOMER', customerId);
  const totalOutstanding = ledgerRows.length > 0 ? parseFloat(ledgerRows[0].balance) : 0;

  const now = new Date();
  const { aging, openInvoices } = computeFifoAging(
    ledgerRows.map((r: any) => ({
      timestamp: r.timestamp,
      debit: r.debit ?? '0',
      credit: r.credit ?? '0',
    })),
    now,
  );

  // Build per-trip unpaid list from computeFifoAging's openInvoices (post-FIFO
  // credit allocation). This replaces a manual duplicate of the FIFO logic.
  const revenueEntries = ledgerRows.filter((r: any) => r.txnType === TxnType.TRIP_REVENUE);
  const tripNotes = new Map<number, string>();
  for (const entry of revenueEntries) {
    if (entry.txnId && !tripNotes.has(entry.txnId)) {
      tripNotes.set(entry.txnId, entry.note || '');
    }
  }

  // Match openInvoices back to their trip via timestamp → ledger row → txnId
  const tsToTripId = new Map<string, number>();
  for (const entry of revenueEntries) {
    if (entry.txnId && entry.timestamp) {
      tsToTripId.set(new Date(entry.timestamp).toISOString(), entry.txnId);
    }
  }

  const tripOutstanding = new Map<number, { tripId: number; date: string; outstanding: number; note: string }>();
  for (const inv of openInvoices) {
    if (inv.open <= 0) continue;
    // inv.ts is typed as string in shared types, but Drizzle may hand back a
    // Date for timestamp columns — coerce to ISO so it matches map keys.
    const tsRaw: unknown = inv.ts;
    if (tsRaw == null) continue; // skip entries with null/undefined timestamp
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

const TXN_LABELS: Record<string, string> = {
  TRIP_REVENUE: 'Doanh thu chuyến',
  PAYMENT_RECEIVED: 'Thu tiền',
  PENALTY: 'Phạt',
  MANAGEMENT_FEE: 'Phí quản lý',
  ADJUSTMENT: 'Điều chỉnh',
  DRIVER_SALARY: 'Lương tài xế',
};

/**
 * Build the XLSX workbook for a customer statement and write it directly
 * to the response stream. Avoids buffering the entire workbook in memory.
 */
export async function exportStatementXlsx(data: CustomerStatementData, dateStr: string, writable: import('stream').Writable): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sao kê công nợ');

  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `NEPO Logistics — Sao kê công nợ: ${data.customer.name}`;
  titleCell.font = { size: 14, bold: true };
  sheet.getCell('A2').value = `Liên hệ: ${data.customer.contactInfo || '—'}`;
  sheet.getCell('A3').value = `Ngày xuất: ${dateStr}`;
  sheet.getCell('A4').value = `Tổng nợ: ${data.totalOutstanding.toLocaleString('vi-VN')} ₫`;

  sheet.getCell('A6').value = 'Thống kê aging:';
  data.agingBuckets.forEach((b, i) => {
    sheet.getCell(i + 7, 1).value = b.range;
    sheet.getCell(i + 7, 2).value = b.amount;
    sheet.getCell(i + 7, 2).numFmt = '#,##0';
  });

  const headerRow = 12;
  sheet.getRow(headerRow).values = ['Ngày', 'Loại GD', 'Nợ', 'Có', 'Số dư', 'Ghi chú'];
  sheet.getRow(headerRow).font = { bold: true };
  sheet.getRow(headerRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

  data.ledgerRows.forEach((row: any, i: number) => {
    const r = headerRow + 1 + i;
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');
    sheet.getCell(r, 1).value = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    sheet.getCell(r, 2).value = TXN_LABELS[row.txnType] || row.txnType;
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

/**
 * Build a print-ready HTML page for a customer statement.
 * Browser handles PDF generation via the print dialog (Ctrl+P).
 */
export function exportStatementHtml(data: CustomerStatementData, dateStr: string): string {
  const rows = data.ledgerRows.map((row: any) => {
    const debit = parseFloat(row.debit || '0');
    const credit = parseFloat(row.credit || '0');
    const balance = parseFloat(row.balance || '0');
    const date = row.timestamp ? new Date(row.timestamp).toISOString().slice(0, 10) : '';
    return `<tr>
      <td>${date}</td>
      <td>${TXN_LABELS[row.txnType] || row.txnType}</td>
      <td class="num">${debit ? debit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${credit ? credit.toLocaleString('vi-VN') : ''}</td>
      <td class="num">${balance.toLocaleString('vi-VN')}</td>
      <td>${escapeHtml(row.note || '')}</td>
    </tr>`;
  }).join('');

  const agingRows = data.agingBuckets.map(b =>
    `<tr><td>${b.range}</td><td class="num">${b.amount.toLocaleString('vi-VN')} ₫</td></tr>`
  ).join('');

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<title>Sao kê công nợ — ${escapeHtml(data.customer.name)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 900px; margin: 24px auto; padding: 0 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #6b7280; font-size: 13px; margin-bottom: 16px; }
  .total { font-size: 16px; font-weight: 700; color: #111827; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12.5px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .aging { width: auto; margin-top: 8px; }
  .aging td { padding: 4px 12px 4px 0; }
  @media print { body { margin: 0; } }
</style>
</head><body>
<h1>NEPO Logistics — Sao kê công nợ</h1>
<div class="meta">
  Khách hàng: <strong>${escapeHtml(data.customer.name)}</strong><br>
  Liên hệ: ${escapeHtml(data.customer.contactInfo || '—')}<br>
  Ngày xuất: ${dateStr}
</div>
<div class="total">Tổng nợ: ${data.totalOutstanding.toLocaleString('vi-VN')} ₫</div>
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
