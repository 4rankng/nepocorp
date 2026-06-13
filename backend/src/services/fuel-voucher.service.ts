import { db } from '../db';
import * as s from '../db/schema';
import { eq } from 'drizzle-orm';
import { ApiError } from '../errors';

// ── Helpers ──
import { escapeHtml, formatVND, formatDateVi } from '../lib/format';

// ── Data contract ──

export interface FuelVoucherData {
  tripCode: string | null;
  departureDate: string;
  routeName: string | null;
  truckPlate: string | null;
  driverName: string | null;
  fuelLiters: number;
  fuelActualUnitPrice: number;
  totalFuelCost: number;
  fuelPriceApplied: number;
  supplierName: string | null;
  supplierNote: string | null;
}

// ── Data loading ──

export async function buildFuelVoucherData(tripId: number): Promise<FuelVoucherData> {
  const [row] = await db.select({
    tripCode: s.trips.tripCode,
    departureDate: s.trips.departureDate,
    routeName: s.routes.name,
    truckPlate: s.trucks.licensePlate,
    driverName: s.drivers.name,
    fuelLiters: s.trips.fuelLiters,
    fuelActualUnitPrice: s.trips.fuelActualUnitPrice,
    totalFuelCost: s.trips.totalFuelCost,
    fuelPriceApplied: s.trips.fuelPriceApplied,
    fuelSupplierId: s.trips.fuelSupplierId,
    supplierName: s.suppliers.name,
    supplierNote: s.suppliers.note,
  })
    .from(s.trips)
    .leftJoin(s.routes, eq(s.trips.routeId, s.routes.id))
    .leftJoin(s.trucks, eq(s.trips.truckId, s.trucks.id))
    .leftJoin(s.drivers, eq(s.trips.driverId, s.drivers.id))
    .leftJoin(s.suppliers, eq(s.trips.fuelSupplierId, s.suppliers.id))
    .where(eq(s.trips.id, tripId))
    .limit(1);

  if (!row) throw new ApiError(404, 'Không tìm thấy chuyến đi');
  if (!row.fuelSupplierId) throw new ApiError(400, 'Chuyến đi chưa gán nhà cung cấp nhiên liệu');

  return {
    tripCode: row.tripCode,
    departureDate: row.departureDate,
    routeName: row.routeName,
    truckPlate: row.truckPlate,
    driverName: row.driverName,
    fuelLiters: Number(row.fuelLiters ?? 0),
    fuelActualUnitPrice: Number(row.fuelActualUnitPrice ?? 0),
    totalFuelCost: Number(row.totalFuelCost ?? 0),
    fuelPriceApplied: Number(row.fuelPriceApplied ?? 0),
    supplierName: row.supplierName,
    supplierNote: row.supplierNote,
  };
}

// ── HTML rendering ──

