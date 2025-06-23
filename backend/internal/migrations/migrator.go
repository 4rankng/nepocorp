package migrations

import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/mysql"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/sirupsen/logrus"
)

func Run(databaseURL string, logger *logrus.Logger) error {
	logger.Info("Running database migrations...")

	// Parse database URL to get connection details
	db, err := sql.Open("mysql", databaseURL[8:]) // Remove "mysql://" prefix
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := mysql.WithInstance(db, &mysql.Config{})
	if err != nil {
		return fmt.Errorf("failed to create mysql driver: %w", err)
	}

	// Create migrator using file source
	m, err := migrate.NewWithDatabaseInstance("file://migrations", "mysql", driver)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	if err == migrate.ErrNoChange {
		logger.Info("No new migrations to apply")
	} else {
		logger.Info("Migrations completed successfully")
	}

	return nil
}

func Down(databaseURL string, logger *logrus.Logger) error {
	logger.Info("Rolling back database migrations...")

	// Parse database URL to get connection details
	db, err := sql.Open("mysql", databaseURL[8:]) // Remove "mysql://" prefix
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	driver, err := mysql.WithInstance(db, &mysql.Config{})
	if err != nil {
		return fmt.Errorf("failed to create mysql driver: %w", err)
	}

	// Create migrator using file source
	m, err := migrate.NewWithDatabaseInstance("file://migrations", "mysql", driver)
	if err != nil {
		return fmt.Errorf("failed to create migrator: %w", err)
	}

	if err := m.Down(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("failed to rollback migrations: %w", err)
	}

	logger.Info("Migrations rolled back successfully")
	return nil
}
