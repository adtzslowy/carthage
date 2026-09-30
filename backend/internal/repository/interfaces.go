package repository

import (
	"context"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/google/uuid"
)

type UserRepositoryInterface interface {
	Create(ctx context.Context, user *model.User) error
	FindByEmail(ctx context.Context, email string) (*model.User, error)
	FindByID(ctx context.Context, id uuid.UUID) (*model.User, error)
}

type DockerActionLogRepositoryInterface interface {
	Create(
		ctx context.Context,
		log *model.DockerActionLog,
	) error

	List(
		ctx context.Context,
		limit int,
		offset int,
	) ([]model.DockerActionLog, error)
}
