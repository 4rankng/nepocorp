package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type TrailerRepository struct {
	db *gorm.DB
}

func NewTrailerRepository(db *gorm.DB) *TrailerRepository {
	return &TrailerRepository{db: db}
}

func (r *TrailerRepository) Create(trailer *models.Trailer) error {
	return r.db.Create(trailer).Error
}

func (r *TrailerRepository) FindByID(id uint) (*models.Trailer, error) {
	var trailer models.Trailer
	err := r.db.First(&trailer, id).Error
	if err != nil {
		return nil, err
	}
	return &trailer, nil
}

func (r *TrailerRepository) Update(trailer *models.Trailer) error {
	return r.db.Save(trailer).Error
}

func (r *TrailerRepository) Delete(id uint) error {
	return r.db.Delete(&models.Trailer{}, id).Error
}

func (r *TrailerRepository) List(offset, limit int) ([]*models.Trailer, error) {
	var trailers []*models.Trailer
	query := r.db

	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}

	err := query.Find(&trailers).Error
	return trailers, err
}

func (r *TrailerRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.Trailer{}).Count(&count).Error
	return count, err
}
