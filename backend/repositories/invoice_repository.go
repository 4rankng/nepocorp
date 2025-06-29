package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type InvoiceRepository struct {
	db *gorm.DB
}

func NewInvoiceRepository(db *gorm.DB) *InvoiceRepository {
	return &InvoiceRepository{db: db}
}

func (r *InvoiceRepository) ListWithFilters(offset, limit int, filters map[string]string) ([]models.Invoice, error) {
	var invoices []models.Invoice

	query := r.db.Preload("Customer").Preload("InvoiceCategory").Preload("CreatedByUser").Preload("Items")

	// Apply filters
	if customerID := filters["customer_id"]; customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}

	if categoryID := filters["invoice_category_id"]; categoryID != "" {
		query = query.Where("invoice_category_id = ?", categoryID)
	}

	if paymentStatus := filters["payment_status"]; paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&invoices).Error
	return invoices, err
}

func (r *InvoiceRepository) CountWithFilters(filters map[string]string) (int64, error) {
	var count int64
	query := r.db.Model(&models.Invoice{})

	// Apply same filters as ListWithFilters
	if customerID := filters["customer_id"]; customerID != "" {
		query = query.Where("customer_id = ?", customerID)
	}

	if categoryID := filters["invoice_category_id"]; categoryID != "" {
		query = query.Where("invoice_category_id = ?", categoryID)
	}

	if paymentStatus := filters["payment_status"]; paymentStatus != "" {
		query = query.Where("payment_status = ?", paymentStatus)
	}

	err := query.Count(&count).Error
	return count, err
}

func (r *InvoiceRepository) FindByID(id uint) (*models.Invoice, error) {
	var invoice models.Invoice
	err := r.db.Preload("Customer").Preload("InvoiceCategory").Preload("CreatedByUser").Preload("Items").First(&invoice, id).Error
	if err != nil {
		return nil, err
	}
	return &invoice, nil
}

func (r *InvoiceRepository) Create(invoice *models.Invoice) error {
	return r.db.Create(invoice).Error
}

func (r *InvoiceRepository) Update(invoice *models.Invoice) error {
	return r.db.Save(invoice).Error
}

func (r *InvoiceRepository) Delete(id uint) error {
	// Delete related items first (cascade delete)
	if err := r.db.Where("invoice_id = ?", id).Delete(&models.InvoiceItem{}).Error; err != nil {
		return err
	}

	// Delete the invoice
	return r.db.Delete(&models.Invoice{}, id).Error
}

func (r *InvoiceRepository) CreateItem(item *models.InvoiceItem) error {
	return r.db.Create(item).Error
}

func (r *InvoiceRepository) UpdateItem(item *models.InvoiceItem) error {
	return r.db.Save(item).Error
}

func (r *InvoiceRepository) DeleteItem(id uint) error {
	return r.db.Delete(&models.InvoiceItem{}, id).Error
}

func (r *InvoiceRepository) GetItemsByInvoiceID(invoiceID uint) ([]models.InvoiceItem, error) {
	var items []models.InvoiceItem
	err := r.db.Where("invoice_id = ?", invoiceID).Find(&items).Error
	return items, err
}
