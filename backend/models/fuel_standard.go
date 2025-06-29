package models

import (
	"time"
)

type FuelStandard struct {
	ID                    uint      `gorm:"primaryKey" json:"id"`
	TractorID             uint      `gorm:"not null" json:"tractor_id"`
	TrailerType           string    `gorm:"type:enum('20ft','40ft');not null" json:"trailer_type"`
	LoadCategory          string    `gorm:"type:enum('under_20t','over_20t','empty');not null" json:"load_category"`
	ConsumptionRate       float64   `gorm:"type:decimal(5,2);not null" json:"consumption_rate"`
	SurchargeRateMountain float64   `gorm:"type:decimal(5,2);default:0.00" json:"surcharge_rate_mountain"`
	Notes                 string    `gorm:"type:text" json:"notes"`
	CreatedAt             time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt             time.Time `gorm:"autoUpdateTime" json:"-"`

	// Associations
	Tractor Tractor `gorm:"foreignKey:TractorID" json:"tractor,omitempty"`
}
