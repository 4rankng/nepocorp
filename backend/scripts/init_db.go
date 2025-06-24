package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/utils"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	// Define command line flags
	userFlag := flag.String("user", "", "Username for the admin account")
	passFlag := flag.String("pass", "", "Password for the admin account")
	flag.Parse()

	// Load .env file - try current directory first, then parent
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

	// Auto migrate the User model
	if err := db.AutoMigrate(&models.User{}); err != nil {
		log.Fatal("Failed to migrate database: ", err)
	}

	// Determine username and password
	var username, password string
	
	// Check command line arguments
	if len(flag.Args()) > 0 && flag.Args()[0] == "local" {
		// Use default admin/admin for local
		username = "admin"
		password = "admin"
		fmt.Println("Creating local admin account with username: admin, password: admin")
	} else if *userFlag != "" && *passFlag != "" {
		// Use provided username and password
		username = *userFlag
		password = *passFlag
		fmt.Printf("Creating admin account with username: %s\n", username)
	} else {
		fmt.Println("Usage:")
		fmt.Println("  go run init_db.go local                  - Create admin/admin account")
		fmt.Println("  go run init_db.go -user=<username> -pass=<password> - Create custom admin account")
		os.Exit(1)
	}

	// Check if user already exists
	var existingUser models.User
	result := db.Where("username = ?", username).First(&existingUser)
	if result.Error == nil {
		fmt.Printf("User '%s' already exists\n", username)
		os.Exit(0)
	}

	// Hash the password
	hashedPassword, err := utils.HashPassword(password, cfg.HashSecret, cfg.HashSalt)
	if err != nil {
		log.Fatal("Failed to hash password: ", err)
	}

	// Create admin user
	adminUser := models.User{
		Username: username,
		Email:    fmt.Sprintf("%s@nepocorp.com", username),
		Password: hashedPassword,
		Name:     "Administrator",
		Role:     "admin",
		IsActive: true,
	}

	// Save to database
	if err := db.Create(&adminUser).Error; err != nil {
		log.Fatal("Failed to create admin user: ", err)
	}

	fmt.Printf("Admin user '%s' created successfully!\n", username)
	fmt.Println("User details:")
	fmt.Printf("  ID: %d\n", adminUser.ID)
	fmt.Printf("  Username: %s\n", adminUser.Username)
	fmt.Printf("  Email: %s\n", adminUser.Email)
	fmt.Printf("  Role: %s\n", adminUser.Role)
}