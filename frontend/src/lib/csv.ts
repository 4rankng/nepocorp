import ExcelJS from 'exceljs';

export async function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const cleanFilename = filename.endsWith('.csv') ? filename.replace(/\.csv$/, '.xlsx') : filename;

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Dữ liệu');

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 28;
  headerRow.font = { bold: true };

  for (const rowData of rows) {
    const row = worksheet.addRow(rowData);
    row.height = 22;
  }

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    row.eachCell((cell, _colNumber) => {
      if (cell.value === null || cell.value === undefined) return;

      const rawVal = String(cell.value).trim();
      if (!rawVal) return;

      if (typeof cell.value === 'string') {
        if (rawVal.startsWith('0') && rawVal.length > 1) return;

        const normalized = rawVal.replace(/[₫đ\s]/g, '');

        if (/^\d+([.,]\d+)?$/.test(normalized)) {
          const cleanVal = normalized.replace(',', '.');
          const numVal = parseFloat(cleanVal);
          if (!isNaN(numVal)) {
            cell.value = numVal;
            cell.numFmt = numVal % 1 !== 0 ? '#,##0.00' : '#,##0';
          }
        } else {
          const cleanNumStr = rawVal.replace(/[.\s₫đ,]/g, '');
          if (cleanNumStr && /^\d+$/.test(cleanNumStr)) {
            const numVal = parseInt(cleanNumStr, 10);
            cell.value = numVal;
            cell.numFmt = '#,##0';
          }
        }
      } else if (typeof cell.value === 'number') {
        cell.numFmt = cell.value % 1 !== 0 ? '#,##0.00' : '#,##0';
      }
    });
  });

  worksheet.columns.forEach((col, i) => {
    let maxLen = headers[i] ? headers[i].length : 0;
    worksheet.getColumn(i + 1).eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value || '').length;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.max(maxLen + 4, 12);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = cleanFilename;
  a.click();
  URL.revokeObjectURL(url);
}
