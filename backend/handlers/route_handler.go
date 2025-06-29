package handlers

import (
	"net/http"
	"strconv"

	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"

	"github.com/gin-gonic/gin"
)

type RouteHandler struct {
	RouteRepo *repositories.RouteRepository
}

func NewRouteHandler(routeRepo *repositories.RouteRepository) *RouteHandler {
	return &RouteHandler{RouteRepo: routeRepo}
}

func (h *RouteHandler) CreateRoute(c *gin.Context) {
	var route models.Route
	if err := c.ShouldBindJSON(&route); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	if err := h.RouteRepo.CreateRoute(&route); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Route created successfully", route)
}

func (h *RouteHandler) GetRouteByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid route ID", nil)
		return
	}

	route, err := h.RouteRepo.GetRouteByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Route not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Route retrieved successfully", route)
}

func (h *RouteHandler) GetAllRoutes(c *gin.Context) {
	routes, err := h.RouteRepo.GetAllRoutes()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Routes retrieved successfully", routes)
}

func (h *RouteHandler) UpdateRoute(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid route ID", nil)
		return
	}

	var route models.Route
	if err := c.ShouldBindJSON(&route); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	route.ID = uint(id)
	if err := h.RouteRepo.UpdateRoute(&route); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Route updated successfully", route)
}

func (h *RouteHandler) DeleteRoute(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid route ID", nil)
		return
	}

	if err := h.RouteRepo.DeleteRoute(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Route deleted successfully", nil)
}