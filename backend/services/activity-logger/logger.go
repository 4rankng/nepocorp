package activitylogger

import (
	"github.com/nepocorp/backend/models"
	"github.com/nepocorp/backend/repositories"
	"github.com/sirupsen/logrus"
)

type Service struct {
	repo   *repositories.ActivityLogRepository
	logger *logrus.Logger
	queue  chan *models.ActivityLog
}

func NewService(repo *repositories.ActivityLogRepository, logger *logrus.Logger, queueSize int) *Service {
	s := &Service{
		repo:   repo,
		logger: logger,
		queue:  make(chan *models.ActivityLog, queueSize),
	}

	// Start background worker
	go s.worker()

	return s
}

func (s *Service) Log(log *models.ActivityLog) {
	select {
	case s.queue <- log:
		// Successfully queued
	default:
		// Queue is full, log synchronously
		if err := s.repo.Create(log); err != nil {
			s.logger.WithError(err).Error("Failed to create activity log")
		}
	}
}

func (s *Service) worker() {
	for log := range s.queue {
		if err := s.repo.Create(log); err != nil {
			s.logger.WithError(err).Error("Failed to create activity log")
		}
	}
}

func (s *Service) Close() {
	close(s.queue)
}
