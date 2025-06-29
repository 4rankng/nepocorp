package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type FuelStandardRepository struct {
	DB *gorm.DB
}

func NewFuelStandardRepository(db *gorm.DB) *FuelStandardRepository {
	return &FuelStandardRepository{DB: db}
}

func (r *FuelStandardRepository) CreateFuelStandard(fuelStandard *models.FuelStandard) error {
	return r.DB.Create(fuelStandard).Error
}

func (r *FuelStandardRepository) GetFuelStandardByID(id uint) (*models.FuelStandard, error) {
	var fuelStandard models.FuelStandard
	err := r.DB.Preload("Tractor").First(&fuelStandard, id).Error
	return &fuelStandard, err
}

func (r *FuelStandardRepository) GetAllFuelStandards() ([]models.FuelStandard, error) {
	var fuelStandards []models.FuelStandard
	err := r.DB.Preload("Tractor").Find(&fuelStandards).Error
	return fuelStandards, err
}

func (r *FuelStandardRepository) UpdateFuelStandard(fuelStandard *models.FuelStandard) error {
	return r.DB.Save(fuelStandard).Error
}

func (r *FuelStandardRepository) DeleteFuelStandard(id uint) error {
	return r.DB.Delete(&models.FuelStandard{}, id).Error
}

func (r *FuelStandardRepository) GetFuelStandardsByTractorID(tractorID uint) ([]models.FuelStandard, error) {
	var fuelStandards []models.FuelStandard
	err := r.DB.Where("tractor_id = ?", tractorID).Preload("Tractor").Find(&fuelStandards).Error
	return fuelStandards, err
}

func (r *FuelStandardRepository) GetFuelStandardByTractorAndType(tractorID uint, trailerType, loadCategory string) (*models.FuelStandard, error) {
	var fuelStandard models.FuelStandard
	err := r.DB.Where("tractor_id = ? AND trailer_type = ? AND load_category = ?", tractorID, trailerType, loadCategory).
		Preload("Tractor").First(&fuelStandard).Error
	return &fuelStandard, err
}

func (r *FuelStandardRepository) GetFuelStandardsByTrailerType(trailerType string) ([]models.FuelStandard, error) {
	var fuelStandards []models.FuelStandard
	err := r.DB.Where("trailer_type = ?", trailerType).Preload("Tractor").Find(&fuelStandards).Error
	return fuelStandards, err
}

func (r *FuelStandardRepository) GetFuelStandardsByLoadCategory(loadCategory string) ([]models.FuelStandard, error) {
	var fuelStandards []models.FuelStandard
	err := r.DB.Where("load_category = ?", loadCategory).Preload("Tractor").Find(&fuelStandards).Error
	return fuelStandards, err
}
