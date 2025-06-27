package models

import (
	"time"
)

type Expense struct {
	ID                uint       `gorm:"primarykey" json:"id"`
	TractorID         *uint      `json:"tractor_id"`
	TrailerID         *uint      `json:"trailer_id"`
	VendorName        string     `gorm:"not null" json:"vendor_name"`
	ExpenseCategoryID uint       `gorm:"not null" json:"expense_category_id"`
	Subtotal          int64      `gorm:"not null" json:"subtotal"`
	TaxRate           int        `gorm:"not null;default:0" json:"tax_rate"`
	Total             int64      `gorm:"not null" json:"total"`
	PaymentStatus     string     `gorm:"not null;default:'DRAFT'" json:"payment_status"`
	PaymentProof      string     `json:"payment_proof"`
	Currency          string     `gorm:"not null;default:'VND'" json:"currency"`
	Remark            string     `json:"remark"`
	CreatedBy         uint       `gorm:"not null" json:"created_by"`
	LastUpdatedBy     string     `gorm:"size:255" json:"last_updated_by"` // name (@username) of user who last created/updated the record
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	// Associations
	Tractor         *Tractor         `gorm:"foreignKey:TractorID" json:"tractor,omitempty"`
	Trailer         *Trailer         `gorm:"foreignKey:TrailerID" json:"trailer,omitempty"`
	ExpenseCategory ExpenseCategory  `gorm:"foreignKey:ExpenseCategoryID" json:"expense_category,omitempty"`
	CreatedByUser   User             `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
	Items           []ExpenseItem    `gorm:"foreignKey:ExpenseID" json:"items,omitempty"`
}