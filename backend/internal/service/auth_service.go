package service

import (
	"context"
	"errors"
	"time"

	"nepocorp/backend/internal/auth"
	"nepocorp/backend/internal/domain"
)

type UserRepository interface {
	FindByUsername(ctx context.Context, username string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
}

type AuthService struct {
	userRepo     UserRepository
	tokenManager *auth.TokenManager
}

func NewAuthService(userRepo UserRepository, secretKey string, tokenDuration time.Duration) *AuthService {
	return &AuthService{
		userRepo:     userRepo,
		tokenManager: auth.NewTokenManager(secretKey, tokenDuration*time.Hour),
	}
}

// Login authenticates a user and returns a JWT token
func (s *AuthService) Login(ctx context.Context, username, password string) (string, *domain.User, error) {
	user, err := s.userRepo.FindByUsername(ctx, username)
	if err != nil {
		return "", nil, errors.New("invalid credentials")
	}

	if !user.CheckPassword(password) {
		return "", nil, errors.New("invalid credentials")
	}

	token, err := s.tokenManager.GenerateToken(user.ID, user.Username, string(user.Role))
	if err != nil {
		return "", nil, err
	}

	// Don't return the password hash
	user.PasswordHash = ""
	return token, user, nil
}

// Register creates a new user account
func (s *AuthService) Register(ctx context.Context, username, password, fullName string, role domain.Role) (*domain.User, error) {
	// Check if user already exists
	existing, _ := s.userRepo.FindByUsername(ctx, username)
	if existing != nil {
		return nil, errors.New("username already exists")
	}

	user, err := domain.NewUser(username, password, fullName, role)
	if err != nil {
		return nil, err
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	// Don't return the password hash
	user.PasswordHash = ""
	return user, nil
}

// GetTokenManager returns the token manager instance
func (s *AuthService) GetTokenManager() *auth.TokenManager {
	return s.tokenManager
}
