package domain

import "time"

// ReportType represents the type of report
type ReportType string

const (
	// ReportTypeFinancialSummary represents a financial summary report
	ReportTypeFinancialSummary ReportType = "financial_summary"
	// ReportTypeTripExpenses represents a trip expenses report
	ReportTypeTripExpenses ReportType = "trip_expenses"
	// ReportTypeMonthlyExpenses represents a monthly expenses report
	ReportTypeMonthlyExpenses ReportType = "monthly_expenses"
)

// ReportFilter contains filters for report generation
type ReportFilter struct {
	StartDate    *time.Time `json:"start_date,omitempty"`
	EndDate      *time.Time `json:"end_date,omitempty"`
	VehicleID    *string    `json:"vehicle_id,omitempty"`
	CustomerID   *string    `json:"customer_id,omitempty"`
	DriverID     *string    `json:"driver_id,omitempty"`
	ReportType   ReportType `json:"report_type"`
	ExportFormat string     `json:"export_format,omitempty"` // "json", "xlsx", "csv"
}

// FinancialSummary represents the financial summary report data
type FinancialSummary struct {
	Period              string  `json:"period"`
	TotalRevenue        float64 `json:"total_revenue"`
	TotalExpenses       float64 `json:"total_expenses"`
	NetProfit           float64 `json:"net_profit"`
	TotalTrips          int     `json:"total_trips"`
	TotalDistanceKm     float64 `json:"total_distance_km"`
	FuelConsumptionRate float64 `json:"fuel_consumption_rate"`
}

// TripExpenseReport represents a trip expense report entry
type TripExpenseReport struct {
	TripID        string    `json:"trip_id"`
	TripDate      time.Time `json:"trip_date"`
	VehicleID     string    `json:"vehicle_id"`
	DriverName    string    `json:"driver_name"`
	CustomerName  string    `json:"customer_name"`
	Origin        string    `json:"origin"`
	Destination   string    `json:"destination"`
	DistanceKm    float64   `json:"distance_km"`
	FreightCharge float64   `json:"freight_charge"`
	FuelCost      float64   `json:"fuel_cost"`
	Tolls         float64   `json:"tolls"`
	OtherExpenses float64   `json:"other_expenses"`
	TotalExpenses float64   `json:"total_expenses"`
	NetProfit     float64   `json:"net_profit"`
}

// MonthlyExpenseReport represents a monthly expense report entry
type MonthlyExpenseReport struct {
	YearMonth       string  `json:"year_month"`
	VehicleID       string  `json:"vehicle_id"`
	VehicleName     string  `json:"vehicle_name"`
	DriverName      string  `json:"driver_name"`
	TotalTrips      int     `json:"total_trips"`
	TotalDistanceKm float64 `json:"total_distance_km"`
	FuelCost        float64 `json:"fuel_cost"`
	MaintenanceCost float64 `json:"maintenance_cost"`
	Salary          float64 `json:"salary"`
	OtherExpenses   float64 `json:"other_expenses"`
	TotalExpenses   float64 `json:"total_expenses"`
}
