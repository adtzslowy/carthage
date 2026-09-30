package system

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetMetrics(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), 5*time.Second)
	defer cancel()

	metrics, err := h.service.GetMetrics(ctx)
	if err != nil {
		return fiber.NewError(
			fiber.StatusServiceUnavailable,
			"Failed to retrieve system metrics",
		)
	}

	return c.JSON(fiber.Map{
		"data": metrics,
	})
}
