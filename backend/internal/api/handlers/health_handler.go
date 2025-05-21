package handlers

import (
	"net/http"

	"nepocorp/backend/internal/data"

	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	db *data.DB
}

func NewHealthHandler(db *data.DB) *HealthHandler {
	return &HealthHandler{
		db: db,
	}
}

// HealthCheck godoc
// @Summary Health check
// @Description Check if the API is up and database is connected
// @Tags health
// @Produce json
// @Success 200 {object} map[string]string
// @Router /health [get]
func (h *HealthHandler) HealthCheck(c *gin.Context) {
	// Check database connection
	err := h.db.Ping()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"status":  "error",
			"message": "Database connection error",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"message": "Service is healthy",
	})
}
