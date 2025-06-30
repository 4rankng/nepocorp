package models

import (
	"strings"
	"time"

	"gorm.io/gorm"
)

type Tractor struct {
	ID                    uint       `gorm:"primarykey" json:"id"`
	LicensePlate          string     `gorm:"type:varchar(50);not null" json:"license_plate"`
	Make                  *string    `gorm:"type:varchar(100)" json:"make"`        // Manufacturer, e.g., Howo, Freightliner
	Model                 *string    `gorm:"type:varchar(100)" json:"model"`       // Tractor model
	YearOfManufacture     *int       `gorm:"type:year" json:"year_of_manufacture"` // Year of manufacture
	InspectionDueDate     *time.Time `gorm:"type:date" json:"inspection_due_date"` // Due date for next vehicle inspection (đăng kiểm)
	RoadFeeDueDate        *time.Time `gorm:"type:date" json:"road_fee_due_date"`   // Due date for next road maintenance fee payment (phí đường bộ)
	InsurancePolicyNumber *string    `gorm:"type:varchar(100)" json:"insurance_policy_number"`
	InsuranceExpiryDate   *time.Time `gorm:"type:date" json:"insurance_expiry_date"` // Date when the current insurance policy expires
	Remark                *string    `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"remark"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at"`
	LastUpdatedBy         string     `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
}

// BeforeSave GORM hook to trim spaces from string fields
func (t *Tractor) BeforeSave(tx *gorm.DB) (err error) {
	t.LicensePlate = strings.TrimSpace(t.LicensePlate)
	if t.Make != nil {
		trimmed := strings.TrimSpace(*t.Make)
		t.Make = &trimmed
	}
	if t.Model != nil {
		trimmed := strings.TrimSpace(*t.Model)
		t.Model = &trimmed
	}
	if t.InsurancePolicyNumber != nil {
		trimmed := strings.TrimSpace(*t.InsurancePolicyNumber)
		t.InsurancePolicyNumber = &trimmed
	}
	if t.Remark != nil {
		trimmed := strings.TrimSpace(*t.Remark)
		t.Remark = &trimmed
	}
	return
}
