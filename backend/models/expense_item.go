package models

import (
	"encoding/json"
	"strconv"
	"time"
)

type ExpenseItem struct {
	ID            uint       `gorm:"primarykey;autoIncrement" json:"id"`
	ExpenseID     uint       `gorm:"not null" json:"expense_id"`
	LicensePlate  string     `gorm:"type:varchar(255);not null" json:"license_plate"`
	ItemName      string     `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;not null" json:"item_name"`
	Price         int64      `gorm:"not null" json:"price"`
	Quantity      int        `gorm:"not null;default:1" json:"quantity"`
	TaxRate       float64    `gorm:"not null;default:0" json:"tax_rate"`
	Subtotal      int64      `gorm:"not null;default:0" json:"subtotal"`
	Total         int64      `gorm:"not null" json:"total"`
	InstallDate   *time.Time `json:"install_date"`
	ExpiryDate    *time.Time `json:"expiry_date"`
	LastUpdatedBy string     `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"-"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"-"`
}

func (e *ExpenseItem) UnmarshalJSON(data []byte) error {
	type Alias ExpenseItem
	aux := &struct {
		Price       any `json:"price"`
		Quantity    any `json:"quantity"`
		TaxRate     any `json:"tax_rate"`
		Subtotal    any `json:"subtotal"`
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

	// Handle TaxRate conversion
	switch v := aux.TaxRate.(type) {
	case string:
		if v != "" {
			taxRate, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return err
			}
			e.TaxRate = taxRate
		}
	case float64:
		e.TaxRate = v
	case int:
		e.TaxRate = float64(v)
	}

	// Handle Subtotal conversion
	switch v := aux.Subtotal.(type) {
	case string:
		if v != "" {
			subtotal, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				return err
			}
			e.Subtotal = subtotal
		}
	case float64:
		e.Subtotal = int64(v)
	case int64:
		e.Subtotal = v
	case int:
		e.Subtotal = int64(v)
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
