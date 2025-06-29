package repositories

import (
	"github.com/nepocorp/backend/models"
	"gorm.io/gorm"
)

type RouteRepository struct {
	DB *gorm.DB
}

func NewRouteRepository(db *gorm.DB) *RouteRepository {
	return &RouteRepository{DB: db}
}

func (r *RouteRepository) CreateRoute(route *models.Route) error {
	return r.DB.Create(route).Error
}

func (r *RouteRepository) GetRouteByID(id uint) (*models.Route, error) {
	var route models.Route
	err := r.DB.First(&route, id).Error
	return &route, err
}

func (r *RouteRepository) GetAllRoutes() ([]models.Route, error) {
	var routes []models.Route
	err := r.DB.Find(&routes).Error
	return routes, err
}

func (r *RouteRepository) UpdateRoute(route *models.Route) error {
	return r.DB.Save(route).Error
}

func (r *RouteRepository) DeleteRoute(id uint) error {
	return r.DB.Delete(&models.Route{}, id).Error
}

func (r *RouteRepository) GetRouteByName(name string) (*models.Route, error) {
	var route models.Route
	err := r.DB.Where("name = ?", name).First(&route).Error
	return &route, err
}