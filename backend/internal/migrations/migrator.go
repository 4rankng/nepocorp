package migrations

import (
	"database/sql"
	"fmt"
	"io/ioutil"

	_ "github.com/go-sql-driver/mysql"
	"github.com/sirupsen/logrus"
)

func Run(databaseURL string, logger *logrus.Logger) error {
	logger.Info("Running database migrations...")

	db, err := sql.Open("mysql", databaseURL[8:])
	if err != nil {
		return fmt.Errorf("failed to open database: %w", err)
	}
	defer db.Close()

	sqlFile, err := ioutil.ReadFile("./migrations/00001-init.sql")
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
