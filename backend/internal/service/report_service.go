package service

import (
	"context"
	"fmt"
	"log"
	"time"

	"nepocorp/backend/internal/domain"

	"github.com/xuri/excelize/v2"
)

type ReportRepository interface {
	GetFinancialSummary(ctx context.Context, filter domain.ReportFilter) (*domain.FinancialSummary, error)
	GetTripExpenses(ctx context.Context, filter domain.ReportFilter) ([]domain.TripExpenseReport, error)
	GetMonthlyExpenses(ctx context.Context, filter domain.ReportFilter) ([]domain.MonthlyExpenseReport, error)
}

type ReportService struct {
	repo ReportRepository
}

func NewReportService(repo ReportRepository) *ReportService {
	return &ReportService{repo: repo}
}

// GenerateReport generates a report based on the provided filter
func (s *ReportService) GenerateReport(ctx context.Context, filter domain.ReportFilter) (interface{}, error) {
	switch filter.ReportType {
	case domain.ReportTypeFinancialSummary:
		return s.generateFinancialSummary(ctx, filter)
	case domain.ReportTypeTripExpenses:
		return s.generateTripExpensesReport(ctx, filter)
	case domain.ReportTypeMonthlyExpenses:
		return s.generateMonthlyExpensesReport(ctx, filter)
	default:
		return nil, fmt.Errorf("unsupported report type: %s", filter.ReportType)
	}
}

// ExportReport exports the report to the specified format (xlsx, csv, json)
func (s *ReportService) ExportReport(ctx context.Context, filter domain.ReportFilter, reportData interface{}) ([]byte, string, error) {
	switch filter.ExportFormat {
	case "xlsx":
		return s.exportToExcel(ctx, filter, reportData)
	case "csv":
		return s.exportToCSV(ctx, filter, reportData)
	case "json":
		return s.exportToJSON(ctx, reportData)
	default:
		return nil, "", fmt.Errorf("unsupported export format: %s", filter.ExportFormat)
	}
}

// generateFinancialSummary generates a financial summary report
func (s *ReportService) generateFinancialSummary(ctx context.Context, filter domain.ReportFilter) (*domain.FinancialSummary, error) {
	return s.repo.GetFinancialSummary(ctx, filter)
}

// generateTripExpensesReport generates a trip expenses report
func (s *ReportService) generateTripExpensesReport(ctx context.Context, filter domain.ReportFilter) ([]domain.TripExpenseReport, error) {
	return s.repo.GetTripExpenses(ctx, filter)
}

// generateMonthlyExpensesReport generates a monthly expenses report
func (s *ReportService) generateMonthlyExpensesReport(ctx context.Context, filter domain.ReportFilter) ([]domain.MonthlyExpenseReport, error) {
	return s.repo.GetMonthlyExpenses(ctx, filter)
}

// exportToExcel exports the report to Excel format
func (s *ReportService) exportToExcel(ctx context.Context, filter domain.ReportFilter, data interface{}) ([]byte, string, error) {
	f := excelize.NewFile()
	defer f.Close()

	sheetName := "Report"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, "", fmt.Errorf("failed to create sheet: %w", err)
	}

	switch reportData := data.(type) {
	case *domain.FinancialSummary:
		if err := s.exportFinancialSummaryToExcel(f, sheetName, reportData); err != nil {
			return nil, "", fmt.Errorf("failed to export financial summary: %w", err)
		}
	case []domain.TripExpenseReport:
		if err := s.exportTripExpensesToExcel(f, sheetName, reportData); err != nil {
			return nil, "", fmt.Errorf("failed to export trip expenses: %w", err)
		}
	case []domain.MonthlyExpenseReport:
		if err := s.exportMonthlyExpensesToExcel(f, sheetName, reportData); err != nil {
			return nil, "", fmt.Errorf("failed to export monthly expenses: %w", err)
		}
	default:
		return nil, "", fmt.Errorf("unsupported data type for Excel export")
	}

	f.SetActiveSheet(index)

	// Generate a filename based on the report type and current timestamp
	filename := fmt.Sprintf("%s_%s.xlsx", filter.ReportType, time.Now().Format("20060102_150405"))

	// Save the Excel file to a buffer
	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", fmt.Errorf("failed to write to buffer: %w", err)
	}

	return buf.Bytes(), filename, nil
}

