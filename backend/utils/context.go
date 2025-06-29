package utils

import (
	"context"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

// UserInfo holds user information from JWT context
type UserInfo struct {
	ID       uint
	Username string
	Name     string
}

// GetUserFromGinContext extracts user information from Gin context
func GetUserFromGinContext(c *gin.Context) (*UserInfo, error) {
	userID, exists := c.Get("userID")
	if !exists {
		return nil, fmt.Errorf("user ID not found in context")
	}

	username, exists := c.Get("username")
	if !exists {
		return nil, fmt.Errorf("username not found in context")
	}

	return &UserInfo{
		ID:       userID.(uint),
		Username: username.(string),
	}, nil
}

// GetFormattedUserFromGinContext gets formatted user string from Gin context
// Uses database to get user's full name for proper formatting
func GetFormattedUserFromGinContext(c *gin.Context, db *gorm.DB) (string, error) {
	userInfo, err := GetUserFromGinContext(c)
	if err != nil {
		return "", err
	}

	var user models.User
	err = db.First(&user, userInfo.ID).Error
	if err != nil {
		return "", err
	}

	return FormatLastUpdatedBy(&user), nil
}

// GetUserFromContext extracts user information from standard context
// This is used in GORM callbacks where we store user info in context
func GetUserFromContext(ctx context.Context) (*UserInfo, error) {
	userInfo, ok := ctx.Value(UserContextKey).(*UserInfo)
	if !ok {
		return nil, fmt.Errorf("user not found in context")
	}
	return userInfo, nil
}

// ContextKey is a custom type for context keys to avoid collisions
type ContextKey string

const UserContextKey ContextKey = "user"

// SetUserInContext sets user information in context for GORM callbacks
func SetUserInContext(ctx context.Context, userInfo *UserInfo) context.Context {
	return context.WithValue(ctx, UserContextKey, userInfo)
}
