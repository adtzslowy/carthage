package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/adtzslowy/carthage/internal/config"
	"github.com/adtzslowy/carthage/internal/database"
	"github.com/adtzslowy/carthage/internal/handler"
	"github.com/adtzslowy/carthage/internal/logger"
	"github.com/adtzslowy/carthage/internal/monitor"
	"github.com/adtzslowy/carthage/internal/repository"
	"github.com/adtzslowy/carthage/internal/routes"
	"github.com/adtzslowy/carthage/internal/service"
	"github.com/gofiber/fiber/v2"
)

func main() {
	cfg := config.Load()
	log := logger.New()

	db, err := database.NewPostgres(cfg.Database)
	if err != nil {
		log.Error.Printf("failed to connect to database: %v", err)
		return
	}
	defer db.Close()

	log.Info.Println("database connection established")

	userRepository := repository.NewUserRepository(db)
	dockerActionLogRepo := repository.NewDockerActionLogRepository(db)
	dockerRepo, err := repository.NewDockerRepository()
	if err != nil {
		log.Error.Printf("Failed to initialize Docker client: %v", err)
		return
	}
	defer dockerRepo.Close()

	dockerService := service.NewDockerService(dockerRepo, dockerActionLogRepo)

	passwordService := service.NewPasswordService()
	tokenService := service.NewTokenService(cfg.JWT)

	authService := service.NewAuthService(
		userRepository,
		passwordService,
		tokenService,
	)

	systemMonitor := monitor.NewSystemMonitor()
	systemService := service.NewSystemService(systemMonitor)
	systemHandler := handler.NewSystemHandler(systemService)
	dockerHandler := handler.NewDockerHandler(dockerService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	systemService.Start(ctx, 2*time.Second)

	authHandler := handler.NewAuthHandler(authService)

	app := fiber.New()

	routes.Setup(
		app,
		authHandler,
		systemHandler,
		dockerHandler,
		tokenService,
	)

	serverErr := make(chan error, 1)

	go func() {
		log.Info.Printf(
			"starting %s on port %s",
			cfg.App.Name,
			cfg.App.Port,
		)

		if err := app.Listen(":" + cfg.App.Port); err != nil {
			serverErr <- err
		}
	}()

	signalChan := make(chan os.Signal, 1)
	signal.Notify(
		signalChan,
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer signal.Stop(signalChan)

	select {
	case sig := <-signalChan:
		log.Info.Printf("shutdown signal received: %s", sig)
	case err := <-serverErr:
		log.Error.Printf("server error: %v", err)
	}

	cancel()

	if err := app.Shutdown(); err != nil {
		log.Error.Printf("failed to shutdown server: %v", err)
	}

	log.Info.Println("server stopped")
}
