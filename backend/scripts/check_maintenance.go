package main

import (
	"fmt"
	"log"

	"github.com/joho/godotenv"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/models"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Load .env file
	if err := godotenv.Load(".env"); err != nil {
		if err := godotenv.Load("../.env"); err != nil {
			log.Println("No .env file found, using environment variables")
		}
	}

	// Initialize configuration
	cfg := config.Load()

	// Connect to database
	db, err := gorm.Open(mysql.Open(cfg.DatabaseDSN()), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	fmt.Println("Database connection successful!")

	// Check if maintenance table exists and has data
	var count int64
	if err := db.Table("maintenance").Count(&count).Error; err != nil {
		log.Printf("Error querying maintenance table: %v", err)
		return
	}

	fmt.Printf("Records in maintenance table: %d\n", count)

	// Try to fetch maintenance records using the model
	var maintenances []models.Maintenance
	if err := db.Find(&maintenances).Error; err != nil {
		log.Printf("Error fetching maintenance records with model: %v", err)
		return
	}

	fmt.Printf("Records fetched using Maintenance model: %d\n", len(maintenances))

	// Show first few records
	if len(maintenances) > 0 {
		fmt.Println("\nFirst maintenance record:")
		m := maintenances[0]
		fmt.Printf("ID: %d, License: %s, Vendor: %s, Item: %s\n", 
			m.ID, m.LicensePlate, m.VendorName, m.ItemName)
	}

	// Test GORM table name resolution
	stmt := &gorm.Statement{DB: db}
	stmt.Parse(&models.Maintenance{})
	fmt.Printf("GORM table name for Maintenance: %s\n", stmt.Schema.Table)
}