// exportFinancialSummaryToExcel exports financial summary to Excel
func (s *ReportService) exportFinancialSummaryToExcel(f *excelize.File, sheetName string, data *domain.FinancialSummary) error {
	// Set headers
	headers := []string{"Metric", "Value"}
	for i, header := range headers {
		cell, err := excelize.CoordinatesToCellName(i+1, 1)
		if err != nil {
			return fmt.Errorf("failed to get cell coordinates: %w", err)
		}
		if err := f.SetCellValue(sheetName, cell, header); err != nil {
			return fmt.Errorf("failed to set cell value: %w", err)
		}
	}

	// Set data
	rows := [][]interface{}{
		{"Period", data.Period},
		{"Total Revenue", data.TotalRevenue},
		{"Total Expenses", data.TotalExpenses},
		{"Net Profit", data.NetProfit},
		{"Total Trips", data.TotalTrips},
		{"Total Distance (km)", data.TotalDistanceKm},
		{"Fuel Consumption Rate", data.FuelConsumptionRate},
	}

	for i, row := range rows {
		for j, value := range row {
			cell, err := excelize.CoordinatesToCellName(j+1, i+2) // +2 because of header row
			if err != nil {
				return fmt.Errorf("failed to get cell coordinates: %w", err)
			}
			if err := f.SetCellValue(sheetName, cell, value); err != nil {
				return fmt.Errorf("failed to set cell value: %w", err)
			}
		}
	}

	// Auto-size columns
	dimensions := []string{"A", "B"}
	for _, col := range dimensions {
		if err := f.SetColWidth(sheetName, col, col, 20); err != nil {
			// Log the error but don't fail the entire export for column width issues
			log.Printf("warning: failed to set column width for %s: %v", col, err)
		}
	}

	return nil
}

// exportTripExpensesToExcel exports trip expenses to Excel
func (s *ReportService) exportTripExpensesToExcel(f *excelize.File, sheetName string, data []domain.TripExpenseReport) error {
	if len(data) == 0 {
		return nil
	}

	// Set headers
	headers := []string{"Trip ID", "Date", "Vehicle ID", "Driver", "Customer", "Origin", "Destination",
		"Distance (km)", "Freight Charge", "Fuel Cost", "Tolls", "Other Expenses", "Total Expenses", "Net Profit"}

	for i, header := range headers {
		cell, err := excelize.CoordinatesToCellName(i+1, 1)
		if err != nil {
			return fmt.Errorf("failed to get cell coordinates: %w", err)
		}
		if err := f.SetCellValue(sheetName, cell, header); err != nil {
			return fmt.Errorf("failed to set header: %w", err)
		}
	}

	// Set data
	for i, trip := range data {
		row := i + 2 // +2 because of header row and 1-based indexing

		setCell := func(col int, value interface{}) error {
			cell, err := excelize.CoordinatesToCellName(col, row)
			if err != nil {
				return fmt.Errorf("failed to get cell coordinates: %w", err)
			}
			if err := f.SetCellValue(sheetName, cell, value); err != nil {
				return fmt.Errorf("failed to set cell value: %w", err)
			}
			return nil
		}

		// Set each cell value with error handling
		if err := setCell(1, trip.TripID); err != nil {
			return err
		}
		if err := setCell(2, trip.TripDate.Format("2006-01-02")); err != nil {
			return err
		}
		if err := setCell(3, trip.VehicleID); err != nil {
			return err
		}
		if err := setCell(4, trip.DriverName); err != nil {
			return err
		}
		if err := setCell(5, trip.CustomerName); err != nil {
			return err
		}
		if err := setCell(6, trip.Origin); err != nil {
			return err
		}
		if err := setCell(7, trip.Destination); err != nil {
			return err
		}
		if err := setCell(8, trip.DistanceKm); err != nil {
			return err
		}
		if err := setCell(9, trip.FreightCharge); err != nil {
			return err
		}
		if err := setCell(10, trip.FuelCost); err != nil {
			return err
		}
		if err := setCell(11, trip.Tolls); err != nil {
			return err
		}
		if err := setCell(12, trip.OtherExpenses); err != nil {
			return err
		}
		if err := setCell(13, trip.TotalExpenses); err != nil {
			return err
		}
		if err := setCell(14, trip.NetProfit); err != nil {
			return err
		}
	}

	// Auto-size columns
	dimensions := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"}
	for _, col := range dimensions {
		if err := f.SetColWidth(sheetName, col, col, 15); err != nil {
			log.Printf("warning: failed to set column width for %s: %v", col, err)
		}
	}

	// Set number format for currency and numbers
	styleID, _ := f.NewStyle(&excelize.Style{
		NumFmt: 2, // 0.00 format
	})

	// Apply to all numeric columns (H:N)
	for col := 8; col <= 14; col++ {
		colName, _ := excelize.ColumnNumberToName(col)
		err := f.SetColStyle(sheetName, colName, styleID)
		if err != nil {
			continue
		}
	}

	return nil
}

