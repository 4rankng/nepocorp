package repositories

import (
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/utils"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) Create(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) CreateWithUser(user *models.User, createdByUserID uint) error {
	// Set LastUpdatedBy using the user information
	lastUpdatedBy, err := utils.GetFormattedLastUpdatedBy(r.db, createdByUserID)
	if err != nil {
		return err
	}
	user.LastUpdatedBy = lastUpdatedBy
	return r.db.Create(user).Error
}

func (r *UserRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Update(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) UpdateWithUser(user *models.User, updatedByUserID uint) error {
	// Set LastUpdatedBy using the user information
	lastUpdatedBy, err := utils.GetFormattedLastUpdatedBy(r.db, updatedByUserID)
	if err != nil {
		return err
	}
	user.LastUpdatedBy = lastUpdatedBy
	return r.db.Save(user).Error
}

func (r *UserRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}

func (r *UserRepository) List(offset, limit int) ([]*models.User, error) {
	var users []*models.User
	err := r.db.Offset(offset).Limit(limit).Find(&users).Error
	return users, err
}
