package handlers

import (
	"net/http"
	"strconv"

	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"

	"github.com/gin-gonic/gin"
)

type FuelStandardHandler struct {
	FuelStandardRepo *repositories.FuelStandardRepository
}

func NewFuelStandardHandler(fuelStandardRepo *repositories.FuelStandardRepository) *FuelStandardHandler {
	return &FuelStandardHandler{FuelStandardRepo: fuelStandardRepo}
}

func (h *FuelStandardHandler) CreateFuelStandard(c *gin.Context) {
	var fuelStandard models.FuelStandard
	if err := c.ShouldBindJSON(&fuelStandard); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	if err := h.FuelStandardRepo.CreateFuelStandard(&fuelStandard); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Fuel standard created successfully", fuelStandard)
}

func (h *FuelStandardHandler) GetFuelStandardByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fuel standard ID", nil)
		return
	}

	fuelStandard, err := h.FuelStandardRepo.GetFuelStandardByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Fuel standard not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standard retrieved successfully", fuelStandard)
}

func (h *FuelStandardHandler) GetAllFuelStandards(c *gin.Context) {
	fuelStandards, err := h.FuelStandardRepo.GetAllFuelStandards()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standards retrieved successfully", fuelStandards)
}

func (h *FuelStandardHandler) UpdateFuelStandard(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fuel standard ID", nil)
		return
	}

	var fuelStandard models.FuelStandard
	if err := c.ShouldBindJSON(&fuelStandard); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	fuelStandard.ID = uint(id)
	if err := h.FuelStandardRepo.UpdateFuelStandard(&fuelStandard); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standard updated successfully", fuelStandard)
}

func (h *FuelStandardHandler) DeleteFuelStandard(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid fuel standard ID", nil)
		return
	}

	if err := h.FuelStandardRepo.DeleteFuelStandard(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standard deleted successfully", nil)
}

func (h *FuelStandardHandler) GetFuelStandardsByTractor(c *gin.Context) {
	tractorID, err := strconv.ParseUint(c.Param("tractorId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid tractor ID", nil)
		return
	}

	fuelStandards, err := h.FuelStandardRepo.GetFuelStandardsByTractorID(uint(tractorID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standards retrieved successfully", fuelStandards)
}

func (h *FuelStandardHandler) GetFuelStandardByTractorAndType(c *gin.Context) {
	tractorID, err := strconv.ParseUint(c.Param("tractorId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid tractor ID", nil)
		return
	}

	trailerType := c.Param("trailerType")
	loadCategory := c.Param("loadCategory")

	if trailerType == "" || loadCategory == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "trailerType and loadCategory parameters are required", nil)
		return
	}

	fuelStandard, err := h.FuelStandardRepo.GetFuelStandardByTractorAndType(uint(tractorID), trailerType, loadCategory)
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Fuel standard not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standard retrieved successfully", fuelStandard)
}

func (h *FuelStandardHandler) GetFuelStandardsByTrailerType(c *gin.Context) {
	trailerType := c.Param("trailerType")
	if trailerType == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "trailerType parameter is required", nil)
		return
	}

	fuelStandards, err := h.FuelStandardRepo.GetFuelStandardsByTrailerType(trailerType)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standards retrieved successfully", fuelStandards)
}

func (h *FuelStandardHandler) GetFuelStandardsByLoadCategory(c *gin.Context) {
	loadCategory := c.Param("loadCategory")
	if loadCategory == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "loadCategory parameter is required", nil)
		return
	}

	fuelStandards, err := h.FuelStandardRepo.GetFuelStandardsByLoadCategory(loadCategory)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Fuel standards retrieved successfully", fuelStandards)
}
