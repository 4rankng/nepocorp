package models

import (
	"time"
)

type Setting struct {
	ID            uint      `gorm:"primarykey" json:"id"`
	Key           string    `gorm:"not null;unique" json:"key"`
	Value         string    `gorm:"not null" json:"value"`
	LastUpdatedBy string    `gorm:"not null" json:"last_updated_by"` // name (username) of users who last created/updated the record
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`

}
