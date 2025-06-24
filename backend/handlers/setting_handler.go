package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
)

type SettingHandler struct {
	repo *repositories.SettingRepository
}

func NewSettingHandler(repo *repositories.SettingRepository) *SettingHandler {
	return &SettingHandler{repo: repo}
}

type SettingResponse struct {
	Key           string `json:"key"`
	Value         string `json:"value"`
	LastUpdatedBy string `json:"last_updated_by"`
	CreatedAt     string `json:"created_at"`
	UpdatedAt     string `json:"updated_at"`
}

func (h *SettingHandler) GetByKey(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Key parameter is required"})
		return
	}

	setting, err := h.repo.GetByKey(key)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrSettingNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrSettingNotFound})
		return
	}

	response := SettingResponse{
		Key:           setting.Key,
		Value:         setting.Value,
		LastUpdatedBy: setting.LastUpdatedByUser.Username,
		CreatedAt:     setting.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:     setting.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	var message string
	if key == "tax_rate" {
		message = common.MsgTaxRateRetrieved
	} else {
		message = common.MsgSettingRetrieved
	}

	utils.SuccessResponse(c, http.StatusOK, message, response)
}

func (h *SettingHandler) UpdateByKey(c *gin.Context) {
	key := c.Param("key")
	if key == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Key parameter is required"})
		return
	}

	var request struct {
		Value string `json:"value" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: "Value is required and must be a valid number"})
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: common.ErrUserIDNotFound})
		return
	}

	setting, err := h.repo.UpdateByKey(key, request.Value, userID.(uint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateSetting,
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	response := SettingResponse{
		Key:           setting.Key,
		Value:         setting.Value,
		LastUpdatedBy: setting.LastUpdatedByUser.Username,
		CreatedAt:     setting.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:     setting.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}

	var message string
	if key == "tax_rate" {
		message = common.MsgTaxRateUpdated
	} else {
		message = common.MsgSettingUpdated
	}

	utils.SuccessResponse(c, http.StatusOK, message, response)
}