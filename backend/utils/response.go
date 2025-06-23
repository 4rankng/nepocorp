package utils

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Status  string      `json:"status"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Errors  interface{} `json:"errors,omitempty"`
}

type PaginationMeta struct {
	RecordsCount int `json:"records_count"`
	Page         int `json:"page"`
	Limit        int `json:"limit"`
	TotalPages   int `json:"total_pages"`
}

type ListResponse struct {
	Status     string         `json:"status"`
	Message    string         `json:"message"`
	Data       interface{}    `json:"data"`
	Pagination PaginationMeta `json:"pagination"`
}

type ErrorDetail struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func SuccessResponse(c *gin.Context, statusCode int, message string, data interface{}) {
	c.JSON(statusCode, Response{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func ErrorResponse(c *gin.Context, statusCode int, message string, errors interface{}) {
	c.JSON(statusCode, Response{
		Status:  "error",
		Message: message,
		Errors:  errors,
	})
}

func ListSuccessResponse(c *gin.Context, message string, data interface{}, pagination PaginationMeta) {
	c.JSON(http.StatusOK, ListResponse{
		Status:     "success",
		Message:    message,
		Data:       data,
		Pagination: pagination,
	})
}

func CalculatePagination(totalRecords, page, limit int) PaginationMeta {
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}

	totalPages := (totalRecords + limit - 1) / limit
	if totalPages < 1 {
		totalPages = 1
	}

	return PaginationMeta{
		RecordsCount: totalRecords,
		Page:         page,
		Limit:        limit,
		TotalPages:   totalPages,
	}
}

func GetPaginationParams(c *gin.Context) (page, limit int) {
	page = 1
	limit = 10

	if p, exists := c.GetQuery("page"); exists {
		if val, err := strconv.Atoi(p); err == nil && val > 0 {
			page = val
		}
	}

	if l, exists := c.GetQuery("limit"); exists {
		if val, err := strconv.Atoi(l); err == nil && val > 0 {
			limit = val
		}
	}

	return page, limit
}