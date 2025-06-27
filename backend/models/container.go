package models

import (
	"time"
)

type Container struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Category      string    `gorm:"not null" json:"category"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	LastUpdatedBy string    `gorm:"size:255" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}