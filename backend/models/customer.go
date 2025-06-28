package models

type Customer struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	Name      string `gorm:"type:varchar(255);not null" json:"name"`
	TaxCode   string `gorm:"type:varchar(255);unique;not null" json:"tax_code"`
	Address   string `gorm:"type:text" json:"address"`
	CreatedAt Time   `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt Time   `gorm:"autoUpdateTime" json:"updated_at"`
}
