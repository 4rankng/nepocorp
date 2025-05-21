package dto

import "nepocorp/backend/internal/domain"

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username string      `json:"username" binding:"required,min=3,max=50"`
	Password string      `json:"password" binding:"required,min=8"`
	FullName string      `json:"full_name" binding:"required"`
	Role     domain.Role `json:"role" binding:"required,oneof=admin manager accountant driver"`
}

type AuthResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

func NewAuthResponse(token string, user *domain.User) *AuthResponse {
	return &AuthResponse{
		Token: token,
		User:  user,
	}
}
