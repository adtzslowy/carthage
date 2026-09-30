package handler

import (
	"context"
	"strconv"
	"time"

	"github.com/adtzslowy/carthage/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type DockerHandler struct {
	service *service.DockerService
}

func NewDockerHandler(s *service.DockerService) *DockerHandler {
	return &DockerHandler{
		service: s,
	}
}

func (h *DockerHandler) ListContainers(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), 10*time.Second)
	defer cancel()

	containers, err := h.service.ListContainers(ctx)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "docker_unavailable",
			"message": "Docker engine tidak dapat diakses",
		})
	}

	return c.JSON(fiber.Map{
		"data": containers,
	})
}

func (h *DockerHandler) GetContainerStats(c *fiber.Ctx) error {
	containerID := c.Params("id")
	if containerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "container ID is required",
		})
	}

	ctx, cancel := context.WithTimeout(
		c.UserContext(),
		15*time.Second,
	)
	defer cancel()

	stats, err := h.service.GetContainerStats(ctx, containerID)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "docker_stats_unavailable",
			"message": "Tidak dapat mengambil statistik container",
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
	})
}

func (h *DockerHandler) GetLogs(c *fiber.Ctx) error {
	containerID := c.Params("id")
	if containerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "container ID is required",
		})
	}

	tail := c.Query("tail", "100")
	n, err := strconv.Atoi(tail)
	if err != nil || n < 1 || n > 5000 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "tail must be between 1 and 5000",
		})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()

	logs, err := h.service.GetContainerLogs(ctx, containerID, tail)
	if err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "docker_logs_unavailable",
			"message": "Tidak dapat mengambil log container",
		})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"container_id": containerID,
			"logs":         logs,
		},
	})
}

func (h *DockerHandler) StartContainer(c *fiber.Ctx) error {
	return h.containerAction(c, "start", h.service.StartContainer)
}

func (h *DockerHandler) StopContainer(c *fiber.Ctx) error {
	return h.containerAction(c, "stop", h.service.StopContainer)
}

func (h *DockerHandler) RestartContainer(c *fiber.Ctx) error {
	return h.containerAction(c, "restart", h.service.RestartContainer)
}

func (h *DockerHandler) containerAction(
	c *fiber.Ctx,
	action string,
	operation func(context.Context, string) error,
) error {
	containerID := c.Params("id")
	if containerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "container ID is required",
		})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()

	if err := operation(ctx, containerID); err != nil {
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "docker_action_failed",
			"message": "Gagal menjalankan aksi " + action + " pada container",
		})
	}

	return c.JSON(fiber.Map{
		"message":      "Container berhasil di-" + action,
		"container_id": containerID,
		"action":       action,
	})
}

func (h *DockerHandler) ListActionLogs(c *fiber.Ctx) error {
	userIDValue := c.Locals("userID")
	userIDString, ok := userIDValue.(string)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "unauthorized",
		})
	}

	userID, err := uuid.Parse(userIDString)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "invalid_user_id",
		})
	}

	limit := c.QueryInt("limit", 100)
	offset := c.QueryInt("offset", 0)

	if limit < 1 || limit > 500 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "limit_must_be_between_1_and_500",
		})
	}

	if offset < 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "offset_must_be_non_negative",
		})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 10*time.Second)
	defer cancel()

	logs, err := h.service.ListActionLogs(ctx, userID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "docker_action_logs_unavailable",
		})
	}

	return c.JSON(fiber.Map{
		"data": logs,
		"meta": fiber.Map{
			"limit":  limit,
			"offset": offset,
		},
	})
}
