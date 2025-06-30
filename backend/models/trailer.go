package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type Trailer struct {
	ID                uint      `gorm:"primarykey" json:"id"`
	LicensePlate      string    `gorm:"type:varchar(50);not null" json:"license_plate"`
	Type              *string   `gorm:"type:varchar(255)" json:"type"`  // Trailer type, critical for job pricing eg 20FT, 40FT
	Make              *string   `gorm:"type:varchar(100)" json:"make"`  // Manufacturer of the trailer
	Model             *string   `gorm:"type:varchar(100)" json:"model"` // Model of the trailer
	YearOfManufacture *int      `gorm:"type:year" json:"year_of_manufacture"`
	Remark            *string   `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"remark"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	LastUpdatedBy     string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}

// BeforeSave GORM hook to trim spaces from string fields
func (t *Trailer) BeforeSave(tx *gorm.DB) (err error) {
	t.LicensePlate = strings.TrimSpace(t.LicensePlate)
	if t.Type != nil {
		trimmed := strings.TrimSpace(*t.Type)
		t.Type = &trimmed
	}
	if t.Make != nil {
		trimmed := strings.TrimSpace(*t.Make)
		t.Make = &trimmed
	}
	if t.Model != nil {
		trimmed := strings.TrimSpace(*t.Model)
		t.Model = &trimmed
	}
	if t.Remark != nil {
		trimmed := strings.TrimSpace(*t.Remark)
		t.Remark = &trimmed
	}
	return
}
