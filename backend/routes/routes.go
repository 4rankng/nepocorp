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
	tractorExpenseHandler *handlers.TractorExpenseHandler,
	settingHandler *handlers.SettingHandler,
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

			// Tractor expenses
			protected.GET("/tractor_expense", tractorExpenseHandler.List)
			protected.POST("/tractor_expense", tractorExpenseHandler.Create)
			protected.GET("/tractor_expense/:id", tractorExpenseHandler.GetByID)
			protected.PUT("/tractor_expense/:id", tractorExpenseHandler.Update)
			protected.DELETE("/tractor_expense/:id", tractorExpenseHandler.Delete)

			// Tractor expense items
			protected.POST("/tractor_expense/:id/item", tractorExpenseHandler.CreateItem)
			protected.PUT("/tractor_expense/:id/item/:item_id", tractorExpenseHandler.UpdateItem)
			protected.DELETE("/tractor_expense/:id/item/:item_id", tractorExpenseHandler.DeleteItem)

			// Settings
			protected.GET("/settings/:key", settingHandler.GetByKey)
			protected.PUT("/settings/:key", settingHandler.UpdateByKey)
		}
	}
}
