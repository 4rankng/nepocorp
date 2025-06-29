package repositories

import (
	"fmt"

	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type MaintenanceRepository struct {
	db *gorm.DB
}

func NewMaintenanceRepository(db *gorm.DB) *MaintenanceRepository {
	return &MaintenanceRepository{db: db}
}

type MaintenanceFilters struct {
	LicensePlate string
	VendorName   string
	ItemName     string
	StartDate    string
	EndDate      string
}

// GetAll returns all maintenance records with pagination and filtering
func (r *MaintenanceRepository) GetAll(filters MaintenanceFilters, page, limit int) ([]models.Maintenance, int64, error) {
	var maintenances []models.Maintenance
	var total int64

	// Build base query
	query := r.db.Model(&models.Maintenance{})

	// Apply filters
	if filters.LicensePlate != "" {
		query = query.Where("license_plate ILIKE ?", "%"+filters.LicensePlate+"%")
	}

	if filters.VendorName != "" {
		query = query.Where("vendor_name ILIKE ?", "%"+filters.VendorName+"%")
	}

	if filters.ItemName != "" {
		query = query.Where("item_name ILIKE ?", "%"+filters.ItemName+"%")
	}

	if filters.StartDate != "" {
		query = query.Where("DATE(created_at) >= ?", filters.StartDate)
	}

	if filters.EndDate != "" {
		query = query.Where("DATE(created_at) <= ?", filters.EndDate)
	}

	// Count total records
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count maintenance records: %w", err)
	}

	// Apply pagination and get records
	offset := (page - 1) * limit
	if err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&maintenances).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch maintenance records: %w", err)
	}

	return maintenances, total, nil
}

// GetByID returns a maintenance record by ID
func (r *MaintenanceRepository) GetByID(id uint) (*models.Maintenance, error) {
	var maintenance models.Maintenance

	if err := r.db.First(&maintenance, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("maintenance record not found")
		}
		return nil, fmt.Errorf("failed to fetch maintenance record: %w", err)
	}

	return &maintenance, nil
}

// Create creates a new maintenance record
func (r *MaintenanceRepository) Create(maintenance *models.Maintenance) error {
	if err := r.db.Create(maintenance).Error; err != nil {
		return fmt.Errorf("failed to create maintenance record: %w", err)
	}
	return nil
}

// Update updates an existing maintenance record
func (r *MaintenanceRepository) Update(id uint, maintenance *models.Maintenance) error {
	// Check if record exists
	var existing models.Maintenance
	if err := r.db.First(&existing, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("maintenance record not found")
		}
		return fmt.Errorf("failed to find maintenance record: %w", err)
	}

	// Update the record
	maintenance.ID = id
	if err := r.db.Save(maintenance).Error; err != nil {
		return fmt.Errorf("failed to update maintenance record: %w", err)
	}

	return nil
}

// Delete deletes a maintenance record by ID
func (r *MaintenanceRepository) Delete(id uint) error {
	// Check if record exists
	var maintenance models.Maintenance
	if err := r.db.First(&maintenance, id).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("maintenance record not found")
		}
		return fmt.Errorf("failed to find maintenance record: %w", err)
	}

	// Delete the record
	if err := r.db.Delete(&maintenance, id).Error; err != nil {
		return fmt.Errorf("failed to delete maintenance record: %w", err)
	}

	return nil
}

// GetByExpenseID returns maintenance records by expense ID
func (r *MaintenanceRepository) GetByExpenseID(expenseID uint) ([]models.Maintenance, error) {
	var maintenances []models.Maintenance

	if err := r.db.Where("expense_id = ?", expenseID).Find(&maintenances).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch maintenance records by expense ID: %w", err)
	}

	return maintenances, nil
}

// GetByLicensePlate returns maintenance records by license plate
func (r *MaintenanceRepository) GetByLicensePlate(licensePlate string) ([]models.Maintenance, error) {
	var maintenances []models.Maintenance

	if err := r.db.Where("license_plate = ?", licensePlate).Find(&maintenances).Error; err != nil {
		return nil, fmt.Errorf("failed to fetch maintenance records by license plate: %w", err)
	}

	return maintenances, nil
}
