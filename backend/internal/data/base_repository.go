package data

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

// BaseRepository provides common CRUD operations
type BaseRepository[T any] struct {
	db *GormDB
}

// NewBaseRepository creates a new base repository
func NewBaseRepository[T any](db *GormDB) *BaseRepository[T] {
	return &BaseRepository[T]{db: db}
}

// Create creates a new record
func (r *BaseRepository[T]) Create(ctx context.Context, model *T) error {
	result := r.db.WithContext(ctx).Create(model)
	return result.Error
}

// FindByID finds a record by ID
func (r *BaseRepository[T]) FindByID(ctx context.Context, id string) (*T, error) {
	var model T
	result := r.db.WithContext(ctx).First(&model, "id = ?", id)
	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, result.Error
	}
	return &model, nil
}

// FindAll finds all records with pagination
func (r *BaseRepository[T]) FindAll(ctx context.Context, limit, offset int) ([]T, error) {
	var models []T
	result := r.db.WithContext(ctx).Limit(limit).Offset(offset).Find(&models)
	return models, result.Error
}

// Update updates a record
func (r *BaseRepository[T]) Update(ctx context.Context, model *T) error {
	result := r.db.WithContext(ctx).Save(model)
	return result.Error
}

// Delete deletes a record
func (r *BaseRepository[T]) Delete(ctx context.Context, id string) error {
	var model T
	result := r.db.WithContext(ctx).Delete(&model, "id = ?", id)
	return result.Error
}

// Transaction executes a function within a transaction
func (r *BaseRepository[T]) Transaction(ctx context.Context, fc func(tx *gorm.DB) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fc(tx)
	})
}
