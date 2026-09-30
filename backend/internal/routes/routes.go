package routes

import (
	"github.com/adtzslowy/carthage/internal/handler"
	"github.com/adtzslowy/carthage/internal/middleware"
	"github.com/adtzslowy/carthage/internal/service"
	"github.com/gofiber/fiber/v2"
)

func Setup(
	app *fiber.App,
	authHandler *handler.AuthHandler,
	systemHandler *handler.SystemHandler,
	dockerHandler *handler.DockerHandler,
	dockerImageHandler *handler.DockerImageHandler,
	tokenService *service.TokenService,
) {
	api := app.Group("/api")

	api.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
		})
	})

	auth := api.Group("/auth")
	auth.Post("/login", authHandler.Login)

	protected := api.Group(
		"",
		middleware.Auth(tokenService),
	)

	protected.Get("/auth/me", authHandler.Me)

	protected.Get("/test", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"message": "authenticated",
		})
	})

	protected.Get("/system", systemHandler.Get)
	protected.Get("/system/stream", systemHandler.Stream)

	docker := protected.Group("/docker")

	docker.Get("/containers", dockerHandler.ListContainers)
	docker.Get("/containers/:id/stats", dockerHandler.GetContainerStats)
	docker.Get("/containers/:id/logs", dockerHandler.GetLogs)

	docker.Post("/containers/:id/start", dockerHandler.StartContainer)
	docker.Post("/containers/:id/stop", dockerHandler.StopContainer)
	docker.Post("/containers/:id/restart", dockerHandler.RestartContainer)

	docker.Get("/images", dockerImageHandler.ListImages)
	docker.Get("/images/:id", dockerImageHandler.GetImage)
	docker.Delete("/images/:id", dockerImageHandler.RemoveImage)

	docker.Get("/actions", dockerHandler.ListActionLogs)
}
