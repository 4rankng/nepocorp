package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type SettingRepository struct {
	db *gorm.DB
}

func NewSettingRepository(db *gorm.DB) *SettingRepository {
	return &SettingRepository{db: db}
}

func (r *SettingRepository) GetByKey(key string) (*models.Setting, error) {
	var setting models.Setting
	err := r.db.Where("`key` = ?", key).First(&setting).Error
	if err != nil {
		return nil, err
	}
	return &setting, nil
}

func (r *SettingRepository) UpdateByKey(key, value string, userID uint) (*models.Setting, error) {
	var setting models.Setting
	
	// Get user information to format LastUpdatedBy string
	var user models.User
	err := r.db.First(&user, userID).Error
	if err != nil {
		return nil, err
	}
	lastUpdatedBy := user.Name + " (" + user.Username + ")"
	
	// First try to find existing setting
	err = r.db.Where("`key` = ?", key).First(&setting).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new setting if it doesn't exist
			setting = models.Setting{
				Key:           key,
				Value:         value,
				LastUpdatedBy: lastUpdatedBy,
			}
			err = r.db.Create(&setting).Error
			if err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	} else {
		// Update existing setting
		setting.Value = value
		setting.LastUpdatedBy = lastUpdatedBy
		err = r.db.Save(&setting).Error
		if err != nil {
			return nil, err
		}
	}
	
	return &setting, nil
}