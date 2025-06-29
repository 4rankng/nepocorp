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

type InvoiceCategoryHandler struct {
	repo *repositories.InvoiceCategoryRepository
}

func NewInvoiceCategoryHandler(repo *repositories.InvoiceCategoryRepository) *InvoiceCategoryHandler {
	return &InvoiceCategoryHandler{repo: repo}
}

func (h *InvoiceCategoryHandler) List(c *gin.Context) {
	categories, err := h.repo.GetAll()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchInvoiceCategories,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceCategoriesRetrieved, categories)
}

func (h *InvoiceCategoryHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	category, err := h.repo.GetByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrInvoiceCategoryNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrInvoiceCategoryNotFound})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceCategoryRetrieved, category)
}

func (h *InvoiceCategoryHandler) Create(c *gin.Context) {
	var category models.InvoiceCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	if err := h.repo.Create(&category); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateInvoiceCategory,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgInvoiceCategoryCreated, category)
}

func (h *InvoiceCategoryHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	var category models.InvoiceCategory
	if err := c.ShouldBindJSON(&category); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	category.ID = uint(id)

	if err := h.repo.Update(&category); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateInvoiceCategory,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceCategoryUpdated, category)
}

func (h *InvoiceCategoryHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteInvoiceCategory,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, common.MsgInvoiceCategoryDeleted, nil)
}
