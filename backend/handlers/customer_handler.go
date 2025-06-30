package handlers

import (
	"net/http"
	"strconv"

	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"

	"github.com/gin-gonic/gin"
)

type CustomerHandler struct {
	CustomerRepo *repositories.CustomerRepository
}

func NewCustomerHandler(customerRepo *repositories.CustomerRepository) *CustomerHandler {
	return &CustomerHandler{CustomerRepo: customerRepo}
}

func (h *CustomerHandler) CreateCustomer(c *gin.Context) {
	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
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
	customer.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.CustomerRepo.CreateCustomer(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Customer created successfully", customer)
}

func (h *CustomerHandler) GetCustomerByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	customer, err := h.CustomerRepo.GetCustomerByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Customer not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Customer retrieved successfully", customer)
}

func (h *CustomerHandler) GetAllCustomers(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	customers, err := h.CustomerRepo.ListCustomers(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	totalRecords, err := h.CustomerRepo.CountCustomers()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count customers", err.Error())
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, "Customers retrieved successfully", customers, pagination)
}

func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	customer.ID = uint(id)
	// Set last_updated_by
	customer.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.CustomerRepo.UpdateCustomer(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to update customer", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Customer updated successfully", customer)
}

func (h *CustomerHandler) DeleteCustomer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	if err := h.CustomerRepo.DeleteCustomer(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteCustomer, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, common.MsgCustomerDeleted, nil)
}
