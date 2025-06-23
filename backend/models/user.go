package models

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primarykey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`

	Username string `gorm:"type:varchar(255);uniqueIndex;not null" json:"username"`
	Email    string `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password string `gorm:"type:varchar(255);not null" json:"-"`
	Name     string `gorm:"type:varchar(255)" json:"name"`
	Role     string `gorm:"not null;default:'driver'" json:"role"` // admin, driver, accountant, handler
	IsActive bool   `gorm:"default:true" json:"is_active"`
}
