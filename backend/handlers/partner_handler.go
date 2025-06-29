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

type PartnerHandler struct {
	PartnerRepo *repositories.PartnerRepository
}

func NewPartnerHandler(partnerRepo *repositories.PartnerRepository) *PartnerHandler {
	return &PartnerHandler{PartnerRepo: partnerRepo}
}

func (h *PartnerHandler) CreatePartner(c *gin.Context) {
	var partner models.Partner
	if err := c.ShouldBindJSON(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	if err := h.PartnerRepo.CreatePartner(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Partner created successfully", partner)
}

func (h *PartnerHandler) GetPartnerByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID", nil)
		return
	}

	partner, err := h.PartnerRepo.GetPartnerByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Partner not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Partner retrieved successfully", partner)
}

func (h *PartnerHandler) GetAllPartners(c *gin.Context) {
	partners, err := h.PartnerRepo.GetAllPartners()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Partners retrieved successfully", partners)
}

func (h *PartnerHandler) UpdatePartner(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID", nil)
		return
	}

	var partner models.Partner
	if err := c.ShouldBindJSON(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	partner.ID = uint(id)
	if err := h.PartnerRepo.UpdatePartner(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Partner updated successfully", partner)
}

func (h *PartnerHandler) DeletePartner(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID", nil)
		return
	}

	if err := h.PartnerRepo.DeletePartner(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Failed to delete partner", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, common.MsgPartnerDeleted, nil)
}
