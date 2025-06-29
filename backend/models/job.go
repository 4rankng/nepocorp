package models

import (
	"time"
)

type Job struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	JobDate         time.Time `gorm:"type:date;not null" json:"job_date"`
	TractorID       uint      `gorm:"not null" json:"tractor_id"`
	TrailerID       *uint     `json:"trailer_id"`
	UserIDDriver    *uint     `json:"user_id_driver"`
	CustomerID      *uint     `json:"customer_id"`
	RouteID         *uint     `json:"route_id"`
	ContainerNumber string    `gorm:"type:varchar(50)" json:"container_number"`
	Description     string    `gorm:"type:text;not null" json:"description"`
	DistanceKm      *uint     `json:"distance_km"`
	Revenue         float64   `gorm:"type:decimal(15,2);default:0.00" json:"revenue"`
	Status          string    `gorm:"type:enum('DRAFT','PLANNED','IN_PROGRESS','COMPLETED','CANCELLED');default:'PLANNED'" json:"status"`
	LastUpdatedBy   string    `gorm:"type:varchar(255)" json:"last_updated_by"`
	CreatedAt       time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Associations
	Tractor  Tractor   `gorm:"foreignKey:TractorID" json:"tractor,omitempty"`
	Trailer  *Trailer  `gorm:"foreignKey:TrailerID" json:"trailer,omitempty"`
	Driver   *User     `gorm:"foreignKey:UserIDDriver" json:"driver,omitempty"`
	Customer *Customer `gorm:"foreignKey:CustomerID" json:"customer,omitempty"`
	Route    *Route    `gorm:"foreignKey:RouteID" json:"route,omitempty"`
}
