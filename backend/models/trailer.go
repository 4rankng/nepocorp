package models

import (
	"time"
)

type Trailer struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	LicensePlate string    `gorm:"not null" json:"license_plate"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}