package handlers

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type InvoiceHandler struct {
	repo         *repositories.InvoiceRepository
	categoryRepo *repositories.InvoiceCategoryRepository
}

var validInvoiceStatuses = []string{"DRAFT", "PENDING", "PAID", "CANCELLED"}

func NewInvoiceHandler(repo *repositories.InvoiceRepository, categoryRepo *repositories.InvoiceCategoryRepository) *InvoiceHandler {
	return &InvoiceHandler{
		repo:         repo,
		categoryRepo: categoryRepo,
	}
}

func isValidInvoiceStatus(status string) bool {
	status = strings.ToUpper(status)
	for _, validStatus := range validInvoiceStatuses {
		if status == validStatus {
			return true
		}
	}
	return false
}

func (h *InvoiceHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	// Get filter parameters
	customerID := c.Query("customer_id")
	invoiceCategoryID := c.Query("invoice_category_id")
	paymentStatus := c.Query("payment_status")

	filters := map[string]string{
		"customer_id":         customerID,
		"invoice_category_id": invoiceCategoryID,
		"payment_status":      paymentStatus,
	}

	invoices, err := h.repo.ListWithFilters(offset, limit, filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchInvoices,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.CountWithFilters(filters)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountInvoices,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgInvoicesRetrieved, invoices, pagination)
}

func (h *InvoiceHandler) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	invoice, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrInvoiceNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrInvoiceNotFound})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceRetrieved, invoice)
}

func (h *InvoiceHandler) Create(c *gin.Context) {
	var invoice models.Invoice
	if err := c.ShouldBindJSON(&invoice); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	// Set user info
	invoice.CreatedBy = userInfo.ID
	invoice.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	// Validate payment status
	if invoice.PaymentStatus != "" && !isValidInvoiceStatus(invoice.PaymentStatus) {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidPaymentStatus,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Invalid payment status"})
		return
	}

	// Set default status if not provided
	if invoice.PaymentStatus == "" {
		invoice.PaymentStatus = "DRAFT"
	}

	// Set default currency if not provided
	if invoice.Currency == "" {
		invoice.Currency = "VND"
	}

	// Calculate totals
	var calculatedTotal int64
	for i := range invoice.Items {
		item := &invoice.Items[i]
		item.Subtotal = item.Price * int64(item.Quantity)
		taxAmount := int64(float64(item.Subtotal) * item.TaxRate / 100)
		item.Total = item.Subtotal + taxAmount
		calculatedTotal += item.Total
	}
	invoice.Total = calculatedTotal

	if err := h.repo.Create(&invoice); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateInvoice,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgInvoiceCreated, invoice)
}

func (h *InvoiceHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	var invoice models.Invoice
	if err := c.ShouldBindJSON(&invoice); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	invoice.ID = uint(id)

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	// Set last_updated_by
	invoice.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	// Validate payment status
	if invoice.PaymentStatus != "" && !isValidInvoiceStatus(invoice.PaymentStatus) {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidPaymentStatus,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Invalid payment status"})
		return
	}

	// If status is CANCELLED, cancel_reason is required
	if invoice.PaymentStatus == "CANCELLED" && invoice.CancelReason == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrCancelReasonRequired,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Cancel reason is required when status is CANCELLED"})
		return
	}

	// Calculate totals if items are provided
	if len(invoice.Items) > 0 {
		var calculatedTotal int64
		for i := range invoice.Items {
			item := &invoice.Items[i]
			item.Subtotal = item.Price * int64(item.Quantity)
			taxAmount := int64(float64(item.Subtotal) * item.TaxRate / 100)
			item.Total = item.Subtotal + taxAmount
			calculatedTotal += item.Total
		}
		invoice.Total = calculatedTotal
	}

	if err := h.repo.Update(&invoice); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateInvoice,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceUpdated, invoice)
}

func (h *InvoiceHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteInvoice,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, common.MsgInvoiceDeleted, nil)
}

// Item management endpoints
func (h *InvoiceHandler) AddItem(c *gin.Context) {
	invoiceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	var item models.InvoiceItem
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	item.InvoiceID = uint(invoiceID)

	// Calculate totals
	item.Subtotal = item.Price * int64(item.Quantity)
	taxAmount := int64(float64(item.Subtotal) * item.TaxRate / 100)
	item.Total = item.Subtotal + taxAmount

	if err := h.repo.CreateItem(&item); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateInvoiceItem,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgInvoiceItemCreated, item)
}

func (h *InvoiceHandler) UpdateItem(c *gin.Context) {
	invoiceID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	var item models.InvoiceItem
	if err := c.ShouldBindJSON(&item); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	item.ID = uint(itemID)
	item.InvoiceID = uint(invoiceID)

	// Calculate totals
	item.Subtotal = item.Price * int64(item.Quantity)
	taxAmount := int64(float64(item.Subtotal) * item.TaxRate / 100)
	item.Total = item.Subtotal + taxAmount

	if err := h.repo.UpdateItem(&item); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateInvoiceItem,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgInvoiceItemUpdated, item)
}

func (h *InvoiceHandler) DeleteItem(c *gin.Context) {
	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	if err := h.repo.DeleteItem(uint(itemID)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteInvoiceItem,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, common.MsgInvoiceItemDeleted, nil)
}
