package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/controllers"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type ExpenseHandler struct {
	controller *controllers.ExpenseController
}

func NewExpenseHandler(repo *repositories.ExpenseRepository, categoryRepo *repositories.ExpenseCategoryRepository) *ExpenseHandler {
	return &ExpenseHandler{
		controller: controllers.NewExpenseController(repo, categoryRepo),
	}
}

func (h *ExpenseHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	// Get filter parameters
	expenseCategoryID := c.Query("expense_category_id")
	paymentStatus := c.Query("payment_status")

	filters := map[string]string{
		"expense_category_id": expenseCategoryID,
		"payment_status":      paymentStatus,
	}

	expenses, err := h.controller.ListExpensesWithFilters(offset, limit, filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchTractorExpenses,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.controller.CountExpensesWithFilters(filters)
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

	expense, err := h.controller.GetExpenseByID(uint(id))
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

	// Note: Vehicle association is now handled at the item level via license_plate

	// Validate required fields
	if expense.ExpenseCategoryID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrRequiredFields})
		return
	}

	// Validate payment status - delegate to controller for validation
	// The controller will handle payment status validation

	// Create expense with items in transaction
	if err := h.controller.CreateExpense(&expense); err != nil {
		// Log detailed error for debugging
		c.Header("X-Error-Detail", err.Error())
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

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	var request controllers.UpdateExpenseRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Delegate to controller
	updatedExpense, err := h.controller.UpdateExpense(uint(id), &request, userInfo)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateTractorExpense,
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorExpenseUpdated, updatedExpense)
}

func (h *ExpenseHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	if err := h.controller.DeleteExpense(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteTractorExpense,
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorExpenseDeleted, nil)
}

// Item-related handlers - TODO: Move to controller
func (h *ExpenseHandler) CreateItem(c *gin.Context) {
	utils.ErrorResponse(c, http.StatusNotImplemented, "Not implemented",
		utils.ErrorDetail{Code: common.CodeNotFound, Message: "Item creation via separate endpoint not implemented. Use expense update instead."})
}

func (h *ExpenseHandler) UpdateItem(c *gin.Context) {
	utils.ErrorResponse(c, http.StatusNotImplemented, "Not implemented",
		utils.ErrorDetail{Code: common.CodeNotFound, Message: "Item update via separate endpoint not implemented. Use expense update instead."})
}

func (h *ExpenseHandler) DeleteItem(c *gin.Context) {
	utils.ErrorResponse(c, http.StatusNotImplemented, "Not implemented",
		utils.ErrorDetail{Code: common.CodeNotFound, Message: "Item deletion via separate endpoint not implemented. Use expense update instead."})
}
