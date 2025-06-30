package controllers

import (
	"errors"
	"strings"

	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type ExpenseController struct {
	repo         *repositories.ExpenseRepository
	categoryRepo *repositories.ExpenseCategoryRepository
}

type UpdateExpenseRequest struct {
	VendorName        *string                    `json:"vendor_name,omitempty"`
	ExpenseCategoryID *uint                      `json:"expense_category_id,omitempty"`
	PaymentStatus     *string                    `json:"payment_status,omitempty"`
	PaymentProof      *string                    `json:"payment_proof,omitempty"`
	CancelReason      *string                    `json:"cancel_reason,omitempty"`
	Remark            *string                    `json:"remark,omitempty"`
	Currency          *string                    `json:"currency,omitempty"`
	Total             *int64                     `json:"total,omitempty"`
	Items             []UpdateExpenseItemRequest `json:"items,omitempty"`
}

type UpdateExpenseItemRequest struct {
	ID            uint       `json:"id"`
	ExpenseID     uint       `json:"expense_id,omitempty"`
	ItemName      *string    `json:"item_name,omitempty"`
	Price         *int64     `json:"price,omitempty"`
	Quantity      *int       `json:"quantity,omitempty"`
	LicensePlate  *string    `json:"license_plate,omitempty"`
	TaxRate       *float64   `json:"tax_rate,omitempty"`
	Subtotal      *int64     `json:"subtotal,omitempty"`
	Total         *int64     `json:"total,omitempty"`
	InstallDate   *string    `json:"install_date,omitempty"`
	ExpiryDate    *string    `json:"expiry_date,omitempty"`
	LastUpdatedBy *string    `json:"last_updated_by,omitempty"`
}

var validPaymentStatuses = []string{"DRAFT", "PENDING", "PAID", "CANCELLED"}

func NewExpenseController(repo *repositories.ExpenseRepository, categoryRepo *repositories.ExpenseCategoryRepository) *ExpenseController {
	return &ExpenseController{
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func (c *ExpenseController) isValidPaymentStatus(status string) bool {
	status = strings.ToUpper(status)
	for _, validStatus := range validPaymentStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

func (c *ExpenseController) UpdateExpense(id uint, request *UpdateExpenseRequest, userInfo *utils.UserInfo) (*models.Expense, error) {
	// Verify expense exists
	_, err := c.repo.FindByID(id)
	if err != nil {
		return nil, err
	}

	// Build selective update map - only include fields that are provided and valid
	updates := make(map[string]interface{})

	// Validate and process vendor name
	if request.VendorName != nil && *request.VendorName != "" {
		updates["vendor_name"] = *request.VendorName
	}

	// Validate and process expense category ID
	if request.ExpenseCategoryID != nil && *request.ExpenseCategoryID > 0 {
		// Validate that the expense category exists
		_, err := c.categoryRepo.FindByID(*request.ExpenseCategoryID)
		if err != nil {
			return nil, err
		}
		updates["expense_category_id"] = *request.ExpenseCategoryID
	}

	// Validate and process payment status
	if request.PaymentStatus != nil && *request.PaymentStatus != "" {
		if !c.isValidPaymentStatus(*request.PaymentStatus) {
			return nil, errors.New("Payment status must be one of: DRAFT, PENDING, PAID, CANCELLED")
		}
		updates["payment_status"] = *request.PaymentStatus
	}

	// Process other fields
	if request.PaymentProof != nil {
		updates["payment_proof"] = *request.PaymentProof
	}
	if request.CancelReason != nil {
		updates["cancel_reason"] = *request.CancelReason
	}
	if request.Remark != nil {
		updates["remark"] = *request.Remark
	}
	if request.Currency != nil && *request.Currency != "" {
		updates["currency"] = *request.Currency
	}
	if request.Total != nil {
		updates["total"] = *request.Total
	}

	// Set audit trail
	updates["last_updated_by"] = utils.FormatLastUpdatedByUserInfo(userInfo)

	// Handle item updates if provided
	if len(request.Items) > 0 {
		err := c.processItemUpdates(id, request.Items, userInfo)
		if err != nil {
			// Log error but continue with expense update
			// In a production system, you might want to handle this differently
		}
	}

	// Update only the fields that were provided
	if err := c.repo.UpdateFields(id, updates); err != nil {
		return nil, err
	}

	// Fetch and return the updated expense
	return c.repo.FindByID(id)
}

func (c *ExpenseController) processItemUpdates(expenseID uint, items []UpdateExpenseItemRequest, userInfo *utils.UserInfo) error {
	formattedUser := utils.FormatLastUpdatedByUserInfo(userInfo)

	// Process item updates
	for _, item := range items {
		if item.ID > 0 {
			// Find existing item
			existingItem, err := c.repo.FindItemByID(expenseID, item.ID)
			if err != nil {
				continue // Skip invalid items
			}

			// Update item fields
			if item.ItemName != nil && *item.ItemName != "" {
				existingItem.ItemName = *item.ItemName
			}
			if item.Price != nil && *item.Price > 0 {
				existingItem.Price = *item.Price
			}
			if item.Quantity != nil && *item.Quantity > 0 {
				existingItem.Quantity = *item.Quantity
			}
			if item.LicensePlate != nil && *item.LicensePlate != "" {
				existingItem.LicensePlate = *item.LicensePlate
			}
			if item.TaxRate != nil && *item.TaxRate >= 0 {
				existingItem.TaxRate = *item.TaxRate
			}
			if item.Subtotal != nil && *item.Subtotal >= 0 {
				existingItem.Subtotal = *item.Subtotal
			}
			if item.Total != nil && *item.Total > 0 {
				existingItem.Total = *item.Total
			}

			// Set last_updated_by for item
			existingItem.LastUpdatedBy = formattedUser

			// Update the item
			if err := c.repo.UpdateItem(existingItem); err != nil {
				// Log error but continue with other items
				continue
			}
		}
	}

	return nil
}

func (c *ExpenseController) CreateExpense(expense *models.Expense) error {
	// Business logic for creating expense would go here
	// For now, delegate to repository
	return c.repo.Create(expense)
}

func (c *ExpenseController) GetExpenseByID(id uint) (*models.Expense, error) {
	return c.repo.FindByID(id)
}

func (c *ExpenseController) DeleteExpense(id uint) error {
	// Verify expense exists first
	_, err := c.repo.FindByID(id)
	if err != nil {
		return err
	}
	
	return c.repo.Delete(id)
}

func (c *ExpenseController) ListExpensesWithFilters(offset, limit int, filters map[string]string) ([]*models.Expense, error) {
	return c.repo.ListWithFilters(offset, limit, filters)
}

func (c *ExpenseController) CountExpensesWithFilters(filters map[string]string) (int64, error) {
	return c.repo.CountWithFilters(filters)
}