package middleware

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/models"
	activitylogger "github.com/nepocorp/backend/services/activity-logger"
)

const (
	maxRequestBodySize = 10 * 1024 // 10KB max for logging
	sensitiveFields    = "password|token|secret|key|authorization"
)

func ActivityLogger(logger *activitylogger.Service) gin.HandlerFunc {
	sensitiveRegex := regexp.MustCompile(`(?i)` + sensitiveFields)

	return func(c *gin.Context) {
		// Skip logging for health check
		if c.Request.URL.Path == "/healthz" {
			c.Next()
			return
		}

		start := time.Now()

		// Read request body
		var requestData map[string]interface{}
		var readError error

		if c.Request.Method != "GET" && c.Request.Method != "DELETE" && c.Request.Body != nil {
			// Limit body size for logging
			limitedReader := io.LimitReader(c.Request.Body, maxRequestBodySize)
			bodyBytes, err := io.ReadAll(limitedReader)

			if err != nil {
				readError = err
				c.Request.Body = io.NopCloser(bytes.NewReader([]byte{}))
			} else {
				// Reset the body for the actual handler
				c.Request.Body = io.NopCloser(io.MultiReader(
					bytes.NewReader(bodyBytes),
					c.Request.Body,
				))

				if len(bodyBytes) > 0 {
					if err := json.Unmarshal(bodyBytes, &requestData); err != nil {
						// Store raw body if JSON parsing fails
						requestData = map[string]interface{}{
							"_raw":        string(bodyBytes),
							"_parseError": err.Error(),
						}
					}
				}
			}
		}

		// Sanitize sensitive data
		requestData = sanitizeRequestData(requestData, sensitiveRegex)

		// Get user ID from context
		userID, _ := c.Get("userID")
		userIDUint, _ := userID.(uint)

		// Determine if this is a special endpoint
		isLoginAttempt := c.Request.URL.Path == "/api/v1/auth/login"
		isAuthEndpoint := strings.HasPrefix(c.Request.URL.Path, "/api/v1/auth/")

		// Extract username for login attempts
		var username string
		if isLoginAttempt && requestData != nil {
			if u, ok := requestData["username"].(string); ok {
				username = u
			}
		}

		// Create activity log entry
		log := &models.ActivityLog{
			UserID:      userIDUint,
			Action:      getSemanticAction(c.Request.Method, c.Request.URL.Path),
			Resource:    extractResource(c.Request.URL.Path),
			ResourceID:  extractResourceID(c),
			IPAddress:   c.ClientIP(),
			UserAgent:   c.Request.UserAgent(),
			RequestData: models.JSONMap(requestData),
			CreatedAt:   time.Now(),
		}

		// Add metadata for special cases
		if readError != nil {
			if log.RequestData == nil {
				log.RequestData = make(models.JSONMap)
			}
			log.RequestData["_readError"] = readError.Error()
		}

		if username != "" {
			if log.RequestData == nil {
				log.RequestData = make(models.JSONMap)
			}
			log.RequestData["_username"] = username
		}

		// Process request
		c.Next()

		// Update response status and duration
		log.ResponseStatus = c.Writer.Status()
		duration := time.Since(start)

		if log.RequestData == nil {
			log.RequestData = make(models.JSONMap)
		}
		log.RequestData["_duration_ms"] = duration.Milliseconds()

		// Log all requests, including unauthenticated ones
		shouldLog := true

		// For auth endpoints, always log
		if isAuthEndpoint {
			shouldLog = true
		} else if userIDUint == 0 {
			// For non-auth endpoints without user, only log if it's an error
			shouldLog = log.ResponseStatus >= 400
		}

		if shouldLog {
			logger.Log(log)
		}
	}
}

func getSemanticAction(method, path string) string {
	// Special cases first
	if path == "/api/v1/auth/login" {
		return "login_attempt"
	}
	if path == "/api/v1/auth/refresh" {
		return "refresh_token"
	}
	if path == "/api/v1/auth/profile" {
		return "view_profile"
	}

	// Extract the resource type from the path
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 3 {
		return strings.ToLower(method)
	}

	resource := parts[2] // e.g., "users", "expense", "invoice"

	// Handle sub-resources (e.g., /expense/:id/item)
	if len(parts) > 4 && parts[4] != "" {
		subResource := parts[4]
		switch method {
		case "POST":
			return fmt.Sprintf("add_%s_to_%s", subResource, resource)
		case "PUT", "PATCH":
			return fmt.Sprintf("update_%s_in_%s", subResource, resource)
		case "DELETE":
			return fmt.Sprintf("remove_%s_from_%s", subResource, resource)
		}
	}

	// Create semantic action based on method and resource
	switch method {
	case "GET":
		if strings.Contains(path, "/:") || regexp.MustCompile(`/\d+`).MatchString(path) {
			return fmt.Sprintf("view_%s", strings.TrimSuffix(resource, "s"))
		}
		return fmt.Sprintf("list_%s", resource)
	case "POST":
		return fmt.Sprintf("create_%s", strings.TrimSuffix(resource, "s"))
	case "PUT", "PATCH":
		return fmt.Sprintf("update_%s", strings.TrimSuffix(resource, "s"))
	case "DELETE":
		return fmt.Sprintf("delete_%s", strings.TrimSuffix(resource, "s"))
	default:
		return fmt.Sprintf("%s_%s", strings.ToLower(method), resource)
	}
}

func extractResource(path string) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if len(parts) < 3 {
		return path
	}

	resource := parts[2]

	// Normalize resource names
	resource = strings.ReplaceAll(resource, "_", "-")
	resource = strings.ReplaceAll(resource, "expense_category", "expense-category")
	resource = strings.ReplaceAll(resource, "invoice_category", "invoice-category")
	resource = strings.ReplaceAll(resource, "financial-ledger", "financial-ledger")
	resource = strings.ReplaceAll(resource, "fuel-standard", "fuel-standard")

	return resource
}

func extractResourceID(c *gin.Context) string {
	// Try to get ID from route parameters
	if id := c.Param("id"); id != "" {
		return id
	}

	// Try common parameter names
	for _, param := range []string{"itemId", "item_id", "tractorId", "customerId", "partnerId", "trailerType", "loadCategory"} {
		if id := c.Param(param); id != "" {
			return id
		}
	}

	// Try to extract from the actual path if it contains a numeric ID
	if matches := regexp.MustCompile(`/(\d+)(?:/|$)`).FindStringSubmatch(c.Request.URL.Path); len(matches) > 1 {
		return matches[1]
	}

	return ""
}

func sanitizeRequestData(data map[string]interface{}, sensitiveRegex *regexp.Regexp) map[string]interface{} {
	if data == nil {
		return nil
	}

	sanitized := make(map[string]interface{})

	for k, v := range data {
		if sensitiveRegex.MatchString(k) {
			sanitized[k] = "[REDACTED]"
		} else {
			switch val := v.(type) {
			case map[string]interface{}:
				sanitized[k] = sanitizeRequestData(val, sensitiveRegex)
			case []interface{}:
				// Handle arrays
				sanitizedArray := make([]interface{}, len(val))
				for i, item := range val {
					if mapItem, ok := item.(map[string]interface{}); ok {
						sanitizedArray[i] = sanitizeRequestData(mapItem, sensitiveRegex)
					} else {
						sanitizedArray[i] = item
					}
				}
				sanitized[k] = sanitizedArray
			case string:
				// Truncate long strings
				if len(val) > 1000 {
					sanitized[k] = val[:1000] + "...[truncated]"
				} else {
					sanitized[k] = val
				}
			default:
				sanitized[k] = v
			}
		}
	}

	return sanitized
}
