package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type PartnerRepository struct {
	DB *gorm.DB
}

func NewPartnerRepository(db *gorm.DB) *PartnerRepository {
	return &PartnerRepository{DB: db}
}

func (r *PartnerRepository) CreatePartner(partner *models.Partner) error {
	return r.DB.Create(partner).Error
}

func (r *PartnerRepository) GetPartnerByID(id uint) (*models.Partner, error) {
	var partner models.Partner
	err := r.DB.First(&partner, id).Error
	return &partner, err
}

func (r *PartnerRepository) GetAllPartners() ([]models.Partner, error) {
	var partners []models.Partner
	err := r.DB.Find(&partners).Error
	return partners, err
}

func (r *PartnerRepository) UpdatePartner(partner *models.Partner) error {
	return r.DB.Save(partner).Error
}

func (r *PartnerRepository) DeletePartner(id uint) error {
	return r.DB.Delete(&models.Partner{}, id).Error
}
