package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type MaintenanceItemHandler struct {
	repo *repositories.MaintenanceItemRepository
}

func NewMaintenanceItemHandler(repo *repositories.MaintenanceItemRepository) *MaintenanceItemHandler {
	return &MaintenanceItemHandler{repo: repo}
}

func (h *MaintenanceItemHandler) GetMaintenanceItems(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized, "User not authenticated")
		return
	}

	// Parse pagination parameters
	page, limit := utils.GetPaginationParams(c)

	// Parse filter parameters
	filters := repositories.MaintenanceItemFilters{
		LicensePlate: c.Query("license_plate"),
		VendorName:   c.Query("vendor_name"),
		ItemName:     c.Query("item_name"),
		StartDate:    c.Query("start_date"),
		EndDate:      c.Query("end_date"),
	}

	// Get maintenance items from repository
	items, total, err := h.repo.GetMaintenanceItems(userID.(uint), filters, page, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer, err.Error())
		return
	}

	// Calculate pagination metadata
	totalPages := (int(total) + limit - 1) / limit

	// Prepare response
	response := gin.H{
		"status":  "success",
		"message": common.MsgMaintenanceItemsRetrieved,
		"data":    items,
		"pagination": gin.H{
			"page":          page,
			"limit":         limit,
			"total_pages":   totalPages,
			"records_count": total,
		},
	}

	c.JSON(http.StatusOK, response)
}