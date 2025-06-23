package middleware

import (
	"net/http"

	"github.com/casbin/casbin/v2"
	"github.com/gin-gonic/gin"
)

func CasbinAuth(enforcer *casbin.Enforcer) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user role from context (set by JWT middleware)
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		// Get the request path and method
		obj := c.Request.URL.Path
		act := c.Request.Method

		// Check permission
		ok, err := enforcer.Enforce(role.(string), obj, act)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error checking permissions"})
			c.Abort()
			return
		}

		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied"})
			c.Abort()
			return
		}

		c.Next()
	}
}
