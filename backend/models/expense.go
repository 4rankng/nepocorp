package models

import (
	"time"
)

type Expense struct {
	ID                uint      `gorm:"primarykey" json:"id"`
	VendorName        string    `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;not null" json:"vendor_name"`
	ExpenseCategoryID uint      `gorm:"not null" json:"expense_category_id"`
	Total             int64     `gorm:"not null" json:"total"`
	PaymentStatus     string    `gorm:"not null;default:'DRAFT'" json:"payment_status"`
	PaymentProof      string    `json:"payment_proof"`
	Currency          string    `gorm:"not null;default:'VND'" json:"currency"`
	Remark            string    `json:"remark"`
	CancelReason      string    `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"cancel_reason"`
	CreatedBy         uint      `gorm:"not null" json:"created_by"`
	LastUpdatedBy     string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	// Associations
	ExpenseCategory ExpenseCategory `gorm:"foreignKey:ExpenseCategoryID" json:"expense_category,omitempty"`
	CreatedByUser   User            `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
	Items           []ExpenseItem   `gorm:"foreignKey:ExpenseID" json:"items,omitempty"`
}
