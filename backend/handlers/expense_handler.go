package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type ExpenseHandler struct {
	repo         *repositories.ExpenseRepository
	categoryRepo *repositories.ExpenseCategoryRepository
}

func NewExpenseHandler(repo *repositories.ExpenseRepository, categoryRepo *repositories.ExpenseCategoryRepository) *ExpenseHandler {
	return &ExpenseHandler{
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func (h *ExpenseHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	expenses, err := h.repo.List(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchTractorExpenses, 
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountTractorExpenses, 
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgTractorExpensesRetrieved, expenses, pagination)
}

func (h *ExpenseHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	expense, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorExpenseNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorExpenseNotFound})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorExpenseRetrieved, expense)
}

func (h *ExpenseHandler) Create(c *gin.Context) {
	var expense models.Expense
	if err := c.ShouldBindJSON(&expense); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized, 
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: common.ErrUserIDNotFound})
		return
	}
	expense.CreatedBy = userID.(uint)

	// Validate that either tractor_id or trailer_id is provided (but not both)
	if (expense.TractorID == nil && expense.TrailerID == nil) || 
	   (expense.TractorID != nil && expense.TrailerID != nil) {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: "Either tractor_id or trailer_id is required (but not both)"})
		return
	}

	// Validate required fields
	if expense.ExpenseCategoryID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrRequiredFields})
		return
	}

	// Ensure "Bao duong" category exists if expense_category_id is 1
	if expense.ExpenseCategoryID == 1 {
		if err := h.categoryRepo.EnsureBaoDuongExists(); err != nil {
			utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateTractorExpense, 
				utils.ErrorDetail{Code: common.CodeCreateFailed, Message: "Failed to ensure Bao duong category exists: " + err.Error()})
			return
		}
	}

	// Create expense with items in transaction
	if err := h.repo.Create(&expense); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateTractorExpense, 
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgTractorExpenseCreated, expense)
}

func (h *ExpenseHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	existingExpense, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorExpenseNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorExpenseNotFound})
		return
	}

	var updateData map[string]interface{}
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Update only provided fields
	if vendorName, ok := updateData["vendor_name"].(string); ok && vendorName != "" {
		existingExpense.VendorName = vendorName
	}
	if paymentStatus, ok := updateData["payment_status"].(string); ok && paymentStatus != "" {
		existingExpense.PaymentStatus = paymentStatus
	}
	if paymentProof, ok := updateData["payment_proof"].(string); ok {
		existingExpense.PaymentProof = paymentProof
	}
	if remark, ok := updateData["remark"].(string); ok {
		existingExpense.Remark = remark
	}
	if currency, ok := updateData["currency"].(string); ok && currency != "" {
		existingExpense.Currency = currency
	}
	if subtotal, ok := updateData["subtotal"].(float64); ok {
		existingExpense.Subtotal = int64(subtotal)
	}
	if taxRate, ok := updateData["tax_rate"].(float64); ok {
		existingExpense.TaxRate = int(taxRate)
	}
	if total, ok := updateData["total"].(float64); ok {
		existingExpense.Total = int64(total)
	}

	if err := h.repo.Update(existingExpense); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateTractorExpense, 
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorExpenseUpdated, existingExpense)
}

func (h *ExpenseHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorExpenseNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorExpenseNotFound})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteTractorExpense, 
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorExpenseDeleted, nil)
}

// Item-related handlers
func (h *ExpenseHandler) CreateItem(c *gin.Context) {
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidExpenseID, Message: err.Error()})
		return
	}

	// Verify expense exists
	_, err = h.repo.FindByID(uint(expenseID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorExpenseNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorExpenseNotFound})
		return
	}

	var item models.ExpenseItem
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	item.ExpenseID = uint(expenseID)

	// Validate required fields
	if item.ItemName == "" || item.Price == 0 || item.Quantity == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrRequiredFields})
		return
	}

	if err := h.repo.CreateItem(&item); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateExpenseItem, 
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgExpenseItemCreated, item)
}

func (h *ExpenseHandler) UpdateItem(c *gin.Context) {
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidExpenseID, Message: err.Error()})
		return
	}

	itemID, err := strconv.ParseUint(c.Param("item_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidItemID, Message: err.Error()})
		return
	}

	existingItem, err := h.repo.FindItemByID(uint(expenseID), uint(itemID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrExpenseItemNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrExpenseItemNotFound})
		return
	}

	var updateData models.ExpenseItem
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Update fields
	if updateData.ItemName != "" {
		existingItem.ItemName = updateData.ItemName
	}
	if updateData.Price > 0 {
		existingItem.Price = updateData.Price
	}
	if updateData.Quantity > 0 {
		existingItem.Quantity = updateData.Quantity
	}
	if updateData.Total > 0 {
		existingItem.Total = updateData.Total
	}
	if updateData.InstallDate != nil {
		existingItem.InstallDate = updateData.InstallDate
	}
	if updateData.ExpiryDate != nil {
		existingItem.ExpiryDate = updateData.ExpiryDate
	}

	if err := h.repo.UpdateItem(existingItem); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateExpenseItem, 
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgExpenseItemUpdated, existingItem)
}

func (h *ExpenseHandler) DeleteItem(c *gin.Context) {
	expenseID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidExpenseID, Message: err.Error()})
		return
	}

	itemID, err := strconv.ParseUint(c.Param("item_id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidItemID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindItemByID(uint(expenseID), uint(itemID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrExpenseItemNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrExpenseItemNotFound})
		return
	}

	if err := h.repo.DeleteItem(uint(expenseID), uint(itemID)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteExpenseItem, 
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgExpenseItemDeleted, nil)
}