const PRINT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 800px; margin: 24px auto; padding: 0 16px; font-size: 13px; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .subtitle { text-align: center; font-size: 13px; color: #6b7280; margin: 0 0 20px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 13px; color: #374151; }
  .meta span { display: block; margin-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th, td { border: 1px solid #d1d5db; padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #f3f4f6; font-weight: 600; white-space: nowrap; }
  .amount { text-align: right; font-weight: 600; }
  .vendor { margin-bottom: 20px; padding: 10px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
  .vendor-title { font-weight: 600; margin-bottom: 4px; font-size: 13px; }
  .vendor-detail { font-size: 13px; color: #4b5563; }
  .signatures { display: flex; justify-content: space-between; margin-top: 48px; padding-top: 12px; }
  .sig-block { text-align: center; width: 30%; }
  .sig-title { font-size: 13px; font-weight: 600; margin-bottom: 48px; }
  .sig-line { border-top: 1px solid #9ca3af; margin: 0 10px; }
  @media print { body { margin: 0; } }
`;

export function renderFuelVoucherHtml(data: FuelVoucherData): string {
  const dateStr = formatDateVi(data.departureDate);

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Phiếu cấp nhiên liệu - ${escapeHtml(data.tripCode ?? '')}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <h1>Phiếu cấp nhiên liệu</h1>
  <p class="subtitle">FUEL ISSUANCE VOUCHER</p>

  <div class="meta">
    <div>
      <span><strong>Mã chuyến:</strong> ${escapeHtml(data.tripCode ?? '—')}</span>
      <span><strong>Ngày xuất phát:</strong> ${dateStr}</span>
    </div>
    <div>
      <span><strong>Tuyến:</strong> ${escapeHtml(data.routeName ?? '—')}</span>
      <span><strong>Biển số xe:</strong> ${escapeHtml(data.truckPlate ?? '—')}</span>
    </div>
  </div>

  <div class="meta">
    <span><strong>Lái xe:</strong> ${escapeHtml(data.driverName ?? '—')}</span>
  </div>

  <table>
    <thead>
      <tr>
        <th>STT</th>
        <th>Hạng mục</th>
        <th>Số lượng (Lít)</th>
        <th>Đơn giá (đ/Lít)</th>
        <th>Thành tiền (đ)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1</td>
        <td>Nhiên liệu (Diesel)</td>
        <td>${formatVND(data.fuelLiters)}</td>
        <td>${formatVND(data.fuelActualUnitPrice)}</td>
        <td class="amount">${formatVND(data.totalFuelCost)}</td>
      </tr>
      <tr>
        <td colspan="4" style="text-align: right; font-weight: 700;">Tổng cộng</td>
        <td class="amount" style="font-weight: 700;">${formatVND(data.totalFuelCost)}</td>
      </tr>
    </tbody>
  </table>

  <div class="vendor">
    <div class="vendor-title">Nhà cung cấp: ${escapeHtml(data.supplierName ?? '—')}</div>
    ${data.supplierNote ? `<div class="vendor-detail">Ghi chú: ${escapeHtml(data.supplierNote)}</div>` : ''}
    <div class="vendor-detail">Giá áp dụng: ${formatVND(data.fuelPriceApplied)} đ/Lít</div>
  </div>

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-title">Người lập phiếu</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Kế toán trưởng</div>
      <div class="sig-line"></div>
    </div>
    <div class="sig-block">
      <div class="sig-title">Người nhận</div>
      <div class="sig-line"></div>
    </div>
  </div>
</body>
</html>`;
}

// ── XLSX rendering ──

export async function renderFuelVoucherXlsx(data: FuelVoucherData, writable: import('stream').Writable): Promise<boolean> {
  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as Record<string, unknown>).default
    ? ((ExcelJSMod as Record<string, unknown>).default as typeof ExcelJSMod)
    : ExcelJSMod;
  const F = 'Calibri';
  const CLR = {
    dark: 'FF1E293B',
    header: 'FFE2E8F0',
    white: 'FFFFFFFF',
  };
  const thinB = { style: 'thin' as const, color: { argb: 'FF9CA3AF' } };
  const borderAll = { top: thinB, bottom: thinB, left: thinB, right: thinB };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'TingTing';
  const ws = wb.addWorksheet('Phieu cap nhien lieu', {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToWidth: 1, margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.3, header: 0.3, footer: 0.3 } },
  });
  ws.columns = [
    { width: 6 },   // A: STT
    { width: 26 },  // B: Hạng mục
    { width: 16 },  // C: Số lượng
    { width: 16 },  // D: Đơn giá
    { width: 20 },  // E: Thành tiền
  ];

  let row = 1;

  // Title
  const titleRow = ws.getRow(row);
  titleRow.height = 28;
  ws.mergeCells(`A${row}:E${row}`);
  const titleCell = titleRow.getCell(1);
  titleCell.value = 'PHIẾU CẤP NHIÊN LIỆU';
  titleCell.font = { name: F, size: 14, bold: true, color: { argb: CLR.dark } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  row++;

  // Subtitle
  const subRow = ws.getRow(row);
  subRow.height = 18;
  ws.mergeCells(`A${row}:E${row}`);
  const subCell = subRow.getCell(1);
  subCell.value = 'FUEL ISSUANCE VOUCHER';
  subCell.font = { name: F, size: 10, color: { argb: 'FF6B7280' } };
  subCell.alignment = { horizontal: 'center' };
  row++;

  // Blank spacer
  row++;

  // Metadata row 1
  const meta1 = ws.getRow(row);
  meta1.height = 18;
  ws.mergeCells(`A${row}:C${row}`);
  ws.mergeCells(`D${row}:E${row}`);
  meta1.getCell(1).value = `Mã chuyến: ${data.tripCode ?? '—'}`;
  meta1.getCell(1).font = { name: F, size: 10, color: { argb: CLR.dark } };
  meta1.getCell(4).value = `Ngày xuất phát: ${formatDateVi(data.departureDate)}`;
  meta1.getCell(4).font = { name: F, size: 10, color: { argb: CLR.dark } };
  row++;

  // Metadata row 2
  const meta2 = ws.getRow(row);
  meta2.height = 18;
  ws.mergeCells(`A${row}:C${row}`);
  ws.mergeCells(`D${row}:E${row}`);
  meta2.getCell(1).value = `Tuyến: ${data.routeName ?? '—'}`;
  meta2.getCell(1).font = { name: F, size: 10, color: { argb: CLR.dark } };
  meta2.getCell(4).value = `Biển số xe: ${data.truckPlate ?? '—'}`;
  meta2.getCell(4).font = { name: F, size: 10, color: { argb: CLR.dark } };
  row++;

  // Metadata row 3
  const meta3 = ws.getRow(row);
  meta3.height = 18;
  ws.mergeCells(`A${row}:E${row}`);
  meta3.getCell(1).value = `Lái xe: ${data.driverName ?? '—'}`;
  meta3.getCell(1).font = { name: F, size: 10, color: { argb: CLR.dark } };
  row++;

  // Blank spacer
  row++;

  // Table header
  const hdrRow = ws.getRow(row);
  hdrRow.height = 22;
  const headers = ['STT', 'Hạng mục', 'Số lượng (Lít)', 'Đơn giá (đ/Lít)', 'Thành tiền (đ)'];
  for (let i = 0; i < headers.length; i++) {
    const c = hdrRow.getCell(i + 1);
    c.value = headers[i];
    c.font = { name: F, size: 10, bold: true, color: { argb: CLR.white } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.border = borderAll;
    c.alignment = { horizontal: i >= 2 ? 'right' : 'center', vertical: 'middle' };
  }
  row++;

  // Data row
  const dataRow = ws.getRow(row);
  dataRow.height = 20;
  const values: (string | number)[] = [1, 'Nhiên liệu (Diesel)', data.fuelLiters, data.fuelActualUnitPrice, data.totalFuelCost];
  for (let i = 0; i < values.length; i++) {
    const c = dataRow.getCell(i + 1);
    c.value = values[i];
    c.font = { name: F, size: 10, color: { argb: CLR.dark } };
    c.border = borderAll;
    if (i >= 2) {
      c.alignment = { horizontal: 'right' };
      if (typeof values[i] === 'number') {
        c.numFmt = '#,##0';
      }
    }
  }
  row++;

  // Total row
  const totalRow = ws.getRow(row);
  totalRow.height = 22;
  ws.mergeCells(`A${row}:D${row}`);
  totalRow.getCell(1).value = 'Tổng cộng';
  totalRow.getCell(1).font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  totalRow.getCell(1).alignment = { horizontal: 'right', vertical: 'middle' };
  totalRow.getCell(1).border = borderAll;
  // Apply borders to merged cells
  for (let col = 2; col <= 4; col++) {
    totalRow.getCell(col).border = borderAll;
  }
  const totalCell = totalRow.getCell(5);
  totalCell.value = data.totalFuelCost;
  totalCell.font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  totalCell.numFmt = '#,##0';
  totalCell.alignment = { horizontal: 'right' };
  totalCell.border = { ...borderAll, top: { style: 'medium' as const, color: { argb: CLR.dark } } };
  row++;

  // Blank spacer
  row++;

  // Vendor info
  const vendorRow = ws.getRow(row);
  vendorRow.height = 18;
  ws.mergeCells(`A${row}:E${row}`);
  vendorRow.getCell(1).value = `Nhà cung cấp: ${data.supplierName ?? '—'}`;
  vendorRow.getCell(1).font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  row++;

  if (data.supplierNote) {
    const noteRow = ws.getRow(row);
    noteRow.height = 16;
    ws.mergeCells(`A${row}:E${row}`);
    noteRow.getCell(1).value = `Ghi chú: ${data.supplierNote}`;
    noteRow.getCell(1).font = { name: F, size: 9, italic: true, color: { argb: 'FF6B7280' } };
    row++;
  }

  const priceRow = ws.getRow(row);
  priceRow.height = 16;
  ws.mergeCells(`A${row}:E${row}`);
  priceRow.getCell(1).value = `Giá áp dụng: ${formatVND(data.fuelPriceApplied)} đ/Lít`;
  priceRow.getCell(1).font = { name: F, size: 10, color: { argb: 'FF374151' } };
  row++;

  // Blank spacer rows before signatures
  row++;
  row++;

  // Signatures: 3 blocks spread across columns A:B, C, D:E
  const sigTitleRow = ws.getRow(row);
  sigTitleRow.height = 18;
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:C${row}`);
  ws.mergeCells(`D${row}:E${row}`);
  const sigLabels = ['Người lập phiếu', 'Kế toán trưởng', 'Người nhận'];
  sigTitleRow.getCell(1).value = sigLabels[0];
  sigTitleRow.getCell(1).font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  sigTitleRow.getCell(1).alignment = { horizontal: 'center' };
  sigTitleRow.getCell(3).value = sigLabels[1];
  sigTitleRow.getCell(3).font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  sigTitleRow.getCell(3).alignment = { horizontal: 'center' };
  sigTitleRow.getCell(4).value = sigLabels[2];
  sigTitleRow.getCell(4).font = { name: F, size: 10, bold: true, color: { argb: CLR.dark } };
  sigTitleRow.getCell(4).alignment = { horizontal: 'center' };
  row += 4;

  // Signature lines
  const sigLineRow = ws.getRow(row);
  sigLineRow.height = 16;
  ws.mergeCells(`A${row}:B${row}`);
  ws.mergeCells(`C${row}:C${row}`);
  ws.mergeCells(`D${row}:E${row}`);
  const lineStyle = { bottom: { style: 'thin' as const, color: { argb: 'FF9CA3AF' } } };
  sigLineRow.getCell(1).border = lineStyle;
  sigLineRow.getCell(2).border = lineStyle;
  sigLineRow.getCell(3).border = lineStyle;
  sigLineRow.getCell(4).border = lineStyle;
  sigLineRow.getCell(5).border = lineStyle;
  row += 2;

  // Footer
  const footerRow = ws.getRow(row);
  footerRow.height = 14;
  ws.mergeCells(`A${row}:E${row}`);
  footerRow.getCell(1).value = `In bởi TingTing Logistics — ${new Date().toLocaleDateString('vi-VN')}`;
  footerRow.getCell(1).font = { name: F, size: 8, italic: true, color: { argb: 'FF9CA3AF' } };
  footerRow.getCell(1).alignment = { horizontal: 'center' };

  await wb.xlsx.write(writable);
  return true;
}

// ── Convenience wrappers ──

export async function getFuelVoucherHtml(tripId: number): Promise<string> {
  const data = await buildFuelVoucherData(tripId);
  return renderFuelVoucherHtml(data);
}

export async function getFuelVoucherXlsx(tripId: number, writable: import('stream').Writable): Promise<boolean> {
  const data = await buildFuelVoucherData(tripId);
  return renderFuelVoucherXlsx(data, writable);
}
