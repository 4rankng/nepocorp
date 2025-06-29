package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/handlers"
	"github.com/nepocorp/backend/internal/migrations"
	"github.com/nepocorp/backend/middleware"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/routes"
	activitylogger "github.com/nepocorp/backend/services/activity-logger"
	"github.com/sirupsen/logrus"
	"gopkg.in/natefinch/lumberjack.v2"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		logrus.Warn("No .env file found")
	}

	// Initialize configuration
	cfg := config.Load()

	// Initialize logger with file rotation
	logger := logrus.New()
	logger.SetFormatter(&logrus.JSONFormatter{})
	logger.SetLevel(logrus.InfoLevel)

	// Configure log file rotation (2 days retention)
	logPath := os.Getenv("LOG_PATH")
	if logPath == "" {
		logPath = "logs/app.log" // default for development
	}
	logger.SetOutput(&lumberjack.Logger{
		Filename:   logPath,
		MaxSize:    10, // MB
		MaxAge:     2,  // days
		MaxBackups: 0,  // keep all backups within MaxAge
		LocalTime:  true,
		Compress:   true,
	})

	// Check if running migration command
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		runMigrations(cfg, logger)
		return
	}

	// Initialize database
	db, err := initDB(cfg)
	if err != nil {
		logger.Fatal("Failed to connect to database: ", err)
	}

	// Run migrations if enabled
	if cfg.RunMigrations {
		if err := migrations.Run(cfg.DatabaseURL(), logger); err != nil {
			logger.Fatal("Failed to run migrations: ", err)
		}
	}

	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	activityLogRepo := repositories.NewActivityLogRepository(db)
	expenseCategoryRepo := repositories.NewExpenseCategoryRepository(db)
	containerRepo := repositories.NewContainerRepository(db)
	tractorRepo := repositories.NewTractorRepository(db)
	trailerRepo := repositories.NewTrailerRepository(db)
	expenseRepo := repositories.NewExpenseRepository(db)
	maintenanceRepo := repositories.NewMaintenanceRepository(db)
	settingRepo := repositories.NewSettingRepository(db)
	customerRepo := repositories.NewCustomerRepository(db)
	partnerRepo := repositories.NewPartnerRepository(db)
	invoiceCategoryRepo := repositories.NewInvoiceCategoryRepository(db)
	invoiceRepo := repositories.NewInvoiceRepository(db)

	// Initialize services
	activityLogger := activitylogger.NewService(activityLogRepo, logger, cfg.ActivityLogQueueSize)

	// Initialize handlers
	healthHandler := handlers.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(userRepo, cfg, logger)
	expenseCategoryHandler := handlers.NewExpenseCategoryHandler(expenseCategoryRepo)
	containerHandler := handlers.NewContainerHandler(containerRepo)
	tractorHandler := handlers.NewTractorHandler(tractorRepo)
	trailerHandler := handlers.NewTrailerHandler(trailerRepo)
	expenseHandler := handlers.NewExpenseHandler(expenseRepo, expenseCategoryRepo)
	maintenanceHandler := handlers.NewMaintenanceHandler(maintenanceRepo)
	settingHandler := handlers.NewSettingHandler(settingRepo)
	customerHandler := handlers.NewCustomerHandler(customerRepo)
	partnerHandler := handlers.NewPartnerHandler(partnerRepo)
	invoiceCategoryHandler := handlers.NewInvoiceCategoryHandler(invoiceCategoryRepo)
	invoiceHandler := handlers.NewInvoiceHandler(invoiceRepo, invoiceCategoryRepo)

	// Initialize Gin
	gin.SetMode(gin.ReleaseMode)
	if cfg.Debug {
		gin.SetMode(gin.DebugMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(gin.Recovery())
	r.Use(middleware.Logger(logger))
	r.Use(middleware.Cors())
	r.Use(middleware.ActivityLogger(activityLogger))

	// Initialize routes
	routes.Setup(r, cfg, healthHandler, authHandler, userRepo, expenseCategoryHandler,
		containerHandler, tractorHandler, trailerHandler, expenseHandler, maintenanceHandler, settingHandler, customerHandler, partnerHandler, invoiceCategoryHandler, invoiceHandler, logger)

	// Create HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  cfg.ReadTimeout,
		WriteTimeout: cfg.WriteTimeout,
	}

	// Start server
	go func() {
		logger.Infof("Starting server on port %s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Failed to start server: ", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	// Graceful shutdown with timeout
	ctx, cancel := context.WithTimeout(context.Background(), cfg.GracefulShutdownTimeout)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown: ", err)
	}

	logger.Info("Server exiting")
}

func initDB(cfg *config.Config) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(cfg.DatabaseDSN()), &gorm.Config{})
	if err != nil {
		return nil, err
	}

	// Configure connection pool
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(cfg.DBMaxOpenConns)
	sqlDB.SetMaxIdleConns(cfg.DBMaxIdleConns)
	sqlDB.SetConnMaxLifetime(cfg.DBConnMaxLifetime)

	// Auto-migrate models
	if err := db.AutoMigrate(
		&models.User{},
		&models.ActivityLog{},
		&models.ExpenseCategory{},
		&models.Container{},
		&models.Tractor{},
		&models.Trailer{},
		&models.Expense{},
		&models.ExpenseItem{},
		&models.Maintenance{},
		&models.Setting{},
		&models.Customer{},
		&models.Partner{},
		&models.InvoiceCategory{},
		&models.Invoice{},
		&models.InvoiceItem{},
	); err != nil {
		return nil, err
	}

	return db, nil
}

func runMigrations(cfg *config.Config, logger *logrus.Logger) {
	if len(os.Args) < 3 {
		logger.Fatal("Usage: api migrate [up|down]")
	}

	direction := os.Args[2]
	switch direction {
	case "up":
		if err := migrations.Run(cfg.DatabaseURL(), logger); err != nil {
			logger.Fatal("Failed to run migrations up: ", err)
		}
		logger.Info("Migrations completed successfully")
	case "down":
		logger.Info("Migration rollback not implemented yet")
	default:
		logger.Fatal("Unknown migration direction. Use 'up' or 'down'")
	}
}
