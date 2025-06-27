package models

import (
	"time"
)

type User struct {
	ID        uint      `gorm:"primarykey" json:"id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Username      string `gorm:"type:varchar(255);uniqueIndex;not null" json:"username"`
	Email         string `gorm:"type:varchar(255);uniqueIndex;not null" json:"email"`
	Password      string `gorm:"type:varchar(255);not null" json:"-"`
	Name          string `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"name"`
	Role          string `gorm:"not null;default:'driver'" json:"role"` // admin, driver, accountant, handler
	IsActive      bool   `gorm:"default:true" json:"is_active"`
	LastUpdatedBy string `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}
