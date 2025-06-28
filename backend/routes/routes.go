package routes

import (
	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/handlers"
	"github.com/nepocorp/backend/middleware"
	"github.com/nepocorp/backend/repositories"
	"github.com/sirupsen/logrus"
	"github.com/ulule/limiter/v3"
	mgin "github.com/ulule/limiter/v3/drivers/middleware/gin"
	"github.com/ulule/limiter/v3/drivers/store/memory"
)

func Setup(
	r *gin.Engine,
	cfg *config.Config,
	healthHandler *handlers.HealthHandler,
	authHandler *handlers.AuthHandler,
	userRepo *repositories.UserRepository,
	expenseCategoryHandler *handlers.ExpenseCategoryHandler,
	containerHandler *handlers.ContainerHandler,
	tractorHandler *handlers.TractorHandler,
	trailerHandler *handlers.TrailerHandler,
	expenseHandler *handlers.ExpenseHandler,
	maintenanceHandler *handlers.MaintenanceHandler,
	settingHandler *handlers.SettingHandler,
	customerHandler *handlers.CustomerHandler,
	partnerHandler *handlers.PartnerHandler,
	logger *logrus.Logger,
) {
	// Rate limiter
	rate := limiter.Rate{
		Period: 1,
		Limit:  int64(cfg.RateLimitRPS),
	}
	store := memory.NewStore()
	rateLimiter := limiter.New(store, rate)

	// Public routes
	public := r.Group("/")
	{
		// Apply rate limiting to public routes
		public.Use(mgin.NewMiddleware(rateLimiter))

		// Health check
		public.GET("/healthz", healthHandler.Check)
	}

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Apply rate limiting
		v1.Use(mgin.NewMiddleware(rateLimiter))

		// Auth routes
		auth := v1.Group("/auth")
		{
			// Username/password login
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// Protected routes
		protected := v1.Group("/")
		protected.Use(middleware.JWTAuth(cfg))
		{
			// User profile
			protected.GET("/auth/profile", authHandler.GetProfile)
			
			// Expense categories
			protected.GET("/expense_category", expenseCategoryHandler.List)
			protected.POST("/expense_category", expenseCategoryHandler.Create)
			protected.PUT("/expense_category/:id", expenseCategoryHandler.Update)
			protected.DELETE("/expense_category/:id", expenseCategoryHandler.Delete)

			// Containers
			protected.GET("/container", containerHandler.List)
			protected.POST("/container", containerHandler.Create)
			protected.PUT("/container/:id", containerHandler.Update)
			protected.DELETE("/container/:id", containerHandler.Delete)

			// Tractors
			protected.GET("/tractor", tractorHandler.List)
			protected.POST("/tractor", tractorHandler.Create)
			protected.PUT("/tractor/:id", tractorHandler.Update)
			protected.DELETE("/tractor/:id", tractorHandler.Delete)

			// Trailers
			protected.GET("/trailer", trailerHandler.List)
			protected.POST("/trailer", trailerHandler.Create)
			protected.PUT("/trailer/:id", trailerHandler.Update)
			protected.DELETE("/trailer/:id", trailerHandler.Delete)

			// Expenses
			protected.GET("/expense", expenseHandler.List)
			protected.POST("/expense", expenseHandler.Create)
			protected.GET("/expense/:id", expenseHandler.GetByID)
			protected.PUT("/expense/:id", expenseHandler.Update)
			protected.DELETE("/expense/:id", expenseHandler.Delete)

			// Expense items
			protected.POST("/expense/:id/item", expenseHandler.CreateItem)
			protected.PUT("/expense/:id/item/:item_id", expenseHandler.UpdateItem)
			protected.DELETE("/expense/:id/item/:item_id", expenseHandler.DeleteItem)

			// Maintenance
			protected.GET("/maintenance", maintenanceHandler.GetAll)
			protected.POST("/maintenance", maintenanceHandler.Create)
			protected.GET("/maintenance/:id", maintenanceHandler.GetByID)
			protected.PUT("/maintenance/:id", maintenanceHandler.Update)
			protected.DELETE("/maintenance/:id", maintenanceHandler.Delete)

			// Settings
			protected.GET("/settings/:key", settingHandler.GetByKey)
			protected.PUT("/settings/:key", settingHandler.UpdateByKey)

			// Customers
			protected.GET("/customer", customerHandler.GetAllCustomers)
			protected.POST("/customer", customerHandler.CreateCustomer)
			protected.GET("/customer/:id", customerHandler.GetCustomerByID)
			protected.PUT("/customer/:id", customerHandler.UpdateCustomer)
			protected.DELETE("/customer/:id", customerHandler.DeleteCustomer)

			// Partners
			protected.GET("/partner", partnerHandler.GetAllPartners)
			protected.POST("/partner", partnerHandler.CreatePartner)
			protected.GET("/partner/:id", partnerHandler.GetPartnerByID)
			protected.PUT("/partner/:id", partnerHandler.UpdatePartner)
			protected.DELETE("/partner/:id", partnerHandler.DeletePartner)
		}
	}
}
