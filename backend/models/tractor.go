package models

import (
	"time"
)

type Tractor struct {
	ID           uint      `gorm:"primarykey" json:"id"`
	LicensePlate string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"license_plate"`
	Description  string    `json:"description"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}