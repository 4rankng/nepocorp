package utils

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

// FormatLastUpdatedBy formats the user information for the last_updated_by field
// Returns format: "Name (@username)"
func FormatLastUpdatedBy(user *models.User) string {
	if user == nil {
		return ""
	}
	return user.Name + " (@" + user.Username + ")"
}

// GetFormattedLastUpdatedBy retrieves user by ID and returns formatted last_updated_by string
func GetFormattedLastUpdatedBy(db *gorm.DB, userID uint) (string, error) {
	var user models.User
	err := db.First(&user, userID).Error
	if err != nil {
		return "", err
	}
	return FormatLastUpdatedBy(&user), nil
}