package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type InvoiceCategoryRepository struct {
	db *gorm.DB
}

func NewInvoiceCategoryRepository(db *gorm.DB) *InvoiceCategoryRepository {
	return &InvoiceCategoryRepository{db: db}
}

func (r *InvoiceCategoryRepository) GetAll() ([]models.InvoiceCategory, error) {
	var categories []models.InvoiceCategory
	err := r.db.Order("name ASC").Find(&categories).Error
	return categories, err
}

func (r *InvoiceCategoryRepository) GetByID(id uint) (*models.InvoiceCategory, error) {
	var category models.InvoiceCategory
	err := r.db.First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *InvoiceCategoryRepository) Create(category *models.InvoiceCategory) error {
	return r.db.Create(category).Error
}

func (r *InvoiceCategoryRepository) Update(category *models.InvoiceCategory) error {
	return r.db.Save(category).Error
}

func (r *InvoiceCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&models.InvoiceCategory{}, id).Error
}
