package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Admin    AdminConfig
}

type AppConfig struct {
	Name string
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	Secret    string
	ExpiresIn time.Duration
}

type AdminConfig struct {
	Email    string
	Password string
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "Carthage"),
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
		},

		Database: DatabaseConfig{
			Host:     getEnv("DATABASE_HOST", "localhost"),
			Port:     getEnv("DATABASE_PORT", "5432"),
			User:     getEnv("DATABASE_USER", "postgres"),
			Password: os.Getenv("DATABASE_PASSWORD"),
			Name:     getEnv("DATABASE_NAME", "carthage"),
			SSLMode:  getEnv("DATABASE_SSLMODE", "disable"),
		},

		JWT: JWTConfig{
			Secret: getEnv("JWT_SECRET", ""),
			ExpiresIn: loadDuration(
				"JWT_EXPIRES_IN",
				24*time.Hour,
			),
		},

		Admin: AdminConfig{
			Email:    getEnv("ADMIN_EMAIL", ""),
			Password: getEnv("ADMIN_PASSWORD", ""),
		},
	}
}

func getEnv(key string, fallback string) string {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	return value
}

func loadDuration(key string, fallback time.Duration) time.Duration {
	value := os.Getenv(key)

	if value == "" {
		return fallback
	}

	duration, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}

	return duration
}
