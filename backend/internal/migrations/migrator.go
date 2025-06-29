package migrations

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/go-sql-driver/mysql"
	"github.com/sirupsen/logrus"
)

func Run(databaseURL string, logger *logrus.Logger) error {
	logger.Info("Running database migrations...")

	db, err := sql.Open("mysql", databaseURL[8:])
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer func() {
		if err := db.Close(); err != nil {
			logger.Errorf("Failed to close database connection: %v", err)
		}
	}()

	sqlFile, err := os.ReadFile("./migrations/00001-init.sql")
	if err != nil {
		return fmt.Errorf("failed to read migration file: %w", err)
	}

	_, err = db.Exec(string(sqlFile))
	if err != nil {
		return fmt.Errorf("failed to execute migration: %w", err)
	}

	logger.Info("Migrations completed successfully")
	return nil
}
