package models

import (
	"time"
)

type FinancialLedger struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	TransactionDate time.Time `gorm:"type:date;not null" json:"transaction_date"`
	CustomerID      *uint     `json:"customer_id"`
	PartnerID       *uint     `json:"partner_id"`
	JobID           *uint     `json:"job_id"`
	TransactionType string    `gorm:"type:enum('INVOICE','PAYMENT_RECEIVED','PARTNER_PAYMENT','PARTNER_INVOICE','OPENING_BALANCE','ADJUSTMENT');not null" json:"transaction_type"`
	Debit           float64   `gorm:"type:decimal(15,2);default:0.00" json:"debit"`
	Credit          float64   `gorm:"type:decimal(15,2);default:0.00" json:"credit"`
	ReferenceNumber string    `gorm:"type:varchar(100)" json:"reference_number"`
	Notes           string    `gorm:"type:text" json:"notes"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Partner  *Partner  `gorm:"foreignKey:PartnerID" json:"partner,omitempty"`
	Job      *Job      `gorm:"foreignKey:JobID" json:"job,omitempty"`
}
