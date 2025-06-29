package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/nepocorp/backend/common"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

// AuthHandler handles authentication
type AuthHandler struct {
	userRepo *repositories.UserRepository
	config   *config.Config
	logger   *logrus.Logger
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(userRepo *repositories.UserRepository, cfg *config.Config, logger *logrus.Logger) *AuthHandler {
	return &AuthHandler{
		userRepo: userRepo,
		config:   cfg,
		logger:   logger,
	}
}

// LoginRequest represents the login request payload
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse represents the login response
type LoginResponse struct {
	Token        string `json:"token"`
	RefreshToken string `json:"refresh_token"`
	User         struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Name     string `json:"name"`
		Role     string `json:"role"`
	} `json:"user"`
}

// Login handles username/password login
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Find user by username
	user, err := h.userRepo.FindByUsername(req.Username)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrInvalidCredentials,
				utils.ErrorDetail{Code: common.CodeInvalidCredentials, Message: "Invalid username or password"})
			return
		}
		h.logger.WithError(err).Error("Failed to find user")
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer,
			utils.ErrorDetail{Code: common.CodeDatabaseError, Message: err.Error()})
		return
	}

	// Verify password
	if err := utils.CheckPassword(req.Password, user.Password, h.config.HashSecret, h.config.HashSalt); err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrInvalidCredentials,
			utils.ErrorDetail{Code: common.CodeInvalidCredentials, Message: "Invalid username or password"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUserNotActive,
			utils.ErrorDetail{Code: common.CodeUserNotActive, Message: "User account is not active"})
		return
	}

	// Generate tokens
	token, err := utils.GenerateToken(user, h.config)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate token")
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer,
			utils.ErrorDetail{Code: common.CodeInternalError, Message: "Failed to generate token"})
		return
	}

	refreshToken, err := utils.GenerateRefreshToken(user, h.config)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate refresh token")
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer,
			utils.ErrorDetail{Code: common.CodeInternalError, Message: "Failed to generate refresh token"})
		return
	}

	// Prepare response
	response := LoginResponse{
		Token:        token,
		RefreshToken: refreshToken,
	}
	response.User.ID = user.ID
	response.User.Username = user.Username
	response.User.Email = user.Email
	response.User.Name = user.Name
	response.User.Role = user.Role

	utils.SuccessResponse(c, http.StatusOK, common.MsgLoginSuccess, response)
}

// RefreshTokenRequest represents the refresh token request
type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}

// RefreshToken handles token refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, common.ErrInvalidInput,
			utils.ErrorDetail{Code: common.CodeBadRequest, Message: err.Error()})
		return
	}

	// Parse and validate refresh token
	token, err := jwt.ParseWithClaims(req.RefreshToken, &utils.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return []byte(h.config.JWTSecret), nil
	})

	if err != nil || !token.Valid {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrInvalidToken,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "Invalid refresh token"})
		return
	}

	claims, ok := token.Claims.(*utils.Claims)
	if !ok {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrInvalidToken,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "Invalid token claims"})
		return
	}

	// Get user
	user, err := h.userRepo.FindByID(claims.UserID)
	if err != nil {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrInvalidToken,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User not found"})
		return
	}

	// Check if user is active
	if !user.IsActive {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUserNotActive,
			utils.ErrorDetail{Code: common.CodeUserNotActive, Message: "User account is not active"})
		return
	}

	// Generate new tokens
	newToken, err := utils.GenerateToken(user, h.config)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate token")
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer,
			utils.ErrorDetail{Code: common.CodeInternalError, Message: "Failed to generate token"})
		return
	}

	newRefreshToken, err := utils.GenerateRefreshToken(user, h.config)
	if err != nil {
		h.logger.WithError(err).Error("Failed to generate refresh token")
		utils.ErrorResponse(c, http.StatusInternalServerError, common.ErrInternalServer,
			utils.ErrorDetail{Code: common.CodeInternalError, Message: "Failed to generate refresh token"})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgTokenRefreshed, gin.H{
		"token":         newToken,
		"refresh_token": newRefreshToken,
	})
}

// GetProfile returns the current user's profile
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		utils.ErrorResponse(c, http.StatusUnauthorized, common.ErrUnauthorized,
			utils.ErrorDetail{Code: common.CodeUnauthorized, Message: "User not authenticated"})
		return
	}

	user, err := h.userRepo.FindByID(userID.(uint))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, common.ErrNotFound,
			utils.ErrorDetail{Code: common.CodeNotFound, Message: "User not found"})
		return
	}

	utils.SuccessResponse(c, http.StatusOK, common.MsgProfileRetrieved, user)
}
