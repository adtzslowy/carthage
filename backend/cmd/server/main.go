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
		log.Error.Printf("failed to initialize Docker client: %v", err)
		return
	}
	defer dockerRepo.Close()

	passwordService := service.NewPasswordService()
	tokenService := service.NewTokenService(cfg.JWT)

	dockerService := service.NewDockerService(
		dockerRepo,
		dockerActionLogRepo,
	)

	authService := service.NewAuthService(
		userRepository,
		passwordService,
		tokenService,
	)

	systemMonitor := monitor.NewSystemMonitor()
	systemService := service.NewSystemService(systemMonitor)

	authHandler := handler.NewAuthHandler(authService)
	systemHandler := handler.NewSystemHandler(systemService)
	dockerHandler := handler.NewDockerHandler(dockerService)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	systemService.Start(ctx, 2*time.Second)

	app := fiber.New(fiber.Config{
		AppName:      cfg.App.Name,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	})

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

	shutdownCtx, shutdownCancel := context.WithTimeout(
		context.Background(),
		10*time.Second,
	)
	defer shutdownCancel()

	if err := app.ShutdownWithContext(shutdownCtx); err != nil {
		log.Error.Printf("failed to shutdown server: %v", err)
	}

	log.Info.Println("server stopped")
}
