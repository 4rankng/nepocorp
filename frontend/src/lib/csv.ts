import * as XLSX from 'xlsx';

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  // Replace .csv with .xlsx in the filename to ensure it saves as an Excel file
  const cleanFilename = filename.endsWith('.csv') ? filename.replace(/\.csv$/, '.xlsx') : filename;

  // Create workbook and worksheet
  const sheetData = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu');

  // Auto-fit column widths based on longest cell content
  const colsWidth = headers.map((header, colIndex) => {
    let maxLen = header.length;
    for (let r = 0; r < rows.length; r++) {
      const cellVal = String(rows[r][colIndex] ?? '');
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    }
    // Return character width with padding, minimum 12 for neat presentation
    return { wch: Math.max(maxLen + 4, 12) };
  });
  worksheet['!cols'] = colsWidth;

  // Save/Download the properly formatted excel file
  XLSX.writeFile(workbook, cleanFilename);
}

