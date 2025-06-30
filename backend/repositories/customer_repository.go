package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type CustomerRepository struct {
	DB *gorm.DB
}

func NewCustomerRepository(db *gorm.DB) *CustomerRepository {
	return &CustomerRepository{DB: db}
}

func (r *CustomerRepository) CreateCustomer(customer *models.Customer) error {
	return r.DB.Create(customer).Error
}

func (r *CustomerRepository) GetCustomerByID(id uint) (*models.Customer, error) {
	var customer models.Customer
	err := r.DB.First(&customer, id).Error
	return &customer, err
}

func (r *CustomerRepository) GetAllCustomers() ([]models.Customer, error) {
	var customers []models.Customer
	err := r.DB.Find(&customers).Error
	return customers, err
}

func (r *CustomerRepository) UpdateCustomer(customer *models.Customer) error {
	return r.DB.Save(customer).Error
}

func (r *CustomerRepository) DeleteCustomer(id uint) error {
	return r.DB.Delete(&models.Customer{}, id).Error
}

func (r *CustomerRepository) ListCustomers(offset, limit int) ([]models.Customer, error) {
	var customers []models.Customer
	query := r.DB
	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}
	err := query.Find(&customers).Error
	return customers, err
}

func (r *CustomerRepository) CountCustomers() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Customer{}).Count(&count).Error
	return count, err
}
