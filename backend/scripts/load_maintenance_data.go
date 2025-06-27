package main

import (
	"fmt"
	"log"
	"time"

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

	// Create maintenance records
	maintenanceRecords := []models.Maintenance{
		{
			ID:            1,
			ExpenseID:     1,
			LicensePlate:  "51A-12345",
			VendorName:    "Garage Minh Tuấn",
			ItemName:      "Bảo dưỡng định kỳ 10,000km",
			Price:         2000000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         2200000,
			InstallDate:   parseDate("2024-01-15"),
			ExpiryDate:    parseDate("2024-07-15"),
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
		{
			ID:            2,
			ExpenseID:     2,
			LicensePlate:  "51B-67890",
			VendorName:    "Xưởng Hùng Vương",
			ItemName:      "Thay dầu và lọc động cơ",
			Price:         1500000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         1650000,
			InstallDate:   parseDate("2024-02-01"),
			ExpiryDate:    parseDate("2024-08-01"),
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
		{
			ID:            3,
			ExpenseID:     4,
			LicensePlate:  "51A-12345",
			VendorName:    "Cửa hàng phụ tùng ABC",
			ItemName:      "Thay má phanh trước",
			Price:         800000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         880000,
			InstallDate:   parseDate("2024-02-10"),
			ExpiryDate:    parseDate("2025-02-10"),
			LastUpdatedBy: "Trần Văn B (@driver1)",
		},
		{
			ID:            4,
			ExpenseID:     5,
			LicensePlate:  "51D-22222",
			VendorName:    "Garage Thành Đạt",
			ItemName:      "Sửa chữa động cơ",
			Price:         3000000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         3300000,
			InstallDate:   parseDate("2024-01-20"),
			ExpiryDate:    nil,
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
		{
			ID:            5,
			ExpenseID:     6,
			LicensePlate:  "51R-11111",
			VendorName:    "Xưởng Hoàng Gia",
			ItemName:      "Bảo dưỡng hệ thống phanh",
			Price:         1200000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         1320000,
			InstallDate:   parseDate("2024-02-05"),
			ExpiryDate:    parseDate("2025-02-05"),
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
		{
			ID:            6,
			ExpenseID:     7,
			LicensePlate:  "51R-22222",
			VendorName:    "Garage Việt Nam",
			ItemName:      "Thay lốp xe rơ moóc",
			Price:         900000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         990000,
			InstallDate:   parseDate("2024-02-15"),
			ExpiryDate:    nil,
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
		{
			ID:            7,
			ExpenseID:     9,
			LicensePlate:  "51R-44444",
			VendorName:    "Cửa hàng Minh Châu",
			ItemName:      "Thay van an toàn khí nén",
			Price:         600000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         660000,
			InstallDate:   parseDate("2024-02-20"),
			ExpiryDate:    parseDate("2025-02-20"),
			LastUpdatedBy: "Trần Văn B (@driver1)",
		},
		{
			ID:            8,
			ExpenseID:     10,
			LicensePlate:  "51R-55555",
			VendorName:    "Xưởng sơn Tấn Phát",
			ItemName:      "Sơn lại thùng xe",
			Price:         2500000,
			Quantity:      1,
			TaxRate:       10.0,
			Total:         2750000,
			InstallDate:   parseDate("2024-01-25"),
			ExpiryDate:    nil,
			LastUpdatedBy: "Nguyễn Văn A (@manager1)",
		},
	}

	// Clear existing maintenance data
	if err := db.Exec("DELETE FROM maintenance").Error; err != nil {
		log.Printf("Warning: Could not clear maintenance table: %v", err)
	}

	// Insert maintenance records
	for _, record := range maintenanceRecords {
		// Use Create instead of setting timestamps manually
		record.CreatedAt = time.Time{} // Let GORM handle this
		record.UpdatedAt = time.Time{} // Let GORM handle this
		
		if err := db.Create(&record).Error; err != nil {
			log.Printf("Error inserting maintenance record %d: %v", record.ID, err)
		} else {
			fmt.Printf("Inserted maintenance record %d: %s\n", record.ID, record.ItemName)
		}
	}

	// Verify insertion
	var count int64
	if err := db.Model(&models.Maintenance{}).Count(&count).Error; err != nil {
		log.Printf("Error counting maintenance records: %v", err)
	} else {
		fmt.Printf("\nTotal maintenance records in database: %d\n", count)
	}

	// Show all records
	var allRecords []models.Maintenance
	if err := db.Find(&allRecords).Error; err != nil {
		log.Printf("Error fetching all records: %v", err)
	} else {
		fmt.Println("\nAll maintenance records:")
		for _, record := range allRecords {
			fmt.Printf("ID: %d, License: %s, Item: %s, Price: %d\n", 
				record.ID, record.LicensePlate, record.ItemName, record.Price)
		}
	}
}

func parseDate(dateStr string) *time.Time {
	if dateStr == "" {
		return nil
	}
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		log.Printf("Error parsing date %s: %v", dateStr, err)
		return nil
	}
	return &t
}