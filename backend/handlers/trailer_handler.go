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

type TrailerHandler struct {
	repo *repositories.TrailerRepository
}

func NewTrailerHandler(repo *repositories.TrailerRepository) *TrailerHandler {
	return &TrailerHandler{repo: repo}
}

func (h *TrailerHandler) List(c *gin.Context) {
	page, limit := utils.GetPaginationParams(c)
	offset := (page - 1) * limit

	trailers, err := h.repo.List(offset, limit)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrFetchTrailers, 
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	totalRecords, err := h.repo.Count()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCountTrailers, 
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	pagination := utils.CalculatePagination(int(totalRecords), page, limit)
	utils.ListSuccessResponse(c, common.MsgTrailersRetrieved, trailers, pagination)
}

func (h *TrailerHandler) Create(c *gin.Context) {
	var trailer models.Trailer
	if err := c.ShouldBindJSON(&trailer); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	if trailer.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrTrailerLicensePlateRequired})
		return
	}

	if err := h.repo.Create(&trailer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrCreateTrailer, 
			utils.ErrorDetail{Code: common.CodeCreateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, common.MsgTrailerCreated, trailer)
}

func (h *TrailerHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	existingTrailer, err := h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTrailerNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTrailerNotFound})
		return
	}

	var updateData models.Trailer
	if err := c.ShouldBindJSON(&updateData); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeInvalidInput, Message: err.Error()})
		return
	}

	if updateData.LicensePlate == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput, 
			utils.ErrorDetail{Code: common.CodeRequiredField, Message: common.ErrTrailerLicensePlateRequired})
		return
	}

	existingTrailer.LicensePlate = updateData.LicensePlate
	existingTrailer.Description = updateData.Description
	
	if err := h.repo.Update(existingTrailer); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrUpdateTrailer, 
			utils.ErrorDetail{Code: common.CodeUpdateFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTrailerUpdated, existingTrailer)
}

func (h *TrailerHandler) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidID, 
			utils.ErrorDetail{Code: common.CodeInvalidID, Message: err.Error()})
		return
	}

	_, err = h.repo.FindByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrTrailerNotFound, 
			utils.ErrorDetail{Code: common.CodeNotFound, Message: common.ErrTrailerNotFound})
		return
	}

	if err := h.repo.Delete(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrDeleteTrailer, 
			utils.ErrorDetail{Code: common.CodeDeleteFailed, Message: err.Error()})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTrailerDeleted, nil)
}