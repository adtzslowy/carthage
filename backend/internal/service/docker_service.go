package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/google/uuid"
)

type DockerRepository interface {
	ListContainers(ctx context.Context) ([]model.DockerContainer, error)
	GetContainerStats(ctx context.Context, containerID string) (model.DockerContainerStats, error)
	GetContainerLogs(ctx context.Context, containerID, tail string) (string, error)
	StartContainer(ctx context.Context, containerID string) error
	StopContainer(ctx context.Context, containerID string) error
	RestartContainer(ctx context.Context, containerID string) error
}

type DockerActionLogRepository interface {
	Create(ctx context.Context, log *model.DockerActionLog) error
	ListByUser(
		ctx context.Context,
		userID uuid.UUID,
		limit, offset int,
	) ([]model.DockerActionLog, error)
}

type DockerService struct {
	repository    DockerRepository
	actionLogRepo DockerActionLogRepository
}

func NewDockerService(
	repository DockerRepository,
	actionLogRepo DockerActionLogRepository,
) *DockerService {
	return &DockerService{
		repository:    repository,
		actionLogRepo: actionLogRepo,
	}
}

func (s *DockerService) ListContainers(
	ctx context.Context,
) ([]model.DockerContainer, error) {
	return s.repository.ListContainers(ctx)
}

func (s *DockerService) GetContainerStats(
	ctx context.Context,
	containerID string,
) (model.DockerContainerStats, error) {
	return s.repository.GetContainerStats(ctx, containerID)
}

func (s *DockerService) GetContainerLogs(
	ctx context.Context,
	containerID string,
	tail string,
) (string, error) {
	if strings.TrimSpace(containerID) == "" {
		return "", ErrInvalidContainerID
	}

	if tail == "" {
		tail = "100"
	}

	return s.repository.GetContainerLogs(ctx, containerID, tail)
}

func (s *DockerService) recordAction(
	ctx context.Context,
	containerID string,
	action string,
	actionErr error,
) error {
	status := "success"
	errorMessage := ""

	if actionErr != nil {
		status = "failed"
		errorMessage = actionErr.Error()
	}

	log := &model.DockerActionLog{
		ContainerID:   containerID,
		ContainerName: containerID,
		Action:        action,
		Status:        status,
		ErrorMessage:  errorMessage,
	}

	return s.actionLogRepo.Create(ctx, log)
}

func (s *DockerService) StartContainer(
	ctx context.Context,
	containerID string,
) error {
	if strings.TrimSpace(containerID) == "" {
		return ErrInvalidContainerID
	}

	actionErr := s.repository.StartContainer(ctx, containerID)
	logErr := s.recordAction(ctx, containerID, "start", actionErr)

	if actionErr != nil {
		if logErr != nil {
			return fmt.Errorf("%w; additionally, action log failed: %v", actionErr, logErr)
		}
		return actionErr
	}

	if logErr != nil {
		return fmt.Errorf("container started, but action log failed: %w", logErr)
	}

	return nil
}

func (s *DockerService) StopContainer(
	ctx context.Context,
	containerID string,
) error {
	if strings.TrimSpace(containerID) == "" {
		return ErrInvalidContainerID
	}

	actionErr := s.repository.StopContainer(ctx, containerID)
	logErr := s.recordAction(ctx, containerID, "stop", actionErr)

	if actionErr != nil {
		if logErr != nil {
			return fmt.Errorf("%w; additionally, action log failed: %v", actionErr, logErr)
		}
		return actionErr
	}

	if logErr != nil {
		return fmt.Errorf("container stopped, but action log failed: %w", logErr)
	}

	return nil
}

func (s *DockerService) RestartContainer(
	ctx context.Context,
	containerID string,
) error {
	if strings.TrimSpace(containerID) == "" {
		return ErrInvalidContainerID
	}

	actionErr := s.repository.RestartContainer(ctx, containerID)
	logErr := s.recordAction(ctx, containerID, "restart", actionErr)

	if actionErr != nil {
		if logErr != nil {
			return fmt.Errorf("%w; additionally, action log failed: %v", actionErr, logErr)
		}
		return actionErr
	}

	if logErr != nil {
		return fmt.Errorf("container restarted, but action log failed: %w", logErr)
	}

	return nil
}

func (s *DockerService) ListActionLogs(
	ctx context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]model.DockerActionLog, error) {
	if limit < 1 || limit > 500 {
		limit = 100
	}

	if offset < 0 {
		offset = 0
	}

	return s.actionLogRepo.ListByUser(ctx, userID, limit, offset)
}

func (s *DockerService) ListActionLogsByUser(
	ctx context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]model.DockerActionLog, error) {
	if limit < 1 || limit > 500 {
		limit = 100
	}

	if offset < 0 {
		offset = 0
	}

	return s.actionLogRepo.ListByUser(ctx, userID, limit, offset)
}
