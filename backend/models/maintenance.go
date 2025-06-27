package models

import (
	"encoding/json"
	"strconv"
	"time"

	"gorm.io/gorm"
)

type Maintenance struct {
	ID           uint       `gorm:"primarykey;autoIncrement" json:"id"`
	ExpenseID    uint       `gorm:"not null" json:"expense_id"`
	LicensePlate string     `gorm:"not null;size:255" json:"license_plate"`
	VendorName   string     `gorm:"not null;size:255" json:"vendor_name"`
	ItemName     string     `gorm:"not null;size:255" json:"item_name"`
	Price        int64      `gorm:"not null" json:"price"`
	Quantity     int        `gorm:"not null" json:"quantity"`
	TaxRate      float64    `gorm:"not null;default:0" json:"tax_rate"`
	Total        int64      `gorm:"not null" json:"total"`
	InstallDate  *time.Time `json:"install_date"`
	ExpiryDate   *time.Time `json:"expiry_date"`
	LastUpdatedBy string     `gorm:"size:255" json:"last_updated_by"` // name (@username) of user who last created/updated the record
	CreatedAt     time.Time  `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt     time.Time  `gorm:"autoUpdateTime" json:"updated_at"`
}

func (m *Maintenance) UnmarshalJSON(data []byte) error {
	type Alias Maintenance
	aux := &struct {
		Price       any `json:"price"`
		Quantity    any `json:"quantity"`
		TaxRate     any `json:"tax_rate"`
		InstallDate any `json:"install_date"`
		ExpiryDate  any `json:"expiry_date"`
		*Alias
	}{
		Alias: (*Alias)(m),
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
			m.Price = price
		}
	case float64:
		m.Price = int64(v)
	case int64:
		m.Price = v
	case int:
		m.Price = int64(v)
	}

	// Handle Quantity conversion
	switch v := aux.Quantity.(type) {
	case string:
		if v != "" {
			quantity, err := strconv.Atoi(v)
			if err != nil {
				return err
			}
			m.Quantity = quantity
		}
	case float64:
		m.Quantity = int(v)
	case int:
		m.Quantity = v
	}

	// Handle TaxRate conversion
	switch v := aux.TaxRate.(type) {
	case string:
		if v != "" {
			taxRate, err := strconv.ParseFloat(v, 64)
			if err != nil {
				return err
			}
			m.TaxRate = taxRate
		}
	case float64:
		m.TaxRate = v
	case int:
		m.TaxRate = float64(v)
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
				m.InstallDate = &installDate
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
				m.ExpiryDate = &expiryDate
			}
		}
	}

	return nil
}

// CalculateTotal calculates the total amount including tax
func (m *Maintenance) CalculateTotal() {
	m.Total = int64(float64(m.Price*int64(m.Quantity)) * (1 + m.TaxRate/100))
}

// BeforeSave hook to calculate total before saving
func (m *Maintenance) BeforeSave(tx *gorm.DB) error {
	m.CalculateTotal()
	return nil
}