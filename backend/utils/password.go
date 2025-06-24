package utils

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword generates a bcrypt hash for the given password with secret and salt
func HashPassword(password, secret, salt string) (string, error) {
	// First, create HMAC with secret
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(password + salt))
	saltedPassword := hex.EncodeToString(h.Sum(nil))
	
	// Then use bcrypt for the final hash
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(saltedPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hashedPassword), nil
}

// CheckPassword compares a plain password with a hashed password using secret and salt
func CheckPassword(password, hashedPassword, secret, salt string) error {
	// First, create HMAC with secret
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(password + salt))
	saltedPassword := hex.EncodeToString(h.Sum(nil))
	
	// Then compare with bcrypt
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(saltedPassword))
}