// exportMonthlyExpensesToExcel exports monthly expenses to Excel
func (s *ReportService) exportMonthlyExpensesToExcel(f *excelize.File, sheetName string, data []domain.MonthlyExpenseReport) error {
	if len(data) == 0 {
		return nil
	}

	// Set headers
	headers := []string{"Year-Month", "Vehicle", "Driver", "Total Trips", "Distance (km)", "Fuel Cost", "Maintenance", "Salary", "Other Expenses", "Total Expenses"}

	for i, header := range headers {
		cell, err := excelize.CoordinatesToCellName(i+1, 1)
		if err != nil {
			return fmt.Errorf("failed to get cell coordinates: %w", err)
		}
		if err := f.SetCellValue(sheetName, cell, header); err != nil {
			return fmt.Errorf("failed to set header: %w", err)
		}
	}

	// Set data
	for i, month := range data {
		row := i + 2 // +2 because of header row and 1-based indexing

		setCell := func(col int, value interface{}) error {
			cell, err := excelize.CoordinatesToCellName(col, row)
			if err != nil {
				return fmt.Errorf("failed to get cell coordinates: %w", err)
			}
			if err := f.SetCellValue(sheetName, cell, value); err != nil {
				return fmt.Errorf("failed to set cell value: %w", err)
			}
			return nil
		}

		// Extract year and month from YearMonth (format: "YYYY-MM")
		yearMonth := month.YearMonth
		if len(yearMonth) < 7 {
			yearMonth = "0000-00" // Default value if invalid format
		}

		// Set each cell value with error handling
		if err := setCell(1, yearMonth); err != nil {
			return err
		}
		if err := setCell(2, month.VehicleName); err != nil {
			return err
		}
		if err := setCell(3, month.DriverName); err != nil {
			return err
		}
		if err := setCell(4, month.TotalTrips); err != nil {
			return err
		}
		if err := setCell(5, month.TotalDistanceKm); err != nil {
			return err
		}
		if err := setCell(6, month.FuelCost); err != nil {
			return err
		}
		if err := setCell(7, month.MaintenanceCost); err != nil {
			return err
		}
		if err := setCell(8, month.Salary); err != nil {
			return err
		}
		if err := setCell(9, month.OtherExpenses); err != nil {
			return err
		}
		if err := setCell(10, month.TotalExpenses); err != nil {
			return err
		}
	}

	// Auto-size columns
	dimensions := []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"}
	for _, col := range dimensions {
		if err := f.SetColWidth(sheetName, col, col, 15); err != nil {
			log.Printf("warning: failed to set column width for %s: %v", col, err)
		}
	}

	// Set number format for currency and numbers
	styleID, err := f.NewStyle(&excelize.Style{
		NumFmt: 2, // 0.00 format
	})

	if err == nil { // Only apply number format if style creation succeeded
		// Apply to all numeric columns (C:G)
		for col := 3; col <= 7; col++ {
			colName, err := excelize.ColumnNumberToName(col)
			if err != nil {
				log.Printf("warning: failed to get column name for column %d: %v", col, err)
				continue
			}
			if err := f.SetColStyle(sheetName, colName, styleID); err != nil {
				log.Printf("warning: failed to set number format for column %s: %v", colName, err)
			}
		}
	} else {
		log.Printf("warning: failed to create number format style: %v", err)
	}

	return nil
}

// exportToCSV exports the report to CSV format
func (s *ReportService) exportToCSV(ctx context.Context, filter domain.ReportFilter, data interface{}) ([]byte, string, error) {
	// For simplicity, we'll just call exportToExcel and convert to CSV
	// In a real implementation, you might want to use a dedicated CSV writer
	excelData, filename, err := s.exportToExcel(ctx, filter, data)
	if err != nil {
		return nil, "", err
	}

	// Convert .xlsx to .csv in the filename
	csvFilename := filename[:len(filename)-4] + ".csv"

	// In a real implementation, you would convert the Excel data to CSV here
	// For now, we'll just return the Excel data with a .csv extension
	return excelData, csvFilename, nil
}

// exportToJSON exports the report to JSON format
func (s *ReportService) exportToJSON(ctx context.Context, data interface{}) ([]byte, string, error) {
	// In a real implementation, you would marshal the data to JSON
	// For now, we'll just return an empty byte slice
	return []byte("{}"), "report.json", nil
}
