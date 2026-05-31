import * as XLSX from 'xlsx';

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Replace .csv with .xlsx in the filename to ensure it saves as an Excel file
  const cleanFilename = filename.endsWith('.csv') ? filename.replace(/\.csv$/, '.xlsx') : filename;

  // Create workbook and worksheet
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu');

  // Format cell types and numbers dynamically
  for (const cellAddress in worksheet) {
    if (cellAddress[0] === '!') continue; // Skip metadata keys

    const cell = worksheet[cellAddress];
    if (!cell) continue;

    const rowMatch = cellAddress.match(/\d+/);
    if (!rowMatch) continue;
    const rowNum = parseInt(rowMatch[0], 10);

    // Skip formatting header row cells
    if (rowNum === 1) {
      continue;
    }

    if (typeof cell.v === 'string' || cell.t === 's') {
      const rawVal = String(cell.v).trim();
      if (!rawVal) continue;

      // Do not treat leading-zero numeric strings (like phone numbers "0912345678") as numbers
      if (rawVal.startsWith('0') && rawVal.length > 1) {
        continue;
      }

      const normalized = rawVal.replace(/[₫đ\s]/g, '');

      // Check if it is a clean float or decimal value
      if (/^\d+([.,]\d+)?$/.test(normalized)) {
        const cleanVal = normalized.replace(',', '.');
        const numVal = parseFloat(cleanVal);
        if (!isNaN(numVal)) {
          cell.t = 'n';
          cell.v = numVal;
          cell.z = numVal % 1 !== 0 ? '#,##0.00' : '#,##0';
        }
      } else {
        // Check if it's a large integer with separators (e.g. "1.500.000" or "1,500,000")
        const cleanNumStr = rawVal.replace(/[.\s₫đ,]/g, '');
        if (cleanNumStr && /^\d+$/.test(cleanNumStr)) {
          const numVal = parseInt(cleanNumStr, 10);
          cell.t = 'n';
          cell.v = numVal;
          cell.z = '#,##0';
        }
      }
    } else if (cell.t === 'n') {
      const val = Number(cell.v);
      cell.z = val % 1 !== 0 ? '#,##0.00' : '#,##0';
    }
  }

  // Auto-fit column widths based on longest cell content
  const colsWidth = headers.map((header, colIndex) => {
    let maxLen = header.length;
    for (let r = 0; r < rows.length; r++) {
      const cellVal = String(rows[r][colIndex] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    }
    // Character width with standard padding, minimum 12 for clean spacing
    return { wch: Math.max(maxLen + 4, 12) };
  });
  worksheet['!cols'] = colsWidth;

  // Set professional row heights: header row = 28px, data rows = 22px
  const rowsCount = rows.length + 1;
  const rowsHeight = Array.from({ length: rowsCount }, (_, i) => ({
    hpx: i === 0 ? 28 : 22
  }));
  worksheet['!rows'] = rowsHeight;

  // Save/Download the polished excel file
  XLSX.writeFile(workbook, cleanFilename);
}


