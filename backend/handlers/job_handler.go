package handlers

import (
	"net/http"
	"strconv"

	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/nepocorp/backend/utils"

	"github.com/gin-gonic/gin"
)

type JobHandler struct {
	JobRepo *repositories.JobRepository
}

func NewJobHandler(jobRepo *repositories.JobRepository) *JobHandler {
	return &JobHandler{JobRepo: jobRepo}
}

func (h *JobHandler) CreateJob(c *gin.Context) {
	var job models.Job
	if err := c.ShouldBindJSON(&job); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	if err := h.JobRepo.CreateJob(&job); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusCreated, "Job created successfully", job)
}

func (h *JobHandler) GetJobByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid job ID", nil)
		return
	}

	job, err := h.JobRepo.GetJobByID(uint(id))
	if err != nil {
		utils.ErrorResponse(c, http.StatusNotFound, "Job not found", nil)
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Job retrieved successfully", job)
}

func (h *JobHandler) GetAllJobs(c *gin.Context) {
	jobs, err := h.JobRepo.GetAllJobs()
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Jobs retrieved successfully", jobs)
}

func (h *JobHandler) UpdateJob(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid job ID", nil)
		return
	}

	var job models.Job
	if err := c.ShouldBindJSON(&job); err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid JSON format", err.Error())
		return
	}

	job.ID = uint(id)
	if err := h.JobRepo.UpdateJob(&job); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Job updated successfully", job)
}

func (h *JobHandler) DeleteJob(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid job ID", nil)
		return
	}

	if err := h.JobRepo.DeleteJob(uint(id)); err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Job deleted successfully", nil)
}

func (h *JobHandler) GetJobsByTractor(c *gin.Context) {
	tractorID, err := strconv.ParseUint(c.Param("tractorId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid tractor ID", nil)
		return
	}

	jobs, err := h.JobRepo.GetJobsByTractorID(uint(tractorID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Jobs retrieved successfully", jobs)
}

func (h *JobHandler) GetJobsByCustomer(c *gin.Context) {
	customerID, err := strconv.ParseUint(c.Param("customerId"), 10, 64)
	if err != nil {
		utils.ErrorResponse(c, http.StatusBadRequest, "Invalid customer ID", nil)
		return
	}

	jobs, err := h.JobRepo.GetJobsByCustomerID(uint(customerID))
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Jobs retrieved successfully", jobs)
}

func (h *JobHandler) GetJobsByStatus(c *gin.Context) {
	status := c.Param("status")
	if status == "" {
		utils.ErrorResponse(c, http.StatusBadRequest, "Status parameter is required", nil)
		return
	}

	jobs, err := h.JobRepo.GetJobsByStatus(status)
	if err != nil {
		utils.ErrorResponse(c, http.StatusInternalServerError, "Internal Server Error", err.Error())
		return
	}

	utils.SuccessResponse(c, http.StatusOK, "Jobs retrieved successfully", jobs)
}
