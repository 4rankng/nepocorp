package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type TractorRepository struct {
	db *gorm.DB
}

func NewTractorRepository(db *gorm.DB) *TractorRepository {
	return &TractorRepository{db: db}
}

func (r *TractorRepository) Create(tractor *models.Tractor) error {
	return r.db.Create(tractor).Error
}

func (r *TractorRepository) FindByID(id uint) (*models.Tractor, error) {
	var tractor models.Tractor
	err := r.db.First(&tractor, id).Error
	if err != nil {
		return nil, err
	}
	return &tractor, nil
}

func (r *TractorRepository) Update(tractor *models.Tractor) error {
	return r.db.Save(tractor).Error
}

func (r *TractorRepository) Delete(id uint) error {
	return r.db.Delete(&models.Tractor{}, id).Error
}

func (r *TractorRepository) List(offset, limit int) ([]*models.Tractor, error) {
	var tractors []*models.Tractor
	query := r.db

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&tractors).Error
	return tractors, err
}

func (r *TractorRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Tractor{}).Count(&count).Error
	return count, err
}
