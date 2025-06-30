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

type TractorHandler struct {
	repo *repositories.TractorRepository
}

func NewTractorHandler(repo *repositories.TractorRepository) *TractorHandler {
	return &TractorHandler{repo: repo}
}

func (h *TractorHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	tractors, err := h.repo.List(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchTractors,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountTractors,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgTractorsRetrieved, tractors, pagination)
}

func (h *TractorHandler) Create(c *gin.Context) {
	var tractor models.Tractor
	if err := c.ShouldBindJSON(&tractor); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	if tractor.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrTractorLicensePlateRequired})
		return
	}

	if err := h.repo.Create(&tractor); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateTractor,
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgTractorCreated, tractor)
}

func (h *TractorHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	existingTractor, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorNotFound})
		return
	}

	var updateData models.Tractor
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeInvalidInput, Message: err.Error()})
		return
	}

	if updateData.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrTractorLicensePlateRequired})
		return
	}

	existingTractor.LicensePlate = updateData.LicensePlate

	if err := h.repo.Update(existingTractor); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateTractor,
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorUpdated, existingTractor)
}

func (h *TractorHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID,
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTractorNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTractorNotFound})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteTractor,
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTractorDeleted, nil)
}
