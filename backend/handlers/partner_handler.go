package handlers

import (
	"net/http"
	"strconv"

	"backend/models"
	"backend/repositories"
	"backend/utils"

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
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.PartnerRepo.CreatePartner(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, partner)
}

func (h *PartnerHandler) GetPartnerByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID")
		return
	}

	partner, err := h.PartnerRepo.GetPartnerByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Partner not found")
		return
	}

	utils.SuccessResponse(c, http.StatusOK, partner)
}

func (h *PartnerHandler) GetAllPartners(c *gin.Context) {
	partners, err := h.PartnerRepo.GetAllPartners()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, partners)
}

func (h *PartnerHandler) UpdatePartner(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID")
		return
	}

	var partner models.Partner
	if err := c.ShouldBindJSON(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, err.Error())
		return
	}

	partner.ID = uint(id)
	if err := h.PartnerRepo.UpdatePartner(&partner); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, partner)
}

func (h *PartnerHandler) DeletePartner(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid partner ID")
		return
	}

	if err := h.PartnerRepo.DeletePartner(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusNoContent, nil)
}
