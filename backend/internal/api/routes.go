package api

import (
	"nepocorp/backend/internal/api/handlers"
	"nepocorp/backend/internal/service"

	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all the routes for the application
func SetupRoutes(router *gin.Engine, reportService *service.ReportService) {
	// Initialize handlers
	reportHandler := handlers.NewReportHandler(reportService)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Public routes (no authentication required)
		auth := v1.Group("/auth")
		{
			auth.POST("/login", Login)
			auth.POST("/register", Register)
		}

		// Reports - public for now, but should be protected in production
		reports := v1.Group("/reports")
		{
			reports.POST("/generate", reportHandler.GenerateReport)
			reports.POST("/export", reportHandler.ExportReport)
		}

		// Protected routes (require authentication)
		api := v1.Group("")
		// api.Use(middleware.AuthRequired()) // Uncomment when auth middleware is implemented
		{
			// Users
			users := api.Group("/users")
			{
				users.GET("", ListUsers)
				users.GET("/:id", GetUser)
			}

			// Roles
			api.GET("/roles", ListRoles)

			// Trips
			trips := api.Group("/trips")
			{
				trips.POST("", CreateTrip)
				trips.GET("", ListTrips)
			}

			// Add more route groups here as needed
		}
	}
}
