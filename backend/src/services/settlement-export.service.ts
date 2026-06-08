import { getAdvanceSettlement } from './advance.service';

const EXPENSE_TYPE_LABELS: Record<string, string> = {
  LIFTING: 'Phí nâng container',
  LOWERING: 'Phí hạ container',
  CUSTOMS: 'Phí hải quan',
  WEIGHING: 'Phí cân hàng',
  INFRASTRUCTURE: 'Phí kết cầu hạ tầng',
  PORT_STORAGE: 'Phí lưu bãi',
  CLEANING: 'Phí vệ sinh container',
  OTHER: 'Khác',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatVND(n: number): string {
  return n.toLocaleString('vi-VN');
}

function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}`;
}

function formatLocalDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

interface PrintRow {
  date: string;
  container: string;
  customer: string;
  expenseType: string;
  amount: number;
  invoice: string;
}

function buildPrintRows(expenses: any[]): PrintRow[] {
  const grouped = new Map<string, Map<string, any[]>>();
  for (const exp of expenses) {
    const dateKey = exp.departureDate || 'unknown';
    const containerKey = exp.containerNumber || '-';
    if (!grouped.has(dateKey)) grouped.set(dateKey, new Map());
    const containerMap = grouped.get(dateKey)!;
    if (!containerMap.has(containerKey)) containerMap.set(containerKey, []);
    containerMap.get(containerKey)!.push(exp);
  }

  const rows: PrintRow[] = [];
  for (const [dateKey, containerMap] of grouped) {
    for (const [containerKey, exps] of containerMap) {
      const sorted = [...exps].sort((a, b) => a.expenseType.localeCompare(b.expenseType));
      for (const exp of sorted) {
        rows.push({
          date: dateKey !== 'unknown' ? formatMonth(dateKey) : '—',
          container: containerKey !== '-' ? containerKey : '—',
          customer: exp.customerName || '—',
          expenseType: EXPENSE_TYPE_LABELS[exp.expenseType] || exp.expenseType,
          amount: Number(exp.amount),
          invoice: exp.invoiceNumber || '',
        });
      }
    }
  }
  return rows;
}

const PRINT_CSS = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; max-width: 900px; margin: 24px auto; padding: 0 16px; font-size: 13px; }
  h1 { font-size: 20px; text-align: center; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta { display: flex; justify-content: space-between; color: #374151; font-size: 13px; margin: 8px 0 16px; border-bottom: 2px solid #1f2937; padding-bottom: 8px; }
  .section-title { font-size: 14px; font-weight: 700; margin: 16px 0 8px; color: #374151; }
  .advance-list { margin: 0 0 8px; }
  .advance-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
  .advance-total { display: flex; justify-content: space-between; font-weight: 700; border-top: 1px solid #d1d5db; padding-top: 6px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12.5px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #e5e7eb; text-align: left; }
  th { background: #f3f4f6; font-weight: 700; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .table-total td { border-top: 2px solid #1f2937; font-weight: 700; }
  .table-balance td { background: #fef2f2; font-weight: 700; color: #dc2626; }
  .summary { margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 6px; }
  .summary-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
  .summary-row--balance { border-top: 2px solid #1f2937; margin-top: 8px; padding-top: 8px; font-weight: 700; font-size: 16px; }
  .signatures { display: flex; justify-content: space-around; margin-top: 48px; }
  .sig-block { text-align: center; }
  .sig-label { font-weight: 700; font-size: 13px; }
  .sig-line { margin-top: 48px; font-size: 12px; color: #6b7280; }
  .note { margin: 12px 0; font-size: 13px; color: #374151; }
  @media print { body { margin: 0; } }
`;

