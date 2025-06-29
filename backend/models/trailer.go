package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type Trailer struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	LicensePlate  string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"license_plate"`
	Description   string    `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"description"`
	CreatedAt     time.Time `json:"-"`
	UpdatedAt     time.Time `json:"-"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}

// BeforeSave GORM hook to trim spaces from string fields
func (t *Trailer) BeforeSave(tx *gorm.DB) (err error) {
	t.LicensePlate = strings.TrimSpace(t.LicensePlate)
	t.Description = strings.TrimSpace(t.Description)
	return
}
