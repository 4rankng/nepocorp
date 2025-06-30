package activitylogger

import (
	"time"

	"github.com/nepocorp/backend/config"
	"github.com/nepocorp/backend/repositories"
	"github.com/sirupsen/logrus"
)

// CleanupService handles periodic cleanup of old activity logs
type CleanupService struct {
	repo          *repositories.ActivityLogRepository
	retentionDays int
	logger        *logrus.Logger
	ticker        *time.Ticker
	done          chan bool
}

// NewCleanupService creates a new cleanup service
func NewCleanupService(repo *repositories.ActivityLogRepository, cfg *config.Config, logger *logrus.Logger) *CleanupService {
	return &CleanupService{
		repo:          repo,
		retentionDays: cfg.ActivityLogRetentionDays,
		logger:        logger,
		done:          make(chan bool),
	}
}

// Start begins the periodic cleanup process
func (s *CleanupService) Start() {
	// Run cleanup every 24 hours
	s.ticker = time.NewTicker(24 * time.Hour)

	// Run initial cleanup
	go s.cleanup()

	// Start periodic cleanup
	go func() {
		for {
			select {
			case <-s.ticker.C:
				s.cleanup()
			case <-s.done:
				return
			}
		}
	}()
}

// Stop stops the cleanup service
func (s *CleanupService) Stop() {
	s.ticker.Stop()
	s.done <- true
}

// cleanup removes old activity logs
func (s *CleanupService) cleanup() {
	s.logger.Info("Starting activity log cleanup")

	err := s.repo.DeleteOlderThan(s.retentionDays)
	if err != nil {
		s.logger.WithError(err).Error("Failed to cleanup old activity logs")
		return
	}

	s.logger.WithField("retention_days", s.retentionDays).Info("Activity log cleanup completed")
}
