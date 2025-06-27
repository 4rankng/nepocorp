package models

import (
	"time"
)

type Tractor struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	LicensePlate  string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"license_plate"`
	Description   string    `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"description"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}