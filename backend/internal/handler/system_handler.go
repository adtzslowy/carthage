package handler

import (
	"bufio"
	"encoding/json"
	"fmt"
	"time"

	"github.com/adtzslowy/carthage/internal/service"
	"github.com/gofiber/fiber/v2"
)

type SystemHandler struct {
	service *service.SystemService
}

func NewSystemHandler(systemService *service.SystemService) *SystemHandler {
	return &SystemHandler{
		service: systemService,
	}
}

func (h *SystemHandler) Get(c *fiber.Ctx) error {
	snapshot := h.service.GetSnapshot()
	if snapshot == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "system metrics are not available yet",
		})
	}

	return c.JSON(fiber.Map{
		"data": snapshot,
	})
}

func (h *SystemHandler) Stream(c *fiber.Ctx) error {
	c.Set("Content-Type", "text/event-stream")
	c.Set("Cache-Control", "no-cache")
	c.Set("Connection", "keep-alive")
	c.Set("X-Accel-Buffering", "no")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		ticker := time.NewTicker(2 * time.Second)
		defer ticker.Stop()

		send := func() error {
			snapshot := h.service.GetSnapshot()
			if snapshot == nil {
				_, err := fmt.Fprint(w, "event: error\ndata: {\"error\":\"metrics unavailable\"}\n\n")
				if err != nil {
					return err
				}
				return w.Flush()
			}

			payload, err := json.Marshal(snapshot)
			if err != nil {
				return err
			}

			if _, err := fmt.Fprintf(w, "event: system\ndata: %s\n\n", payload); err != nil {
				return err
			}

			return w.Flush()
		}

		if err := send(); err != nil {
			return
		}

		for range ticker.C {
			if err := send(); err != nil {
				return
			}
		}
	})

	return nil
}
