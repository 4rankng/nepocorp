package handlers

import (
	"net/http"

	"nepocorp/backend/internal/domain"
	"nepocorp/backend/internal/service"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportService *service.ReportService
}

func NewReportHandler(reportService *service.ReportService) *ReportHandler {
	return &ReportHandler{
		reportService: reportService,
	}
}

// GenerateReport handles report generation
// @Summary Generate a report
// @Description Generate a report based on the provided filters
// @Tags reports
// @Accept json
// @Produce json
// @Param filter body domain.ReportFilter true "Report filter criteria"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/reports/generate [post]
func (h *ReportHandler) GenerateReport(c *gin.Context) {
	var filter domain.ReportFilter
	if err := c.ShouldBindJSON(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	report, err := h.reportService.GenerateReport(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate report: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": report})
}

// ExportReport handles report export
// @Summary Export a report
// @Description Export a report in the specified format (xlsx, csv, json)
// @Tags reports
// @Accept json
// @Produce octet-stream
// @Param filter body domain.ReportFilter true "Report filter and export criteria"
// @Success 200 {file} file "Exported file"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/reports/export [post]
func (h *ReportHandler) ExportReport(c *gin.Context) {
	var filter domain.ReportFilter
	if err := c.ShouldBindJSON(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request: " + err.Error()})
		return
	}

	if filter.ExportFormat == "" {
		filter.ExportFormat = "xlsx" // Default to Excel
	}

	// Generate the report data
	reportData, err := h.reportService.GenerateReport(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to generate report: " + err.Error()})
		return
	}

	// Export the report to the requested format
	exportData, filename, err := h.reportService.ExportReport(c.Request.Context(), filter, reportData)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to export report: " + err.Error()})
		return
	}

	// Set headers for file download
	contentType := "application/octet-stream"
	switch filter.ExportFormat {
	case "xlsx":
		contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
	case "csv":
		contentType = "text/csv"
	case "json":
		contentType = "application/json"
	}

	c.Header("Content-Description", "File Transfer")
	c.Header("Content-Transfer-Encoding", "binary")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, contentType, exportData)
}
