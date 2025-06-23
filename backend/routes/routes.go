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
	userRepo *repositories.UserRepository,
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

		// Auth routes (to be implemented)
		auth := v1.Group("/auth")
		{
			_ = auth // Placeholder
		}

		// Protected routes (to be implemented)
		protected := v1.Group("/")
		protected.Use(middleware.JWTAuth(cfg))
		{
			_ = protected // Placeholder
		}
	}
}
