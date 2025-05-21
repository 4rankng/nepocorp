package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthRequired is a middleware that checks for a valid JWT token
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Implement JWT token validation
		// tokenString := c.GetHeader("Authorization")
		// if tokenString == "" {
		//     c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
		//     c.Abort()
		//     return
		// }
		// Validate token and extract claims
		// ...
		c.Next()
	}
}

// RoleRequired checks if the user has the required role
func RoleRequired(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: Get user role from context (set by AuthRequired)
		// userRole := c.GetString("user_role")
		// for _, role := range roles {
		//     if userRole == role {
		//         c.Next()
		//         return
		// }
		// c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		// c.Abort()
		c.Next()
	}
}

// ErrorHandler is a middleware to handle errors consistently
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		err := c.Errors.Last()
		if err == nil {
			return
		}

		// Handle the error
		switch e := err.Err.(type) {
		case *gin.Error:
			c.JSON(-1, gin.H{"error": e.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal Server Error"})
		}
	}
}
