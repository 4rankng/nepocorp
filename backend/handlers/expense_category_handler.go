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

type ExpenseCategoryHandler struct {
	repo *repositories.ExpenseCategoryRepository
}

func NewExpenseCategoryHandler(repo *repositories.ExpenseCategoryRepository) *ExpenseCategoryHandler {
	return &ExpenseCategoryHandler{repo: repo}
}

func (h *ExpenseCategoryHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	categories, err := h.repo.List(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchExpenseCategories,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountExpenseCategories,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgExpenseCategoriesRetrieved, categories, pagination)
}

func (h *ExpenseCategoryHandler) Create(c *gin.Context) {
	var category models.ExpenseCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	if category.Name == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrExpenseCategoryNameRequired})
		return
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	// Set last_updated_by
	category.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.repo.Create(&category); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateExpenseCategory,
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgExpenseCategoryCreated, category)
}

func (h *ExpenseCategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	existingCategory, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrExpenseCategoryNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrExpenseCategoryNotFound})
		return
	}

	var updateData models.ExpenseCategory
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeInvalidInput, Message: err.Error()})
		return
	}

	if updateData.Name == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrExpenseCategoryNameRequired})
		return
	}

	// Update fields
	existingCategory.Name = updateData.Name
	if updateData.Description != nil {
		existingCategory.Description = updateData.Description
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	// Set last_updated_by
	existingCategory.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.repo.Update(existingCategory); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateExpenseCategory,
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgExpenseCategoryUpdated, existingCategory)
}

func (h *ExpenseCategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrExpenseCategoryNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrExpenseCategoryNotFound})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteExpenseCategory,
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgExpenseCategoryDeleted, nil)
}
