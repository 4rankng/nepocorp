package models

import (
	"time"
)

type Customer struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Name          string    `gorm:"type:varchar(255);not null" json:"name"`
	TaxCode       string    `gorm:"type:varchar(255);unique;not null" json:"tax_code"`
	Address       string    `gorm:"type:text" json:"address"`
	ContactPerson string    `gorm:"type:varchar(255)" json:"contact_person"`
	ContactPhone  string    `gorm:"type:varchar(50)" json:"contact_phone"`
	ContactEmail  string    `gorm:"type:varchar(255)" json:"contact_email"`
	Notes         string    `gorm:"type:text" json:"notes"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt     time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
