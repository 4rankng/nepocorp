package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type Container struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Category      string    `gorm:"not null" json:"category"`
	CreatedAt     time.Time `json:"-"`
	UpdatedAt     time.Time `json:"-"`
	LastUpdatedBy string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}

// BeforeSave GORM hook to trim spaces from string fields
func (c *Container) BeforeSave(tx *gorm.DB) (err error) {
	c.Category = strings.TrimSpace(c.Category)
	return
}
