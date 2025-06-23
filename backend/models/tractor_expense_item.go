package models

import (
	"time"
)

type TractorExpenseItem struct {
	ID               uint      `gorm:"primarykey" json:"id"`
	TractorExpenseID uint      `gorm:"not null" json:"tractor_expense_id"`
	ItemName         string    `gorm:"not null" json:"item_name"`
	Price            int64     `gorm:"not null" json:"price"`
	Quantity         int       `gorm:"not null;default:1" json:"quantity"`
	Total            int64     `gorm:"not null" json:"total"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}