package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type ExpenseCategoryRepository struct {
	db *gorm.DB
}

func NewExpenseCategoryRepository(db *gorm.DB) *ExpenseCategoryRepository {
	return &ExpenseCategoryRepository{db: db}
}

func (r *ExpenseCategoryRepository) Create(category *models.ExpenseCategory) error {
	return r.db.Create(category).Error
}

func (r *ExpenseCategoryRepository) FindByID(id uint) (*models.ExpenseCategory, error) {
	var category models.ExpenseCategory
	err := r.db.First(&category, id).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *ExpenseCategoryRepository) Update(category *models.ExpenseCategory) error {
	return r.db.Save(category).Error
}

func (r *ExpenseCategoryRepository) Delete(id uint) error {
	return r.db.Delete(&models.ExpenseCategory{}, id).Error
}

func (r *ExpenseCategoryRepository) List(offset, limit int) ([]*models.ExpenseCategory, error) {
	var categories []*models.ExpenseCategory
	query := r.db

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&categories).Error
	return categories, err
}

func (r *ExpenseCategoryRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.ExpenseCategory{}).Count(&count).Error
	return count, err
}

func (r *ExpenseCategoryRepository) FindByName(name string) (*models.ExpenseCategory, error) {
	var category models.ExpenseCategory
	err := r.db.Where("name = ?", name).First(&category).Error
	if err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *ExpenseCategoryRepository) EnsureBaoDuongExists() error {
	// Check if "Bao duong" category with ID=1 exists
	var category models.ExpenseCategory
	err := r.db.First(&category, 1).Error
	if err == nil {
		// Category with ID=1 exists, check if it's "Bao duong"
		if category.Name != "Bao duong" {
			// Update existing category to "Bao duong"
			category.Name = "Bao duong"
			return r.db.Save(&category).Error
		}
		return nil
	}

	// Category with ID=1 doesn't exist, create it
	baoDuongCategory := &models.ExpenseCategory{
		ID:   1,
		Name: "Bao duong",
	}
	return r.db.Create(baoDuongCategory).Error
}
