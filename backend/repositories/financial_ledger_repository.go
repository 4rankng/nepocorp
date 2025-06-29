package repositories

import (
	"time"

	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type FinancialLedgerRepository struct {
	DB *gorm.DB
}

func NewFinancialLedgerRepository(db *gorm.DB) *FinancialLedgerRepository {
	return &FinancialLedgerRepository{DB: db}
}

func (r *FinancialLedgerRepository) CreateTransaction(transaction *models.FinancialLedger) error {
	return r.DB.Create(transaction).Error
}

func (r *FinancialLedgerRepository) GetTransactionByID(id uint) (*models.FinancialLedger, error) {
	var transaction models.FinancialLedger
	err := r.DB.Preload("Customer").Preload("Partner").Preload("Job").First(&transaction, id).Error
	return &transaction, err
}

func (r *FinancialLedgerRepository) GetAllTransactions() ([]models.FinancialLedger, error) {
	var transactions []models.FinancialLedger
	err := r.DB.Preload("Customer").Preload("Partner").Preload("Job").Order("transaction_date DESC").Find(&transactions).Error
	return transactions, err
}

func (r *FinancialLedgerRepository) UpdateTransaction(transaction *models.FinancialLedger) error {
	return r.DB.Save(transaction).Error
}

func (r *FinancialLedgerRepository) DeleteTransaction(id uint) error {
	return r.DB.Delete(&models.FinancialLedger{}, id).Error
}

func (r *FinancialLedgerRepository) GetTransactionsByCustomerID(customerID uint) ([]models.FinancialLedger, error) {
	var transactions []models.FinancialLedger
	err := r.DB.Where("customer_id = ?", customerID).Preload("Customer").Preload("Partner").Preload("Job").Order("transaction_date DESC").Find(&transactions).Error
	return transactions, err
}

func (r *FinancialLedgerRepository) GetTransactionsByPartnerID(partnerID uint) ([]models.FinancialLedger, error) {
	var transactions []models.FinancialLedger
	err := r.DB.Where("partner_id = ?", partnerID).Preload("Customer").Preload("Partner").Preload("Job").Order("transaction_date DESC").Find(&transactions).Error
	return transactions, err
}

func (r *FinancialLedgerRepository) GetTransactionsByType(transactionType string) ([]models.FinancialLedger, error) {
	var transactions []models.FinancialLedger
	err := r.DB.Where("transaction_type = ?", transactionType).Preload("Customer").Preload("Partner").Preload("Job").Order("transaction_date DESC").Find(&transactions).Error
	return transactions, err
}

func (r *FinancialLedgerRepository) GetTransactionsByDateRange(startDate, endDate time.Time) ([]models.FinancialLedger, error) {
	var transactions []models.FinancialLedger
	err := r.DB.Where("transaction_date BETWEEN ? AND ?", startDate, endDate).Preload("Customer").Preload("Partner").Preload("Job").Order("transaction_date DESC").Find(&transactions).Error
	return transactions, err
}

func (r *FinancialLedgerRepository) GetCustomerBalance(customerID uint) (float64, error) {
	var result struct {
		Balance float64
	}
	
	err := r.DB.Raw("SELECT COALESCE(SUM(debit - credit), 0) as balance FROM financial_ledger WHERE customer_id = ?", customerID).Scan(&result).Error
	return result.Balance, err
}

func (r *FinancialLedgerRepository) GetPartnerBalance(partnerID uint) (float64, error) {
	var result struct {
		Balance float64
	}
	
	err := r.DB.Raw("SELECT COALESCE(SUM(debit - credit), 0) as balance FROM financial_ledger WHERE partner_id = ?", partnerID).Scan(&result).Error
	return result.Balance, err
}