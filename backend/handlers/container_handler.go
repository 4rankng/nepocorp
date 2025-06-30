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

type ContainerHandler struct {
	repo *repositories.ContainerRepository
}

func NewContainerHandler(repo *repositories.ContainerRepository) *ContainerHandler {
	return &ContainerHandler{repo: repo}
}

func (h *ContainerHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	containers, err := h.repo.List(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchContainers,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountContainers,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgContainersRetrieved, containers, pagination)
}

func (h *ContainerHandler) Create(c *gin.Context) {
	var container models.Container
	if err := c.ShouldBindJSON(&container); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	if container.Category == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrContainerCategoryRequired})
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
	container.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.repo.Create(&container); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateContainer,
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgContainerCreated, container)
}

func (h *ContainerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	existingContainer, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrContainerNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrContainerNotFound})
		return
	}

	var updateData models.Container
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeInvalidInput, Message: err.Error()})
		return
	}

	if updateData.Category == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrContainerCategoryRequired})
		return
	}

	// Get user info for audit trail
	userInfo, err := utils.GetUserFromGinContext(c)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User context not found"})
		return
	}

	existingContainer.Category = updateData.Category
	// Set last_updated_by
	existingContainer.LastUpdatedBy = utils.FormatLastUpdatedByUserInfo(userInfo)

	if err := h.repo.Update(existingContainer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateContainer,
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgContainerUpdated, existingContainer)
}

func (h *ContainerHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrContainerNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrContainerNotFound})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteContainer,
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgContainerDeleted, nil)
}
