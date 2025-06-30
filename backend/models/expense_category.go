package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type ExpenseCategory struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Name          string    `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;not null;uniqueIndex:uk_expense_categories_name" json:"name"` // Vietnamese name (unique)
	Description   *string   `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"description"`                                                  // Detailed description
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}

// BeforeSave GORM hook to trim spaces from string fields
func (ec *ExpenseCategory) BeforeSave(tx *gorm.DB) (err error) {
	ec.Name = strings.TrimSpace(ec.Name)
	if ec.Description != nil {
		trimmed := strings.TrimSpace(*ec.Description)
		ec.Description = &trimmed
	}
	return
}
