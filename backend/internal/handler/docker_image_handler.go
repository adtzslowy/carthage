package handler

import (
	"context"
	"errors"
	"log"
	"net/url"
	"time"

	"github.com/adtzslowy/carthage/internal/repository"
	"github.com/adtzslowy/carthage/internal/service"
	"github.com/gofiber/fiber/v2"
)

type DockerImageHandler struct {
	service *service.DockerService
}

func NewDockerImageHandler(s *service.DockerService) *DockerImageHandler {
	return &DockerImageHandler{service: s}
}

func (h *DockerImageHandler) ListImages(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.UserContext(), 15*time.Second)
	defer cancel()

	images, err := h.service.ListImages(ctx)
	if err != nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error":   "docker_images_unavailable",
			"message": "Tidak dapat mengambil daftar Docker images",
		})
	}

	return c.JSON(fiber.Map{"data": images})
}

func (h *DockerImageHandler) GetImage(c *fiber.Ctx) error {
	rawID := c.Params("id")

	imageID, err := url.PathUnescape(rawID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "invalid_image_id",
			"message": "Format image ID tidak valid",
		})
	}

	image, err := h.service.GetImage(c.UserContext(), imageID)
	if err != nil {
		// Pertahankan logging agar error Docker asli bisa ditelusuri.
		log.Printf("GetImage failed: id=%q, error=%v", imageID, err)

		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "docker_image_unavailable",
			"message": "Tidak dapat mengambil detail image",
		})
	}

	return c.JSON(fiber.Map{
		"data": image,
	})
}

func (h *DockerImageHandler) RemoveImage(c *fiber.Ctx) error {
	rawID := c.Params("id")

	imageID, err := url.PathUnescape(rawID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   "invalid_image_id",
			"message": "Format image ID tidak valid",
		})
	}

	ctx, cancel := context.WithTimeout(c.UserContext(), 30*time.Second)
	defer cancel()

	_, err = h.service.RemoveImage(ctx, imageID)
	if err != nil {
		log.Printf("RemoveImage failed: id=%q, error=%v", imageID, err)

		if errors.Is(err, repository.ErrImageInUse) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{
				"error":   "image_in_use",
				"message": "Docker image masih digunakan oleh satu atau lebih container",
			})
		}

		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"error":   "docker_image_removal_failed",
			"message": "Gagal menghapus Docker image",
		})
	}

	return c.JSON(fiber.Map{
		"message":  "Docker image berhasil dihapus",
		"image_id": imageID,
	})
}
