package models

import (
	"time"
)

type TractorExpense struct {
	ID                uint       `gorm:"primarykey" json:"id"`
	TractorID         uint       `gorm:"not null" json:"tractor_id"`
	VendorName        string     `gorm:"not null" json:"vendor_name"`
	ExpenseCategoryID uint       `gorm:"not null" json:"expense_category_id"`
	InstallDate       *time.Time `json:"install_date"`
	ExpiryDate        *time.Time `json:"expiry_date"`
	Subtotal          int64      `gorm:"not null" json:"subtotal"`
	TaxRate           int        `gorm:"not null;default:0" json:"tax_rate"`
	Total             int64      `gorm:"not null" json:"total"`
	PaymentStatus     string     `gorm:"not null;default:'DRAFT'" json:"payment_status"`
	PaymentProof      string     `json:"payment_proof"`
	CreatedBy         uint       `gorm:"not null" json:"created_by"`
	LastUpdatedBy     *uint      `json:"last_updated_by"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	// Associations
	Tractor           Tractor               `gorm:"foreignKey:TractorID" json:"tractor,omitempty"`
	ExpenseCategory   ExpenseCategory       `gorm:"foreignKey:ExpenseCategoryID" json:"expense_category,omitempty"`
	CreatedByUser     User                  `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
	LastUpdatedByUser *User                 `gorm:"foreignKey:LastUpdatedBy" json:"last_updated_by_user,omitempty"`
	Items             []TractorExpenseItem  `gorm:"foreignKey:TractorExpenseID" json:"items,omitempty"`
}