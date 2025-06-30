package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type ActivityLogHandler struct {
	repo *repositories.ActivityLogRepository
}

func NewActivityLogHandler(repo *repositories.ActivityLogRepository) *ActivityLogHandler {
	return &ActivityLogHandler{
		repo: repo,
	}
}

// GetActivityLogs retrieves activity logs with pagination
func (h *ActivityLogHandler) GetActivityLogs(c *gin.Context) {
	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// Get filter parameters
	userIDStr := c.Query("user_id")
	action := c.Query("action")
	resource := c.Query("resource")
	resourceID := c.Query("resource_id")
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var logs interface{}
	var err error

	// Apply filters based on query parameters
	if userIDStr != "" {
		userID, _ := strconv.ParseUint(userIDStr, 10, 32)
		logs, err = h.repo.FindByUserID(uint(userID), offset, limit)
	} else if action != "" {
		logs, err = h.repo.FindByAction(action, offset, limit)
	} else if resource != "" && resourceID != "" {
		logs, err = h.repo.FindByResource(resource, resourceID, offset, limit)
	} else if startDateStr != "" && endDateStr != "" {
		startDate, _ := time.Parse("2006-01-02", startDateStr)
		endDate, _ := time.Parse("2006-01-02", endDateStr)
		logs, err = h.repo.FindByDateRange(startDate, endDate, offset, limit)
	} else {
		// Default: get all logs with pagination
		logs, err = h.repo.FindByDateRange(time.Now().AddDate(0, -1, 0), time.Now(), offset, limit)
	}

	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve activity logs", err.Error())
		return
	}

	// Get total count
	count, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to count activity logs", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
			"total": count,
		},
	})
}

// GetMyActivityLogs retrieves activity logs for the current user
func (h *ActivityLogHandler) GetMyActivityLogs(c *gin.Context) {
	// Get current user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, "User not found", "")
		return
	}

	userIDUint := userID.(uint)

	// Get pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	logs, err := h.repo.FindByUserID(userIDUint, offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to retrieve activity logs", err.Error())
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": logs,
		"meta": gin.H{
			"page":  page,
			"limit": limit,
		},
	})
}

// CleanupOldLogs removes logs older than the retention period
func (h *ActivityLogHandler) CleanupOldLogs(c *gin.Context) {
	// Get retention days from query parameter or use default
	retentionDays, _ := strconv.Atoi(c.DefaultQuery("days", "90"))

	err := h.repo.DeleteOlderThan(retentionDays)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to cleanup old logs", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Old logs cleaned up successfully", gin.H{
		"retention_days": retentionDays,
	})
}
