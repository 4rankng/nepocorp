package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/models"
	activitylogger "github.com/nepocorp/backend/services/activity-logger"
)

func ActivityLogger(logger *activitylogger.Service) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip logging for health check
		if c.Request.URL.Path == "/healthz" {
			c.Next()
			return
		}

		// Read request body
		var requestData map[string]interface{}
		if c.Request.Method != "GET" && c.Request.Method != "DELETE" {
			bodyBytes, _ := io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
			if err := json.Unmarshal(bodyBytes, &requestData); err != nil {
				// Log error but continue processing
				requestData = nil
			}
		}

		// Get user ID from context (set by JWT middleware)
		userID, _ := c.Get("userID")
		userIDUint, _ := userID.(uint)

		// Create activity log entry
		log := &models.ActivityLog{
			UserID:      userIDUint,
			Action:      c.Request.Method,
			Resource:    c.Request.URL.Path,
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			RequestData: models.JSONMap(requestData),
			CreatedAt:   time.Now(),
		}

		// Process request
		c.Next()

		// Update response status
		log.ResponseStatus = c.Writer.Status()

		// Log the activity asynchronously
		if userIDUint > 0 {
			logger.Log(log)
		}
	}
}
