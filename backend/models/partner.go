package models

import (
	"time"
)

type Partner struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"type:varchar(255);not null" json:"name"`
	TaxCode   string    `gorm:"type:varchar(255);unique;not null" json:"tax_code"`
	Address   string    `gorm:"type:text" json:"address"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
