package models

import (
	"time"
)

type InvoiceItem struct {
	ID            uint       `gorm:"primaryKey" json:"id"`
	InvoiceID     uint       `gorm:"not null" json:"invoice_id"`
	LicensePlate  string     `gorm:"type:varchar(255);not null" json:"license_plate"`
	ItemName      string     `gorm:"type:varchar(255);not null" json:"item_name"`
	Price         int64      `gorm:"not null" json:"price"`
	Quantity      int        `gorm:"not null;default:1" json:"quantity"`
	TaxRate       float64    `gorm:"not null;default:0" json:"tax_rate"`
	Subtotal      int64      `gorm:"not null;default:0" json:"subtotal"`
	Total         int64      `gorm:"not null" json:"total"`
	ServiceDate   *time.Time `gorm:"type:datetime" json:"service_date"`
	Notes         string     `gorm:"type:text" json:"notes"`
	LastUpdatedBy string     `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"-"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"-"`

	// Relationships
	Invoice Invoice `gorm:"foreignKey:InvoiceID" json:"invoice,omitempty"`
}
