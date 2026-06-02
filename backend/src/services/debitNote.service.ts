import { db } from '../db';
import * as s from '../db/schema';
import { eq, and, gte, lte, isNull, inArray } from 'drizzle-orm';

export interface DebitNoteLine {
  tripCode: string;
  departureDate: string;
  description: string;    // route name for freight; billing_label for fees
  quantity: number;       // always 1
  sellAmountInclVat: number;
  lineType: 'FREIGHT' | 'SERVICE_FEE';
}

export interface DebitNoteData {
  customer: { id: number; name: string; taxCode: string | null; contactPerson: string | null; phone: string | null };
  lines: DebitNoteLine[];
  total: number;
  month?: number;
  year?: number;
}

export async function getDebitNoteData(
  customerId: number,
  opts: {
    mode: 'MONTHLY' | 'PER_BATCH';
    month?: number;
    year?: number;
    tripIds?: number[];
  },
): Promise<DebitNoteData> {
  // 1. Fetch customer
  const [customer] = await db.select({
    id: s.customers.id,
    name: s.customers.name,
    taxCode: s.customers.taxCode,
    contactPerson: s.customers.contactPerson,
    phone: s.customers.phone,
  }).from(s.customers)
    .where(and(eq(s.customers.id, customerId), isNull(s.customers.deletedAt)));

  if (!customer) throw Object.assign(new Error('Không tìm thấy khách hàng'), { status: 404 });

  // 2. Build trip filter conditions
  const tripConditions: ReturnType<typeof eq>[] = [
    eq(s.trips.customerId, customerId),
    eq(s.trips.status, 'LOCKED' as any),
    isNull(s.trips.deletedAt),
  ];

  if (opts.mode === 'MONTHLY') {
    if (!opts.month || !opts.year) {
      throw Object.assign(new Error('MONTHLY mode requires month and year'), { status: 400 });
    }
    const monthStr = String(opts.month).padStart(2, '0');
    const from = `${opts.year}-${monthStr}-01`;
    const lastDay = new Date(opts.year, opts.month, 0).getDate();
    const to = `${opts.year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    tripConditions.push(gte(s.trips.departureDate, from) as any);
    tripConditions.push(lte(s.trips.departureDate, to) as any);
  } else if (opts.mode === 'PER_BATCH') {
    if (!opts.tripIds?.length) {
      throw Object.assign(new Error('PER_BATCH mode requires at least one trip ID'), { status: 400 });
    }
    tripConditions.push(inArray(s.trips.id, opts.tripIds) as any);
  }

  const trips = await db.select({
    id: s.trips.id,
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    revenue: s.trips.revenue,
    routeName: s.routes.name,
  }).from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .where(and(...(tripConditions as any[])))
    .orderBy(s.trips.departureDate);

  const lines: DebitNoteLine[] = [];

  for (const trip of trips) {
    // Freight line
    lines.push({
      tripCode: trip.tripCode ?? '',
      departureDate: trip.departureDate,
      description: `Cước vận chuyển${trip.routeName ? ` — ${trip.routeName}` : ''}`,
      quantity: 1,
      sellAmountInclVat: Number(trip.revenue ?? 0),
      lineType: 'FREIGHT',
    });

    // Approved ancillary fee lines with sellAmount > 0
    const fees = await db.select({
      sellAmount: s.tripExpenses.sellAmount,
      expenseType: s.tripExpenses.expenseType,
      billingLabel: s.forwarderExpenseTypes.billingLabel,
      name: s.forwarderExpenseTypes.name,
    }).from(s.tripExpenses)
      .leftJoin(
        s.forwarderExpenseTypes,
        eq(s.tripExpenses.expenseType, s.forwarderExpenseTypes.code),
      )
      .where(and(
        eq(s.tripExpenses.tripId, trip.id),
        eq(s.tripExpenses.approvalStatus, 'APPROVED'),
      ));

    for (const fee of fees) {
      if (Number(fee.sellAmount) <= 0) continue;
      lines.push({
        tripCode: trip.tripCode ?? '',
        departureDate: trip.departureDate,
        description: fee.billingLabel ?? fee.name ?? fee.expenseType,
        quantity: 1,
        sellAmountInclVat: Number(fee.sellAmount),
        lineType: 'SERVICE_FEE',
      });
    }
  }

  const total = lines.reduce((sum, l) => sum + l.sellAmountInclVat, 0);
  return { customer, lines, total, month: opts.month, year: opts.year };
}

export async function buildDebitNoteXlsx(data: DebitNoteData): Promise<Buffer> {
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as any).default ?? ExcelJSMod;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Giấy báo nợ');

  // Header info
  ws.mergeCells('A1:E1');
  ws.getCell('A1').value = 'GIẤY BÁO NỢ';
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.getCell('A2').value = `Khách hàng: ${data.customer.name}`;
  if (data.customer.taxCode) ws.getCell('A3').value = `MST: ${data.customer.taxCode}`;
  if (data.month && data.year) {
    ws.getCell('A4').value = `Kỳ: Tháng ${data.month}/${data.year}`;
  }

  // Table header (row 6)
  const headerRow = ws.getRow(6);
  headerRow.values = ['Mã chuyến', 'Ngày', 'Diễn giải', 'ĐVT', 'Số tiền (VNĐ)'];
  headerRow.font = { bold: true };
  headerRow.eachCell((cell: any) => {
    cell.border = { bottom: { style: 'thin' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
  });

  // Data rows
  let rowIdx = 7;
  for (const line of data.lines) {
    const row = ws.getRow(rowIdx++);
    row.values = [
      line.tripCode,
      line.departureDate,
      line.description,
      'lần',
      line.sellAmountInclVat,
    ];
    if (line.lineType === 'SERVICE_FEE') {
      row.getCell(3).font = { italic: true, color: { argb: 'FF555555' } };
    }
  }

  // Total row (leave one blank row gap)
  const totalRow = ws.getRow(rowIdx + 1);
  totalRow.values = ['', '', 'TỔNG CỘNG', '', data.total];
  totalRow.font = { bold: true };
  totalRow.getCell(5).border = { top: { style: 'thin' }, bottom: { style: 'double' } };

  // Column widths
  ws.columns = [
    { width: 18 }, // Mã chuyến
    { width: 12 }, // Ngày
    { width: 40 }, // Diễn giải
    { width: 8  }, // ĐVT
    { width: 16 }, // Số tiền
  ];

  // Number format for amount column
  ws.getColumn(5).numFmt = '#,##0';

  const ab = await wb.xlsx.writeBuffer();
  return Buffer.from(ab);
}
