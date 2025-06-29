package repositories

import (
	"gorm.io/gorm"
	"github.com/nepocorp/backend/models"
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
