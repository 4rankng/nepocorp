package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type ExpenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) *ExpenseRepository {
	return &ExpenseRepository{db: db}
}

func (r *ExpenseRepository) Create(expense *models.Expense) error {
	// GORM will automatically create associated items when creating the expense
	return r.db.Create(expense).Error
}

func (r *ExpenseRepository) FindByID(id uint) (*models.Expense, error) {
	var expense models.Expense
	err := r.db.Preload("ExpenseCategory").
		Preload("CreatedByUser").
		Preload("Items").
		First(&expense, id).Error
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *ExpenseRepository) Update(expense *models.Expense) error {
	return r.db.Save(expense).Error
}

func (r *ExpenseRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete items first (though CASCADE should handle this)
		if err := tx.Where("expense_id = ?", id).Delete(&models.ExpenseItem{}).Error; err != nil {
			return err
		}
		// Delete the expense
		return tx.Delete(&models.Expense{}, id).Error
	})
}

func (r *ExpenseRepository) List(offset, limit int) ([]*models.Expense, error) {
	var expenses []*models.Expense
	query := r.db.Preload("ExpenseCategory").
		Preload("CreatedByUser")

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&expenses).Error
	return expenses, err
}

func (r *ExpenseRepository) ListWithFilters(offset, limit int, filters map[string]string) ([]*models.Expense, error) {
	var expenses []*models.Expense
	query := r.db.Preload("ExpenseCategory").
		Preload("CreatedByUser")

	// Apply filters
	if expenseCategoryID := filters["expense_category_id"]; expenseCategoryID != "" {
		query = query.Where("expense_category_id = ?", expenseCategoryID)
	}
	if paymentStatus := filters["payment_status"]; paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&expenses).Error
	return expenses, err
}

func (r *ExpenseRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Expense{}).Count(&count).Error
	return count, err
}

func (r *ExpenseRepository) CountWithFilters(filters map[string]string) (int64, error) {
	var count int64
	query := r.db.Model(&models.Expense{})

	// Apply filters
	if expenseCategoryID := filters["expense_category_id"]; expenseCategoryID != "" {
		query = query.Where("expense_category_id = ?", expenseCategoryID)
	}
	if paymentStatus := filters["payment_status"]; paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	err := query.Count(&count).Error
	return count, err
}

// Item-related methods
func (r *ExpenseRepository) CreateItem(item *models.ExpenseItem) error {
	return r.db.Create(item).Error
}

func (r *ExpenseRepository) UpdateItem(item *models.ExpenseItem) error {
	return r.db.Save(item).Error
}

func (r *ExpenseRepository) DeleteItem(expenseID, itemID uint) error {
	return r.db.Where("id = ? AND expense_id = ?", itemID, expenseID).
		Delete(&models.ExpenseItem{}).Error
}

func (r *ExpenseRepository) FindItemByID(expenseID, itemID uint) (*models.ExpenseItem, error) {
	var item models.ExpenseItem
	err := r.db.Where("id = ? AND expense_id = ?", itemID, expenseID).
		First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}
