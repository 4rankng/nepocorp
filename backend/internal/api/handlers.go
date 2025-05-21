package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Auth Handlers
func Login(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Login endpoint"})
}

func Register(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"message": "Register endpoint"})
}

func Logout(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Logout successful"})
}

// User Handlers
func ListUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"users": []interface{}{}})
}

func GetUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"id": c.Param("id")})
}

// Role Handlers
func ListRoles(c *gin.Context) {
	roles := []map[string]string{
		{"id": "1", "name": "Quản lý"},
		{"id": "2", "name": "Kế toán"},
		{"id": "3", "name": "Giao nhận"},
		{"id": "4", "name": "Lái xe"},
	}
	c.JSON(http.StatusOK, gin.H{"roles": roles})
}

// Trip Handlers (example - to be expanded)
func CreateTrip(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"message": "Trip created"})
}

func ListTrips(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"trips": []interface{}{}})
}

// Add more handlers as needed
