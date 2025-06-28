package handlers

import (
	"net/http"
	"strconv"

	"backend/models"
	"backend/repositories"
	"backend/utils"

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
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.CustomerRepo.CreateCustomer(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, customer)
}

func (h *CustomerHandler) GetCustomerByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	customer, err := h.CustomerRepo.GetCustomerByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Customer not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, customer)
}

func (h *CustomerHandler) GetAllCustomers(c *gin.Context) {
	customers, err := h.CustomerRepo.GetAllCustomers()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, customers)
}

func (h *CustomerHandler) UpdateCustomer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	var customer models.Customer
	if err := c.ShouldBindJSON(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	customer.ID = uint(id)
	if err := h.CustomerRepo.UpdateCustomer(&customer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, customer)
}

func (h *CustomerHandler) DeleteCustomer(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID")
		return
	}

	if err := h.CustomerRepo.DeleteCustomer(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, nil)
}
