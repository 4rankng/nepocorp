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

func (r *SettingRepository) UpdateByKey(key, value string) (*models.Setting, error) {
	var setting models.Setting

	// First try to find existing setting
	err := r.db.Where("`key` = ?", key).First(&setting).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new setting if it doesn't exist
			setting = models.Setting{
				Key:   key,
				Value: value,
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
		err = r.db.Save(&setting).Error
		if err != nil {
			return nil, err
		}
	}

	return &setting, nil
}
