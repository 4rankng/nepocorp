package models

import (
	"database/sql/driver"
	"encoding/json"
	"time"
)

type ActivityLog struct {
	ID             uint64    `gorm:"primarykey" json:"id"`
	UserID         uint      `gorm:"not null;index" json:"user_id"`
	Action         string    `gorm:"not null;index;size:100" json:"action"`
	Resource       string    `gorm:"index;size:100" json:"resource,omitempty"`
	ResourceID     string    `gorm:"index;size:100" json:"resource_id,omitempty"`
	IPAddress      string    `gorm:"size:45" json:"ip_address,omitempty"`
	UserAgent      string    `gorm:"type:text" json:"user_agent,omitempty"`
	RequestData    JSONMap   `gorm:"type:json" json:"request_data,omitempty"`
	ResponseStatus int       `json:"response_status,omitempty"`
	CreatedAt      time.Time `gorm:"index" json:"-"`
}

// JSONMap is a custom type for handling JSON data in GORM
type JSONMap map[string]interface{}

// Value implements the driver.Valuer interface
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// Scan implements the sql.Scanner interface
func (j *JSONMap) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, j)
}
