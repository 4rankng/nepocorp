package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type ContainerRepository struct {
	db *gorm.DB
}

func NewContainerRepository(db *gorm.DB) *ContainerRepository {
	return &ContainerRepository{db: db}
}

func (r *ContainerRepository) Create(container *models.Container) error {
	return r.db.Create(container).Error
}

func (r *ContainerRepository) FindByID(id uint) (*models.Container, error) {
	var container models.Container
	err := r.db.First(&container, id).Error
	if err != nil {
		return nil, err
	}
	return &container, nil
}

func (r *ContainerRepository) Update(container *models.Container) error {
	return r.db.Save(container).Error
}

func (r *ContainerRepository) Delete(id uint) error {
	return r.db.Delete(&models.Container{}, id).Error
}

func (r *ContainerRepository) List(offset, limit int) ([]*models.Container, error) {
	var containers []*models.Container
	query := r.db

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&containers).Error
	return containers, err
}

func (r *ContainerRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Container{}).Count(&count).Error
	return count, err
}
