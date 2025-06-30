package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type JobRepository struct {
	DB *gorm.DB
}

func NewJobRepository(db *gorm.DB) *JobRepository {
	return &JobRepository{DB: db}
}

func (r *JobRepository) CreateJob(job *models.Job) error {
	return r.DB.Create(job).Error
}

func (r *JobRepository) GetJobByID(id uint) (*models.Job, error) {
	var job models.Job
	err := r.DB.Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route").First(&job, id).Error
	return &job, err
}

func (r *JobRepository) GetAllJobs() ([]models.Job, error) {
	var jobs []models.Job
	err := r.DB.Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route").Find(&jobs).Error
	return jobs, err
}

func (r *JobRepository) UpdateJob(job *models.Job) error {
	return r.DB.Save(job).Error
}

func (r *JobRepository) DeleteJob(id uint) error {
	return r.DB.Delete(&models.Job{}, id).Error
}

func (r *JobRepository) GetJobsByTractorID(tractorID uint) ([]models.Job, error) {
	var jobs []models.Job
	err := r.DB.Where("tractor_id = ?", tractorID).Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route").Find(&jobs).Error
	return jobs, err
}

func (r *JobRepository) GetJobsByCustomerID(customerID uint) ([]models.Job, error) {
	var jobs []models.Job
	err := r.DB.Where("customer_id = ?", customerID).Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route").Find(&jobs).Error
	return jobs, err
}

func (r *JobRepository) GetJobsByStatus(status string) ([]models.Job, error) {
	var jobs []models.Job
	err := r.DB.Where("status = ?", status).Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route").Find(&jobs).Error
	return jobs, err
}

func (r *JobRepository) ListJobs(offset, limit int) ([]models.Job, error) {
	var jobs []models.Job
	query := r.DB.Preload("Tractor").Preload("Trailer").Preload("Driver").Preload("Customer").Preload("Route")
	if limit > 0 {
		query = query.Offset(offset).Limit(limit)
	}
	err := query.Find(&jobs).Error
	return jobs, err
}

func (r *JobRepository) CountJobs() (int64, error) {
	var count int64
	err := r.DB.Model(&models.Job{}).Count(&count).Error
	return count, err
}
