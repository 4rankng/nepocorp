package main

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"nepocorp/backend/internal/api/handlers"
	"nepocorp/backend/internal/data"
	"nepocorp/backend/internal/service"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
)

func main() {
	// Initialize database connection
	db, err := initDB()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize repositories and services
	reportRepo := data.NewReportRepository(db)
	reportService := service.NewReportService(reportRepo)

	// Create handlers
	healthHandler := handlers.NewHealthHandler(db)
	reportHandler := handlers.NewReportHandler(reportService)

	// Set Gin mode
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// Initialize router
	r := gin.Default()

	// Add CORS middleware
	r.Use(corsMiddleware())

	// Setup routes
	setupRoutes(r, healthHandler, reportHandler)

	// Start server
	port := ":8080"
	server := &http.Server{
		Addr:         port,
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	log.Printf("Server starting on port %s", port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func initDB() (*data.DB, error) {
	dsn := os.Getenv("DB_USER") + ":" + os.Getenv("DB_PASSWORD") + "@tcp(" + 
		os.Getenv("DB_HOST") + ":" + os.Getenv("DB_PORT") + ")/" + os.Getenv("DB_NAME") + 
		"?parseTime=true&multiStatements=true"

	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}

	db := &data.DB{DB: sqlDB}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test the connection
	if err := db.Ping(); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func setupRoutes(r *gin.Engine, healthHandler *handlers.HealthHandler, reportHandler *handlers.ReportHandler) {
	// Health check
	r.GET("/health", healthHandler.HealthCheck)

	// API v1
	v1 := r.Group("/api/v1")
	{
		reports := v1.Group("/reports")
		{
			reports.POST("/generate", reportHandler.GenerateReport)
			reports.POST("/export", reportHandler.ExportReport)
		}
	}
}
