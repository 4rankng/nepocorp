package models

import (
	"time"
)

type ExpenseCategory struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Name          string    `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;not null" json:"name"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}
