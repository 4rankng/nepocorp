package models

import (
	"time"
)

type Route struct {
	ID               uint      `gorm:"primaryKey" json:"id"`
	Name             string    `gorm:"type:varchar(255);unique;not null" json:"name"`
	BaseFee40ft      float64   `gorm:"type:decimal(15,2);default:0.00" json:"base_fee_40ft"`
	BaseFee20ft      float64   `gorm:"type:decimal(15,2);default:0.00" json:"base_fee_20ft"`
	Surcharge        float64   `gorm:"type:decimal(15,2);default:0.00" json:"surcharge"`
	Discount         float64   `gorm:"type:decimal(15,2);default:0.00" json:"discount"`
	IsTwoWayCombined bool      `gorm:"default:false" json:"is_two_way_combined"`
	Notes            string    `gorm:"type:text" json:"notes"`
	CreatedAt        time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime" json:"-"`
}
