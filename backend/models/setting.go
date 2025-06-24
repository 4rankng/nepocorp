package models

import (
	"time"
)

type Setting struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Key           string    `gorm:"not null;unique" json:"key"`
	Value         string    `gorm:"not null" json:"value"`
	LastUpdatedBy uint      `gorm:"not null" json:"last_updated_by"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

	// Associations
	LastUpdatedByUser User `gorm:"foreignKey:LastUpdatedBy" json:"last_updated_by_user,omitempty"`
}