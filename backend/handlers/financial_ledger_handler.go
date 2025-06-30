package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"

	"github.com/gin-gonic/gin"
)

type FinancialLedgerHandler struct {
	FinancialLedgerRepo *repositories.FinancialLedgerRepository
}

func NewFinancialLedgerHandler(financialLedgerRepo *repositories.FinancialLedgerRepository) *FinancialLedgerHandler {
	return &FinancialLedgerHandler{FinancialLedgerRepo: financialLedgerRepo}
}

func (h *FinancialLedgerHandler) CreateTransaction(c *gin.Context) {
	var transaction models.FinancialLedger
	if err := c.ShouldBindJSON(&transaction); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User context not found")
		return
	}

	// Set last_updated_by
	transaction.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.FinancialLedgerRepo.CreateTransaction(&transaction); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Transaction created successfully", transaction)
}

func (h *FinancialLedgerHandler) GetTransactionByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid transaction ID", nil)
		return
	}

	transaction, err := h.FinancialLedgerRepo.GetTransactionByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Transaction not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transaction retrieved successfully", transaction)
}

func (h *FinancialLedgerHandler) GetAllTransactions(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)

	transactions, total, err := h.FinancialLedgerRepo.GetAllTransactions(page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	pagination := utils.CalculatePagination(int(total), page, limit)
	utils.ListSuccessResponse(c, "Transactions retrieved successfully", transactions, pagination)
}

func (h *FinancialLedgerHandler) UpdateTransaction(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid transaction ID", nil)
		return
	}

	var transaction models.FinancialLedger
	if err := c.ShouldBindJSON(&transaction); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	transaction.ID = uint(id)

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, "Unauthorized", "User context not found")
		return
	}

	// Set last_updated_by
	transaction.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.FinancialLedgerRepo.UpdateTransaction(&transaction); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transaction updated successfully", transaction)
}

func (h *FinancialLedgerHandler) DeleteTransaction(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid transaction ID", nil)
		return
	}

	if err := h.FinancialLedgerRepo.DeleteTransaction(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transaction deleted successfully", nil)
}

func (h *FinancialLedgerHandler) GetTransactionsByCustomer(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("customerId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	transactions, err := h.FinancialLedgerRepo.GetTransactionsByCustomerID(uint(customerID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", transactions)
}

func (h *FinancialLedgerHandler) GetTransactionsByPartner(c *gin.Context) {
	partnerID, err := strconv.ParseUint(c.Param("partnerId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID", nil)
		return
	}

	transactions, err := h.FinancialLedgerRepo.GetTransactionsByPartnerID(uint(partnerID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", transactions)
}

func (h *FinancialLedgerHandler) GetTransactionsByType(c *gin.Context) {
	transactionType := c.Param("type")
	if transactionType == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Transaction type parameter is required", nil)
		return
	}

	transactions, err := h.FinancialLedgerRepo.GetTransactionsByType(transactionType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", transactions)
}

func (h *FinancialLedgerHandler) GetTransactionsByDateRange(c *gin.Context) {
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	if startDateStr == "" || endDateStr == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "start_date and end_date query parameters are required", nil)
		return
	}

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid start_date format. Use YYYY-MM-DD", nil)
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid end_date format. Use YYYY-MM-DD", nil)
		return
	}

	transactions, err := h.FinancialLedgerRepo.GetTransactionsByDateRange(startDate, endDate)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Transactions retrieved successfully", transactions)
}

func (h *FinancialLedgerHandler) GetCustomerBalance(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("customerId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	balance, err := h.FinancialLedgerRepo.GetCustomerBalance(uint(customerID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Customer balance retrieved successfully", map[string]interface{}{
		"customer_id": customerID,
		"balance":     balance,
	})
}

func (h *FinancialLedgerHandler) GetPartnerBalance(c *gin.Context) {
	partnerID, err := strconv.ParseUint(c.Param("partnerId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID", nil)
		return
	}

	balance, err := h.FinancialLedgerRepo.GetPartnerBalance(uint(partnerID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Partner balance retrieved successfully", map[string]interface{}{
		"partner_id": partnerID,
		"balance":    balance,
	})
}
