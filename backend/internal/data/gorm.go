package data

import (
	"fmt"
	"time"

	"nepocorp/backend/internal/domain"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// GormDB wraps the GORM DB instance
type GormDB struct {
	*gorm.DB
}

// NewGormDB creates a new GORM database connection
func NewGormDB(dsn string) (*GormDB, error) {
	config := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	}

	db, err := gorm.Open(mysql.Open(dsn), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get generic database object sql.DB to use its functions
	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get database instance: %w", err)
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return &GormDB{db}, nil
}

// AutoMigrate runs database migrations for all models
func (db *GormDB) AutoMigrate() error {
	models := []interface{}{
		&domain.User{},
		&domain.Employee{},
		&domain.Customer{},
		&domain.Partner{},
		&domain.Vehicle{},
		&domain.ContainerType{},
		&domain.Route{},
		&domain.TransportSchedule{},
		&domain.GeneralCost{},
		&domain.Debt{},
		&domain.FuelPrice{},
		&domain.MileageRate{},
		&domain.Invoice{},
		&domain.Payment{},
	}

	if err := db.DB.AutoMigrate(models...); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}
	return nil
}

// Transaction executes a function within a database transaction
func (db *GormDB) Transaction(fc func(tx *gorm.DB) error) error {
	return db.Transaction(func(tx *gorm.DB) error {
		return fc(tx)
	})
}
