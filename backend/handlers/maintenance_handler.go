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

type MaintenanceHandler struct {
	repo *repositories.MaintenanceRepository
}

func NewMaintenanceHandler(repo *repositories.MaintenanceRepository) *MaintenanceHandler {
	return &MaintenanceHandler{repo: repo}
}

// GetAll returns all maintenance records with pagination and filtering
func (h *MaintenanceHandler) GetAll(c *gin.Context) {
	// Parse pagination parameters
	page, limit := utils.GetPaginationParams(c)

	// Parse filter parameters
	filters := repositories.MaintenanceFilters{
		LicensePlate: c.Query("license_plate"),
		VendorName:   c.Query("vendor_name"),
		ItemName:     c.Query("item_name"),
		StartDate:    c.Query("start_date"),
		EndDate:      c.Query("end_date"),
	}

	// Get maintenance records from repository
	maintenances, total, err := h.repo.GetAll(filters, page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Calculate pagination metadata
	totalPages := (int(total) + limit - 1) / limit

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": "Maintenance records retrieved successfully",
		"data":    maintenances,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_pages":   totalPages,
			"records_count": total,
		},
	}

	c.JSON(http.StatusOK, response)
}

// GetByID returns a maintenance record by ID
func (h *MaintenanceHandler) GetByID(c *gin.Context) {
	// Parse ID parameter
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "Invalid maintenance ID")
		return
	}

	// Get maintenance record from repository
	maintenance, err := h.repo.GetByID(uint(id))
	if err != nil {
		if err.Error() == "maintenance record not found" {
			utils.ErrorResponse(c, http.StatusNotFound, common.ErrNotFound, "Maintenance record not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": "Maintenance record retrieved successfully",
		"data":    maintenance,
	}

	c.JSON(http.StatusOK, response)
}

// Create creates a new maintenance record
func (h *MaintenanceHandler) Create(c *gin.Context) {
	var maintenance models.Maintenance

	// Bind JSON request to maintenance struct
	if err := c.ShouldBindJSON(&maintenance); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, err.Error())
		return
	}

	// Validate required fields
	if maintenance.ExpenseID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "expense_id is required")
		return
	}

	if maintenance.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "license_plate is required")
		return
	}

	if maintenance.VendorName == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "vendor_name is required")
		return
	}

	if maintenance.ItemName == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "item_name is required")
		return
	}

	if maintenance.Price <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "price must be greater than 0")
		return
	}

	if maintenance.Quantity <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "quantity must be greater than 0")
		return
	}

	// Calculate total (will be done in BeforeSave hook as well)
	maintenance.CalculateTotal()

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized, "User context not found")
		return
	}

	// Set last_updated_by
	maintenance.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	// Create maintenance record
	if err := h.repo.Create(&maintenance); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": "Maintenance record created successfully",
		"data":    maintenance,
	}

	c.JSON(http.StatusCreated, response)
}

// Update updates an existing maintenance record
func (h *MaintenanceHandler) Update(c *gin.Context) {
	// Parse ID parameter
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "Invalid maintenance ID")
		return
	}

	var maintenance models.Maintenance

	// Bind JSON request to maintenance struct
	if err := c.ShouldBindJSON(&maintenance); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, err.Error())
		return
	}

	// Validate required fields
	if maintenance.ExpenseID == 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "expense_id is required")
		return
	}

	if maintenance.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "license_plate is required")
		return
	}

	if maintenance.VendorName == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "vendor_name is required")
		return
	}

	if maintenance.ItemName == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "item_name is required")
		return
	}

	if maintenance.Price <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "price must be greater than 0")
		return
	}

	if maintenance.Quantity <= 0 {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "quantity must be greater than 0")
		return
	}

	// Calculate total
	maintenance.CalculateTotal()

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized, "User context not found")
		return
	}

	// Set last_updated_by
	maintenance.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	// Update maintenance record
	if err := h.repo.Update(uint(id), &maintenance); err != nil {
		if err.Error() == "maintenance record not found" {
			utils.ErrorResponse(c, http.StatusNotFound, common.ErrNotFound, "Maintenance record not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": "Maintenance record updated successfully",
		"data":    maintenance,
	}

	c.JSON(http.StatusOK, response)
}

// Delete deletes a maintenance record by ID
func (h *MaintenanceHandler) Delete(c *gin.Context) {
	// Parse ID parameter
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, "Invalid maintenance ID")
		return
	}

	// Delete maintenance record
	if err := h.repo.Delete(uint(id)); err != nil {
		if err.Error() == "maintenance record not found" {
			utils.ErrorResponse(c, http.StatusNotFound, common.ErrNotFound, "Maintenance record not found")
			return
		}
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": "Maintenance record deleted successfully",
	}

	c.JSON(http.StatusOK, response)
}
