package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/adtzslowy/carthage/internal/config"
	"github.com/adtzslowy/carthage/internal/database"
	"github.com/adtzslowy/carthage/internal/model"
	"github.com/adtzslowy/carthage/internal/repository"
	"github.com/adtzslowy/carthage/internal/service"
)

func main() {
	cfg := config.Load()

	if strings.TrimSpace(cfg.Admin.Email) == "" {
		fmt.Println("ADMIN_EMAIL is required")
		os.Exit(1)
	}

	if cfg.Admin.Password == "" {
		fmt.Println("ADMIN_PASSWORD is required")
		os.Exit(1)
	}

	db, err := database.NewPostgres(cfg.Database)
	if err != nil {
		fmt.Printf("failed to connect to database: %v\n", err)
		os.Exit(1)
	}
	defer db.Close()

	userRepository := repository.NewUserRepository(db)
	passwordService := service.NewPasswordService()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = userRepository.FindByEmail(ctx, cfg.Admin.Email)

	if err == nil {
		fmt.Printf("user %s already exists\n", cfg.Admin.Email)
		return
	}

	if !errors.Is(err, repository.ErrUserNotFound) {
		fmt.Printf("failed to check existing user: %v\n", err)
		os.Exit(1)
	}

	passwordHash, err := passwordService.Hash(cfg.Admin.Password)
	if err != nil {
		fmt.Printf("failed to hash password: %v\n", err)
		os.Exit(1)
	}

	user := &model.User{
		Email:        cfg.Admin.Email,
		PasswordHash: passwordHash,
	}

	if err := userRepository.Create(ctx, user); err != nil {
		fmt.Printf("failed to create admin user: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("admin user created successfully: %s\n", user.Email)

}
