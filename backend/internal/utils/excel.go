package utils

import (
	"github.com/xuri/excelize/v2"
)

// ExcelColumnNames contains the Excel column names (A, B, ..., Z, AA, AB, ...)
var ExcelColumnNames = []string{
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
	"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
}

// ExportToExcel creates an Excel file from the provided data
// headers: map of column index to header text
// data: slice of maps where each map represents a row with column index as key
func ExportToExcel(sheetName string, headers map[int]string, data []map[int]interface{}) ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	// Create a new sheet
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}

	// Set headers
	for col, header := range headers {
		cell := GetCellName(col, 0)
		if err := f.SetCellValue(sheetName, cell, header); err != nil {
			return nil, err
		}
	}

	// Set data
	for rowIdx, row := range data {
		for colIdx, value := range row {
			cell := GetCellName(colIdx, rowIdx+1) // +1 because headers are in row 0
			if err := f.SetCellValue(sheetName, cell, value); err != nil {
				return nil, err
			}
		}
	}

	// Set active sheet of the workbook
	f.SetActiveSheet(index)

	// Save the Excel file to a buffer
	buffer, err := f.WriteToBuffer()
	if err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

// GetCellName returns the Excel cell name (e.g., A1, B2) from column and row indices (0-based)
func GetCellName(col, row int) string {
	if col < 0 || row < 0 {
		return "A1"
	}

	colName := ""
	col++ // Convert to 1-based

	for col > 0 {
		col--
		colName = string(rune('A'+(col%26))) + colName
		col /= 26
	}

	return colName + string(rune('1'+row))
}
