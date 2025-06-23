package repositories

import (
	"time"

	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type ActivityLogRepository struct {
	db *gorm.DB
}

func NewActivityLogRepository(db *gorm.DB) *ActivityLogRepository {
	return &ActivityLogRepository{db: db}
}

func (r *ActivityLogRepository) Create(log *models.ActivityLog) error {
	return r.db.Create(log).Error
}

func (r *ActivityLogRepository) FindByUserID(userID uint, offset, limit int) ([]*models.ActivityLog, error) {
	var logs []*models.ActivityLog
	err := r.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *ActivityLogRepository) FindByDateRange(start, end time.Time, offset, limit int) ([]*models.ActivityLog, error) {
	var logs []*models.ActivityLog
	err := r.db.Where("created_at BETWEEN ? AND ?", start, end).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *ActivityLogRepository) FindByAction(action string, offset, limit int) ([]*models.ActivityLog, error) {
	var logs []*models.ActivityLog
	err := r.db.Where("action = ?", action).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *ActivityLogRepository) FindByResource(resource string, resourceID string, offset, limit int) ([]*models.ActivityLog, error) {
	var logs []*models.ActivityLog
	query := r.db.Where("resource = ?", resource)
	if resourceID != "" {
		query = query.Where("resource_id = ?", resourceID)
	}
	err := query.Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *ActivityLogRepository) Count() (int64, error) {
	var count int64
	err := r.db.Model(&models.ActivityLog{}).Count(&count).Error
	return count, err
}

func (r *ActivityLogRepository) DeleteOlderThan(days int) error {
	cutoff := time.Now().AddDate(0, 0, -days)
	return r.db.Where("created_at < ?", cutoff).Delete(&models.ActivityLog{}).Error
}
