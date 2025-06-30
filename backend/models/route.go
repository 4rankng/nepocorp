package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type Route struct {
	ID               uint      `gorm:"primarykey" json:"id"`
	Name             string    `gorm:"type:varchar(255);not null;uniqueIndex" json:"name"`
	TrailerType      string    `gorm:"type:varchar(255);not null" json:"trailer_type"`
	BaseFee          float64   `gorm:"type:decimal(15,2);default:0.00" json:"base_fee"`
	Surcharge        float64   `gorm:"type:decimal(15,2);default:0.00" json:"surcharge"`
	Discount         float64   `gorm:"type:decimal(15,2);default:0.00" json:"discount"`
	IsTwoWayCombined bool      `gorm:"default:false" json:"is_two_way_combined"`
	Notes            *string   `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"notes"`
	LastUpdatedBy    string    `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// BeforeSave GORM hook to trim spaces from string fields
func (r *Route) BeforeSave(tx *gorm.DB) (err error) {
	r.Name = strings.TrimSpace(r.Name)
	r.TrailerType = strings.TrimSpace(r.TrailerType)
	if r.Notes != nil {
		trimmed := strings.TrimSpace(*r.Notes)
		r.Notes = &trimmed
	}
	return
}
