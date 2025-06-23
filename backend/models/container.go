package models

import (
	"time"
)

type Container struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	Category  string    `gorm:"not null" json:"category"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}