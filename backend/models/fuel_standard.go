package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type FuelStandard struct {
	ID                    uint      `gorm:"primarykey" json:"id"`
	TractorID             uint      `gorm:"not null" json:"tractor_id"`
	TrailerType           string    `gorm:"type:varchar(255);not null" json:"trailer_type"`
	LoadCategory          string    `gorm:"type:enum('under_20t','over_20t','empty');not null" json:"load_category"`
	ConsumptionRate       float64   `gorm:"type:decimal(5,2);not null" json:"consumption_rate"`
	SurchargeRateMountain float64   `gorm:"type:decimal(5,2);default:0.00" json:"surcharge_rate_mountain"`
	Notes                 *string   `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"notes"`
	LastUpdatedBy         string    `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt             time.Time `json:"created_at"`
	UpdatedAt             time.Time `json:"updated_at"`

	// Foreign key relationship
	Tractor Tractor `gorm:"foreignKey:TractorID" json:"tractor,omitempty"`
}

// BeforeSave GORM hook to trim spaces from string fields
func (fs *FuelStandard) BeforeSave(tx *gorm.DB) (err error) {
	fs.TrailerType = strings.TrimSpace(fs.TrailerType)
	fs.LoadCategory = strings.TrimSpace(fs.LoadCategory)
	if fs.Notes != nil {
		trimmed := strings.TrimSpace(*fs.Notes)
		fs.Notes = &trimmed
	}
	return
}
