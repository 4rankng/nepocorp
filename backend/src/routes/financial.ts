import { Router } from 'express';
import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
// auth + Casbin applied at mount point in index.ts
import { Role, TxnType } from '@nepocorp/shared';
import { requireRoles } from '../middleware/casbin';
import { createPaymentSchema, createPenaltySchema, createAdjustmentSchema } from '@nepocorp/shared';
import type { Request, Response } from 'express';
import { LedgerService } from '../services/ledger.service';
import { getDashboardStats, getPnlReport, distributeProfit, getReceivablesSummary } from '../services/reporting.service';

const router = Router();

// ─── Ledger ──────────────────────────────────────────────────────────────────

router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const result = await LedgerService.getEntries({
      entityType: req.query.entity_type as string,
      entityId: req.query.entity_id ? parseInt(req.query.entity_id as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Customer statement ──────────────────────────────────────────────────────

interface CustomerStatementData {
  customer: { id: number; name: string; contact_info: string | null };
  ledgerRows: any[];
  totalOutstanding: number;
  unpaidTrips: Array<{ tripId: number; date: string; outstanding: number; note: string }>;
  agingBuckets: Array<{ range: string; amount: number }>;
}

async function getCustomerStatementData(customerId: number): Promise<CustomerStatementData | null> {
  const [customer] = await db.select().from(s.customers).where(eq(s.customers.id, customerId)).limit(1);
  if (!customer) return null;

  const ledgerRows = await LedgerService.getEntriesByEntity('CUSTOMER', customerId);
  const totalOutstanding = ledgerRows.length > 0 ? parseFloat(ledgerRows[0].balance) : 0;

  const now = new Date();
  const aging = { current: 0, d30: 0, d60: 0, d90: 0, over90: 0 };
  const revenueEntries = ledgerRows.filter((r: any) => r.txnType === TxnType.TRIP_REVENUE);
  for (const entry of revenueEntries) {
    const age = (now.getTime() - new Date(entry.timestamp!).getTime()) / (1000 * 60 * 60 * 24);
    const amount = parseFloat(entry.debit ?? '0');
    if (age <= 30) aging.current += amount;
    else if (age <= 60) aging.d30 += amount;
    else if (age <= 90) aging.d60 += amount;
    else aging.over90 += amount;
  }

  const paymentCredits = ledgerRows
    .filter((r: any) => r.txnType === TxnType.PAYMENT_RECEIVED)
    .reduce((sum: number, r: any) => sum + parseFloat(r.credit ?? '0'), 0);

  const tripDebits = new Map<number, { tripId: number; date: string; outstanding: number; note: string }>();
  for (const entry of revenueEntries) {
    if (!entry.txnId) continue;
    const amount = parseFloat(entry.debit ?? '0');
    const existing = tripDebits.get(entry.txnId);
    if (existing) {
      existing.outstanding += amount;
    } else {
      tripDebits.set(entry.txnId, {
        tripId: entry.txnId,
        date: entry.timestamp ? new Date(entry.timestamp).toISOString().slice(0, 10) : '',
        outstanding: amount,
        note: entry.note || '',
      });
    }
  }

  let remainingCredit = paymentCredits;
  const unpaidTrips = Array.from(tripDebits.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(trip => {
      if (remainingCredit > 0) {
        const apply = Math.min(remainingCredit, trip.outstanding);
        trip.outstanding -= apply;
        remainingCredit -= apply;
      }
      return trip;
    })
    .filter(t => t.outstanding > 0);

  return {
    customer: { id: customer.id, name: customer.name, contact_info: customer.contactInfo },
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

router.get('/ledger/customers/:id/statement', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const data = await getCustomerStatementData(customerId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ─── Customer statement export (XLSX / HTML print) ──────────────────────────

router.get('/ledger/customers/:id/statement/export', async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id as string);
    const format = (req.query.format as string) || 'xlsx';
    const data = await getCustomerStatementData(customerId);
    if (!data) return res.status(404).json({ error: 'Không tìm thấy khách hàng' });

    const dateStr = new Date().toISOString().slice(0, 10);
    const safeName = data.customer.name.replace(/[^a-zA-Z0-9À-ỹ ]/g, '').replace(/\s+/g, '-');

    if (format === 'pdf') {
      // HTML with print CSS — browser handles PDF generation via Ctrl+P
      const html = generateStatementHtml(data, dateStr);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
      return;
    }

    // Default: XLSX
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sao kê công nợ');

    // Header
    sheet.mergeCells('A1:F1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `NEPO Logistics — Sao kê công nợ: ${data.customer.name}`;
    titleCell.font = { size: 14, bold: true };
    sheet.getCell('A2').value = `Liên hệ: ${data.customer.contact_info || '—'}`;
    sheet.getCell('A3').value = `Ngày xuất: ${dateStr}`;
    sheet.getCell('A4').value = `Tổng nợ: ${data.totalOutstanding.toLocaleString('vi-VN')} ₫`;

    // Aging summary
    sheet.getCell('A6').value = 'Thống kê aging:';
    data.agingBuckets.forEach((b, i) => {
      sheet.getCell(i + 7, 1).value = b.range;
      sheet.getCell(i + 7, 2).value = b.amount;
      sheet.getCell(i + 7, 2).numFmt = '#,##0';
    });

    // Ledger table
    const headerRow = 12;
    sheet.getRow(headerRow).values = ['Ngày', 'Loại GD', 'Nợ', 'Có', 'Số dư', 'Ghi chú'];
    sheet.getRow(headerRow).font = { bold: true };
    sheet.getRow(headerRow).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };

    const TXN_LABELS: Record<string, string> = {
      TRIP_REVENUE: 'Doanh thu chuyến',
      PAYMENT_RECEIVED: 'Thu tiền',
      PENALTY: 'Phạt',
      MANAGEMENT_FEE: 'Phí quản lý',
      ADJUSTMENT: 'Điều chỉnh',
      DRIVER_SALARY: 'Lương tài xế',
    };

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

    // Auto-width
    sheet.columns = [
      { width: 12 }, { width: 20 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 30 },
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=sao-ke-${safeName}-${dateStr}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

function generateStatementHtml(data: CustomerStatementData, dateStr: string): string {
  const rows = data.ledgerRows.map((r: any) => {
    const debit = parseFloat(r.debit || '0');
    const credit = parseFloat(r.credit || '0');
    const balance = parseFloat(r.balance || '0');
    const TXN_LABELS: Record<string, string> = {
      TRIP_REVENUE: 'Doanh thu chuyến', PAYMENT_RECEIVED: 'Thu tiền',
      PENALTY: 'Phạt', MANAGEMENT_FEE: 'Phí quản lý',
      ADJUSTMENT: 'Điều chỉnh', DRIVER_SALARY: 'Lương tài xế',
    };
    return `<tr>
      <td>${r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 10) : ''}</td>
      <td>${TXN_LABELS[r.txnType] || r.txnType}</td>
      <td style="text-align:right">${debit > 0 ? debit.toLocaleString('vi-VN') : ''}</td>
      <td style="text-align:right">${credit > 0 ? credit.toLocaleString('vi-VN') : ''}</td>
      <td style="text-align:right">${balance.toLocaleString('vi-VN')}</td>
      <td>${r.note || ''}</td>
    </tr>`;
  }).join('');

  const agingRows = data.agingBuckets.map(b =>
    `<tr><td>${b.range}</td><td style="text-align:right">${b.amount.toLocaleString('vi-VN')} ₫</td></tr>`
  ).join('');

  return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8">
    <title>Sao kê: ${data.customer.name}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #1a1a1a; }
      h1 { font-size: 18px; margin-bottom: 4px; }
      h2 { font-size: 14px; margin-top: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
      th { background: #e2e8f0; font-weight: bold; }
      .info { color: #555; margin: 4px 0; }
      .aging-table { width: auto; }
      @media print { body { margin: 0; } }
    </style>
  </head><body>
    <h1>NEPO Logistics — Sao kê công nợ</h1>
    <p class="info">Khách hàng: <strong>${data.customer.name}</strong></p>
    <p class="info">Liên hệ: ${data.customer.contact_info || '—'}</p>
    <p class="info">Ngày xuất: ${dateStr}</p>
    <p class="info">Tổng nợ: <strong style="color:${data.totalOutstanding > 0 ? '#dc2626' : '#16a34a'}">${data.totalOutstanding.toLocaleString('vi-VN')} ₫</strong></p>

    <h2>Thống kê aging</h2>
    <table class="aging-table">${agingRows}</table>

    <h2>Sổ kế toán (${data.ledgerRows.length} giao dịch)</h2>
    <table>
      <thead><tr><th>Ngày</th><th>Loại GD</th><th style="text-align:right">Nợ</th><th style="text-align:right">Có</th><th style="text-align:right">Số dư</th><th>Ghi chú</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload = () => window.print();</script>
  </body></html>`;
}

// ─── Record payment ──────────────────────────────────────────────────────────

router.post('/payments/receive', async (req: Request, res: Response) => {
  try {
    const data = createPaymentSchema.parse(req.body);

    await db.transaction(async (tx) => {
      for (const payment of data.payments) {
        await LedgerService.postEntry(tx, {
          txnType: TxnType.PAYMENT_RECEIVED,
          txnId: payment.trip_id,
          receiptId: data.receipt_id,
          entityType: 'CUSTOMER',
          entityId: data.customer_id,
          debit: 0,
          credit: payment.amount,
          note: `Thanh toán chuyến #${payment.trip_id}`,
        });
      }
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Adjustment ──────────────────────────────────────────────────────────────

router.post('/adjustments', async (req: Request, res: Response) => {
  try {
    const data = createAdjustmentSchema.parse(req.body);

    const [trip] = await db.select().from(s.trips).where(eq(s.trips.id, data.trip_id)).limit(1);
    if (!trip) return res.status(404).json({ error: 'Không tìm thấy chuyến đi' });

    await db.transaction(async (tx) => {
      const isDebit = data.amount > 0;
      await LedgerService.postEntry(tx, {
        txnType: TxnType.ADJUSTMENT,
        txnId: data.trip_id,
        entityType: 'CUSTOMER',
        entityId: trip.customerId,
        debit: isDebit ? data.amount : 0,
        credit: isDebit ? 0 : Math.abs(data.amount),
        note: `${data.note} (HĐ: ${data.signed_agreement_ref})`,
      });
    });

    res.status(201).json({ ok: true });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Penalties ───────────────────────────────────────────────────────────────

router.get('/penalties', async (req: Request, res: Response) => {
  try {
    const driverId = req.query.driver_id as string;
    const conditions = [isNull(s.penalties.deletedAt)];
    if (driverId) conditions.push(eq(s.penalties.driverId, parseInt(driverId)));

    const items = await db.select({
      id: s.penalties.id, driverId: s.penalties.driverId, tripId: s.penalties.tripId,
      reasonId: s.penalties.reasonId, customReason: s.penalties.customReason,
      amount: s.penalties.amount, date: s.penalties.date,
      driverName: s.drivers.name,
      reasonText: s.penaltyReasons.reasonText,
    }).from(s.penalties)
      .leftJoin(s.drivers, eq(s.penalties.driverId, s.drivers.id))
      .leftJoin(s.penaltyReasons, eq(s.penalties.reasonId, s.penaltyReasons.id))
      .where(and(...conditions))
      .orderBy(desc(s.penalties.date));

    res.json({ items, total: items.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/penalties', async (req: Request, res: Response) => {
  try {
    const data = createPenaltySchema.parse(req.body);

    await db.transaction(async (tx) => {
      // Advisory lock to prevent concurrent penalty races
      await LedgerService.lockEntity(tx, 'DRIVER', data.driver_id);

      const [penalty] = await tx.insert(s.penalties).values({
        driverId: data.driver_id,
        tripId: data.trip_id,
        reasonId: data.reason_id,
        customReason: data.custom_reason,
        amount: String(data.amount),
        date: data.date,
      }).returning();

      // Create ledger entry for driver
      await LedgerService.postEntry(tx, {
        txnType: TxnType.PENALTY,
        txnId: penalty.id,
        entityType: 'DRIVER',
        entityId: data.driver_id,
        debit: data.amount,
        credit: 0,
        note: data.custom_reason || `Kỷ luật chuyến #${data.trip_id || ''}`,
      });

      res.status(201).json(penalty);
    });
  } catch (err: any) {
    if (err.name === 'ZodError') return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

router.get('/reports/dashboard', async (_req: Request, res: Response) => {
  try {
    res.json(await getDashboardStats());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── P&L report ──────────────────────────────────────────────────────────────

router.get('/reports/pnl', async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    res.json(await getPnlReport(month, year));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Receivables summary ──────────────────────────────────────────────────────

router.get('/reports/receivables-summary', async (_req: Request, res: Response) => {
  try {
    res.json(await getReceivablesSummary());
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Profit distribution — ADMIN/MANAGER only (stricter than Casbin 'financial' resource)
router.post('/reports/distribute-profit', requireRoles(Role.ADMIN, Role.MANAGER), async (req: Request, res: Response) => {
  try {
    const { quarter, year } = req.body;
    if (!quarter || !year) return res.status(400).json({ error: 'Cần nhập quý và năm' });
    const result = await distributeProfit(quarter, year);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