export async function exportSettlementHtml(id: number): Promise<string | null> {
  const settlement = await getAdvanceSettlement(id);
  if (!settlement) return null;

  const expenses: any[] = settlement.linkedExpenses || [];
  const requests: any[] = settlement.linkedRequests || [];
  const totalAdvance = requests.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const refund = Number(settlement.refundAmount || 0);
  const balance = totalAdvance - totalExpense - refund;
  const dateStr = formatLocalDate();
  const rows = buildPrintRows(expenses);

  const advanceRows = requests.map((r: any) => `
    <div class="advance-item">
      <span>${formatVND(Number(r.amount))} — ${escapeHtml(r.reason)}</span>
      <span>${new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
    </div>`).join('');

  const expenseTableRows = rows.map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${escapeHtml(r.expenseType)}</td>
      <td>${escapeHtml(r.customer)}</td>
      <td style="font-family: monospace; font-size: 12px">${escapeHtml(r.container)}</td>
      <td class="num">${formatVND(r.amount)}</td>
      <td>${escapeHtml(r.invoice)}</td>
    </tr>`).join('');

  return `<!doctype html>
<html lang="vi"><head>
<meta charset="utf-8">
<title>Phiếu thanh toán PT-${String(settlement.id).padStart(4, '0')}</title>
<style>${PRINT_CSS}</style>
</head><body>
<h1>Phiếu thanh toán</h1>
<div class="meta">
  <span>Số: <strong>PT-${String(settlement.id).padStart(4, '0')}</strong></span>
  <span>Ngày: <strong>${new Date(settlement.createdAt).toLocaleDateString('vi-VN')}</strong></span>
  <span>Nhân viên: <strong>${escapeHtml(settlement.forwarderName || '')}</strong></span>
</div>

${requests.length > 0 ? `
<div class="section-title">Tạm ứng đã nhận</div>
<div class="advance-list">
  ${advanceRows}
  <div class="advance-total">
    <span>Tổng tạm ứng:</span>
    <span>${formatVND(totalAdvance)} ₫</span>
  </div>
</div>` : ''}

<div class="section-title">Chi tiết chi phí</div>
<table>
  <thead><tr><th>Ngày</th><th>Nội dung</th><th>Khách hàng</th><th>Số cont</th><th class="num">Tiền tệ</th><th>Hóa đơn</th></tr></thead>
  <tbody>
    ${expenseTableRows}
    <tr class="table-total">
      <td colspan="4"><strong>TỔNG CỘNG</strong></td>
      <td class="num"><strong>${formatVND(totalExpense)} ₫</strong></td>
      <td></td>
    </tr>
  </tbody>
</table>

<div class="summary">
  <div class="summary-row"><span>Tổng tạm ứng:</span><strong>${formatVND(totalAdvance)} ₫</strong></div>
  <div class="summary-row"><span>Tổng chi phí:</span><strong>${formatVND(totalExpense)} ₫</strong></div>
  ${refund > 0 ? `<div class="summary-row"><span>Tiền hoàn lại:</span><strong>${formatVND(refund)} ₫</strong></div>` : ''}
  <div class="summary-row summary-row--balance">
    <span>${balance >= 0 ? 'Còn dư (phải hoàn):' : 'Thiếu (phải bổ sung):'}</span>
    <strong style="color: ${balance >= 0 ? '#16a34a' : '#dc2626'}">${formatVND(Math.abs(balance))} ₫</strong>
  </div>
</div>

${settlement.note ? `<div class="note"><strong>Ghi chú:</strong> ${escapeHtml(settlement.note)}</div>` : ''}

<div class="signatures">
  <div class="sig-block"><div class="sig-label">Người lập</div><div class="sig-line">(Ký, họ tên)</div></div>
  <div class="sig-block"><div class="sig-label">Kế toán</div><div class="sig-line">(Ký, họ tên)</div></div>
  <div class="sig-block"><div class="sig-label">Quản lý</div><div class="sig-line">(Ký, họ tên)</div></div>
</div>
</body></html>`;
}

export async function exportSettlementXlsx(id: number, writable: import('stream').Writable): Promise<boolean> {
  const settlement = await getAdvanceSettlement(id);
  if (!settlement) return false;

  const expenses: any[] = settlement.linkedExpenses || [];
  const requests: any[] = settlement.linkedRequests || [];
  const totalAdvance = requests.reduce((sum: number, r: any) => sum + Number(r.amount), 0);
  const totalExpense = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);
  const refund = Number(settlement.refundAmount || 0);
  const balance = totalAdvance - totalExpense - refund;
  const rows = buildPrintRows(expenses);

  const ExcelJSMod = await import('exceljs');
  const ExcelJS = (ExcelJSMod as any).default ?? ExcelJSMod;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Phiếu thanh toán');

  // Title
  sheet.mergeCells('A1:F1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = `PHIẾU THANH TOÁN — PT-${String(settlement.id).padStart(4, '0')}`;
  titleCell.font = { size: 14, bold: true };

  // Meta
  sheet.getCell('A2').value = `Nhân viên: ${settlement.forwarderName || ''}`;
  sheet.getCell('A3').value = `Ngày lập: ${new Date(settlement.createdAt).toLocaleDateString('vi-VN')}`;

  let row = 5;

  // Advance summary
  if (requests.length > 0) {
    sheet.getCell(`A${row}`).value = 'Tạm ứng đã nhận';
    sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
    row++;
    for (const r of requests) {
      sheet.getCell(`A${row}`).value = r.reason;
      sheet.getCell(`D${row}`).value = Number(r.amount);
      sheet.getCell(`D${row}`).numFmt = '#,##0';
      sheet.getCell(`E${row}`).value = new Date(r.createdAt).toLocaleDateString('vi-VN');
      row++;
    }
    sheet.getCell(`A${row}`).value = 'Tổng tạm ứng:';
    sheet.getCell(`A${row}`).font = { bold: true };
    sheet.getCell(`D${row}`).value = totalAdvance;
    sheet.getCell(`D${row}`).numFmt = '#,##0';
    sheet.getCell(`D${row}`).font = { bold: true };
    row += 2;
  }

  // Expense table header
  sheet.getCell(`A${row}`).value = 'Chi tiết chi phí';
  sheet.getCell(`A${row}`).font = { bold: true, size: 12 };
  row++;

  const headerRow = sheet.getRow(row);
  headerRow.values = ['Ngày', 'Nội dung', 'Khách hàng', 'Số cont', 'Tiền tệ', 'Hóa đơn'];
  headerRow.font = { bold: true };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  row++;

  // Expense data rows
  for (const r of rows) {
    sheet.getCell(`A${row}`).value = r.date;
    sheet.getCell(`B${row}`).value = r.expenseType;
    sheet.getCell(`C${row}`).value = r.customer;
    sheet.getCell(`D${row}`).value = r.container;
    sheet.getCell(`E${row}`).value = r.amount;
    sheet.getCell(`E${row}`).numFmt = '#,##0';
    sheet.getCell(`F${row}`).value = r.invoice;
    row++;
  }

  // Total row
  const totalRow = sheet.getRow(row);
  totalRow.values = ['TỔNG CỘNG', '', '', '', totalExpense, ''];
  totalRow.font = { bold: true };
  totalRow.getCell(5).numFmt = '#,##0';
  row += 2;

  // Summary
  sheet.getCell(`A${row}`).value = 'Tổng tạm ứng:';
  sheet.getCell(`E${row}`).value = totalAdvance;
  sheet.getCell(`E${row}`).numFmt = '#,##0';
  row++;
  sheet.getCell(`A${row}`).value = 'Tổng chi phí:';
  sheet.getCell(`E${row}`).value = totalExpense;
  sheet.getCell(`E${row}`).numFmt = '#,##0';
  row++;
  if (refund > 0) {
    sheet.getCell(`A${row}`).value = 'Tiền hoàn lại:';
    sheet.getCell(`E${row}`).value = refund;
    sheet.getCell(`E${row}`).numFmt = '#,##0';
    row++;
  }
  sheet.getCell(`A${row}`).value = balance >= 0 ? 'Còn dư (phải hoàn):' : 'Thiếu (phải bổ sung):';
  sheet.getCell(`A${row}`).font = { bold: true };
  sheet.getCell(`E${row}`).value = Math.abs(balance);
  sheet.getCell(`E${row}`).numFmt = '#,##0';
  sheet.getCell(`E${row}`).font = { bold: true, color: { argb: balance >= 0 ? 'FF16A34A' : 'FFDC2626' } };
  row += 2;

  if (settlement.note) {
    sheet.getCell(`A${row}`).value = `Ghi chú: ${settlement.note}`;
  }

  // Column widths
  sheet.getColumn(1).width = 16;
  sheet.getColumn(2).width = 24;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 18;
  sheet.getColumn(5).width = 16;
  sheet.getColumn(6).width = 16;

  await workbook.xlsx.write(writable);
  return true;
}
