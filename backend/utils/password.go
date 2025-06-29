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
	// Check if this is a development/SQL-generated hash (hex string)
	if len(hashedPassword) == 64 && isHexString(hashedPassword) {
		// This is a simple SHA256 hash from SQL mock data
		expectedHash := fmt.Sprintf("%x", sha256.Sum256([]byte(password+salt+secret)))
		if hashedPassword == expectedHash {
			return nil
		}
		return fmt.Errorf("password mismatch")
	}

	// Standard bcrypt verification
	// First, create HMAC with secret
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(password + salt))
	saltedPassword := hex.EncodeToString(h.Sum(nil))

	// Then compare with bcrypt
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(saltedPassword))
}

// isHexString checks if a string contains only hexadecimal characters
func isHexString(s string) bool {
	for _, c := range s {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}
	return true
}
