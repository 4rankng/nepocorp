package models

import (
	"time"
)

// MaintenanceItemResponse represents flattened maintenance data combining expense and expense_item information
type MaintenanceItemResponse struct {
	ID               uint       `json:"id"`
	ExpenseID        uint       `json:"expense_id"`
	TractorID        *uint      `json:"tractor_id"`
	TrailerID        *uint      `json:"trailer_id"`
	LicensePlate     string     `json:"license_plate"`
	VendorName       string     `json:"vendor_name"`
	PaymentStatus    string     `json:"payment_status"`
	ExpenseCreatedAt time.Time  `json:"expense_created_at"`
	ItemName         string     `json:"item_name"`
	Quantity         int        `json:"quantity"`
	Price            int64      `json:"price"`
	Total            int64      `json:"total"`
	InstallDate      *time.Time `json:"install_date"`
	ExpiryDate       *time.Time `json:"expiry_date"`
	Remark           string     `json:"remark"`
}