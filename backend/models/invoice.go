package models

import (
	"time"
)

type Invoice struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	CustomerID        uint      `gorm:"not null" json:"customer_id"`
	InvoiceCategoryID uint      `gorm:"not null" json:"invoice_category_id"`
	Total             int64     `gorm:"not null" json:"total"`
	PaymentStatus     string    `gorm:"type:varchar(50);not null;default:'DRAFT'" json:"payment_status"`
	PaymentProof      string    `gorm:"type:varchar(500)" json:"payment_proof"`
	Currency          string    `gorm:"type:varchar(50);not null;default:'VND'" json:"currency"`
	Remark            string    `gorm:"type:text" json:"remark"`
	CancelReason      string    `gorm:"type:text" json:"cancel_reason"`
	CreatedBy         uint      `gorm:"not null" json:"created_by"`
	LastUpdatedBy     string    `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt         time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relationships
	Customer        Customer        `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	InvoiceCategory InvoiceCategory `gorm:"foreignKey:InvoiceCategoryID" json:"invoice_category,omitempty"`
	CreatedByUser   User            `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
	Items           []InvoiceItem   `gorm:"foreignKey:InvoiceID" json:"items,omitempty"`
}
