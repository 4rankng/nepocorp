package models

import (
	"encoding/json"
	"strconv"
	"time"
)

type ExpenseItem struct {
	ID          uint       `gorm:"primarykey;autoIncrement" json:"id"`
	ExpenseID   uint       `gorm:"not null" json:"expense_id"`
	ItemName    string     `gorm:"not null" json:"item_name"`
	Price       int64      `gorm:"not null" json:"price"`
	Quantity    int        `gorm:"not null;default:1" json:"quantity"`
	Total       int64      `gorm:"not null" json:"total"`
	InstallDate *time.Time `json:"install_date"`
	ExpiryDate  *time.Time `json:"expiry_date"`
	CreatedAt   time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt   time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (e *ExpenseItem) UnmarshalJSON(data []byte) error {
	type Alias ExpenseItem
	aux := &struct {
		Price       any `json:"price"`
		Quantity    any `json:"quantity"`
		InstallDate any `json:"install_date"`
		ExpiryDate  any `json:"expiry_date"`
		*Alias
	}{
		Alias: (*Alias)(e),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	// Handle Price conversion
	switch v := aux.Price.(type) {
	case string:
		if v != "" {
			price, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return err
			}
			e.Price = price
		}
	case float64:
		e.Price = int64(v)
	case int64:
		e.Price = v
	case int:
		e.Price = int64(v)
	}

	// Handle Quantity conversion
	switch v := aux.Quantity.(type) {
	case string:
		if v != "" {
			quantity, err := strconv.Atoi(v)
			if err != nil {
				return err
			}
			e.Quantity = quantity
		}
	case float64:
		e.Quantity = int(v)
	case int:
		e.Quantity = v
	}

	// Handle InstallDate conversion
	if aux.InstallDate != nil {
		switch v := aux.InstallDate.(type) {
		case string:
			if v != "" {
				installDate, err := time.Parse("2006-01-02", v)
				if err != nil {
					// Try with datetime format
					installDate, err = time.Parse("2006-01-02T15:04:05Z07:00", v)
					if err != nil {
						return err
					}
				}
				e.InstallDate = &installDate
			}
		}
	}

	// Handle ExpiryDate conversion
	if aux.ExpiryDate != nil {
		switch v := aux.ExpiryDate.(type) {
		case string:
			if v != "" {
				expiryDate, err := time.Parse("2006-01-02", v)
				if err != nil {
					// Try with datetime format
					expiryDate, err = time.Parse("2006-01-02T15:04:05Z07:00", v)
					if err != nil {
						return err
					}
				}
				e.ExpiryDate = &expiryDate
			}
		}
	}

	return nil
}