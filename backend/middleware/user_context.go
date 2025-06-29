package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/utils"
	"gorm.io/gorm"
)

// UserContextMiddleware adds user information to GORM context for automatic tracking
func UserContextMiddleware(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Extract user info from Gin context (set by JWT middleware)
		userInfo, err := utils.GetUserFromGinContext(c)
		if err == nil {
			// Add user info to request context for GORM callbacks
			ctx := utils.SetUserInContext(c.Request.Context(), userInfo)
			c.Request = c.Request.WithContext(ctx)

			// Set the database instance with the updated context in Gin context
			// This allows handlers to access the database with user context
			c.Set("db", db.WithContext(ctx))
		}

		c.Next()
	}
}
