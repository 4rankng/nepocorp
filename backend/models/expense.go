package models

import (
	"database/sql/driver"
	"fmt"
	"time"
)

// DateOnly represents a date without time
type DateOnly struct {
	time.Time
}

// MarshalJSON implements json.Marshaler
func (d DateOnly) MarshalJSON() ([]byte, error) {
	return []byte(fmt.Sprintf(`"%s"`, d.Time.Format("2006-01-02"))), nil
}

// UnmarshalJSON implements json.Unmarshaler
func (d *DateOnly) UnmarshalJSON(data []byte) error {
	// Remove quotes from JSON string
	dateStr := string(data[1 : len(data)-1])
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return err
	}
	d.Time = t
	return nil
}

// Value implements driver.Valuer
func (d DateOnly) Value() (driver.Value, error) {
	return d.Time.Format("2006-01-02"), nil
}

// Scan implements sql.Scanner
func (d *DateOnly) Scan(value interface{}) error {
	if value == nil {
		*d = DateOnly{}
		return nil
	}

	switch v := value.(type) {
	case time.Time:
		*d = DateOnly{v}
	case string:
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			return err
		}
		*d = DateOnly{t}
	default:
		return fmt.Errorf("cannot scan %T into DateOnly", value)
	}
	return nil
}

type Expense struct {
	ID                uint      `gorm:"primarykey" json:"id"`
	ExpenseDate       DateOnly  `gorm:"type:date;not null" json:"expense_date"`
	VendorName        string    `gorm:"type:varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;not null" json:"vendor_name"`
	ExpenseCategoryID uint      `gorm:"not null" json:"expense_category_id"`
	Total             int64     `gorm:"not null" json:"total"`
	PaymentStatus     string    `gorm:"not null;default:'DRAFT'" json:"payment_status"`
	PaymentProof      string    `json:"payment_proof"`
	Currency          string    `gorm:"not null;default:'VND'" json:"currency"`
	Remark            string    `json:"remark"`
	CancelReason      string    `gorm:"type:text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci" json:"cancel_reason"`
	CreatedBy         uint      `gorm:"not null" json:"created_by"`
	LastUpdatedBy     string    `gorm:"type:varchar(255)" json:"last_updated_by"` // name (@username) of user who last created/updated the record
	CreatedAt         time.Time `json:"-"`
	UpdatedAt         time.Time `json:"-"`

	// Associations
	ExpenseCategory ExpenseCategory `gorm:"foreignKey:ExpenseCategoryID" json:"expense_category,omitempty"`
	CreatedByUser   User            `gorm:"foreignKey:CreatedBy" json:"created_by_user,omitempty"`
	Items           []ExpenseItem   `gorm:"foreignKey:ExpenseID" json:"items,omitempty"`
}
