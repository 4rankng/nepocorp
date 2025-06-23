package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type TractorExpenseRepository struct {
	db *gorm.DB
}

func NewTractorExpenseRepository(db *gorm.DB) *TractorExpenseRepository {
	return &TractorExpenseRepository{db: db}
}

func (r *TractorExpenseRepository) Create(expense *models.TractorExpense) error {
	return r.db.Create(expense).Error
}

func (r *TractorExpenseRepository) FindByID(id uint) (*models.TractorExpense, error) {
	var expense models.TractorExpense
	err := r.db.Preload("Tractor").
		Preload("ExpenseCategory").
		Preload("CreatedByUser").
		Preload("Items").
		First(&expense, id).Error
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *TractorExpenseRepository) Update(expense *models.TractorExpense) error {
	return r.db.Save(expense).Error
}

func (r *TractorExpenseRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete items first (though CASCADE should handle this)
		if err := tx.Where("tractor_expense_id = ?", id).Delete(&models.TractorExpenseItem{}).Error; err != nil {
			return err
		}
		// Delete the expense
		return tx.Delete(&models.TractorExpense{}, id).Error
	})
}

func (r *TractorExpenseRepository) List(offset, limit int) ([]*models.TractorExpense, error) {
	var expenses []*models.TractorExpense
	query := r.db.Preload("Tractor").
		Preload("ExpenseCategory").
		Preload("CreatedByUser")
	
	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}
	
	err := query.Find(&expenses).Error
	return expenses, err
}

func (r *TractorExpenseRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.TractorExpense{}).Count(&count).Error
	return count, err
}

// Item-related methods
func (r *TractorExpenseRepository) CreateItem(item *models.TractorExpenseItem) error {
	return r.db.Create(item).Error
}

func (r *TractorExpenseRepository) UpdateItem(item *models.TractorExpenseItem) error {
	return r.db.Save(item).Error
}

func (r *TractorExpenseRepository) DeleteItem(expenseID, itemID uint) error {
	return r.db.Where("id = ? AND tractor_expense_id = ?", itemID, expenseID).
		Delete(&models.TractorExpenseItem{}).Error
}

func (r *TractorExpenseRepository) FindItemByID(expenseID, itemID uint) (*models.TractorExpenseItem, error) {
	var item models.TractorExpenseItem
	err := r.db.Where("id = ? AND tractor_expense_id = ?", itemID, expenseID).
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}