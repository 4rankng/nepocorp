package repositories

import (
	"fmt"

	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type MaintenanceItemRepository struct {
	db *gorm.DB
}

func NewMaintenanceItemRepository(db *gorm.DB) *MaintenanceItemRepository {
	return &MaintenanceItemRepository{db: db}
}

type MaintenanceItemFilters struct {
	LicensePlate string
	VendorName   string
	ItemName     string
	StartDate    string
	EndDate      string
}

func (r *MaintenanceItemRepository) GetMaintenanceItems(userID uint, filters MaintenanceItemFilters, page, limit int) ([]models.MaintenanceItemResponse, int64, error) {
	var items []models.MaintenanceItemResponse
	var total int64

	// Build the base query
	query := r.db.Table("expense_items ei").
		Select(`
			ei.id,
			e.id as expense_id,
			e.tractor_id,
			e.trailer_id,
			COALESCE(t.license_plate, tr.license_plate) as license_plate,
			e.vendor_name,
			e.payment_status,
			e.created_at as expense_created_at,
			ei.item_name,
			ei.quantity,
			ei.price,
			ei.total,
			ei.install_date,
			ei.expiry_date,
			e.remark
		`).
		Joins("JOIN expenses e ON ei.expense_id = e.id").
		Joins("LEFT JOIN tractors t ON e.tractor_id = t.id").
		Joins("LEFT JOIN trailers tr ON e.trailer_id = tr.id").
		Where("e.expense_category_id = ? AND e.created_by = ?", 1, userID)

	// Apply filters
	if filters.LicensePlate != "" {
		query = query.Where("(t.license_plate ILIKE ? OR tr.license_plate ILIKE ?)", "%"+filters.LicensePlate+"%", "%"+filters.LicensePlate+"%")
	}

	if filters.VendorName != "" {
		query = query.Where("e.vendor_name ILIKE ?", "%"+filters.VendorName+"%")
	}

	if filters.ItemName != "" {
		query = query.Where("ei.item_name ILIKE ?", "%"+filters.ItemName+"%")
	}

	if filters.StartDate != "" {
		query = query.Where("DATE(e.created_at) >= ?", filters.StartDate)
	}

	if filters.EndDate != "" {
		query = query.Where("DATE(e.created_at) <= ?", filters.EndDate)
	}

	// Count total records
	countQuery := query
	if err := countQuery.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to count maintenance items: %w", err)
	}

	// Apply pagination and ordering
	offset := (page - 1) * limit
	query = query.Order("e.created_at DESC, ei.id ASC").
		Limit(limit).
		Offset(offset)

	// Execute the query
	if err := query.Scan(&items).Error; err != nil {
		return nil, 0, fmt.Errorf("failed to fetch maintenance items: %w", err)
	}

	return items, total, nil
}