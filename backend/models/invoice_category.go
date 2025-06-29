package models

import (
	"time"
)

type InvoiceCategory struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"type:varchar(255);not null" json:"name"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"-"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"-"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"`
}
