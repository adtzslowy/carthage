package service

import (
	"context"
	"fmt"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/adtzslowy/carthage/internal/repository"
)

type UserService struct {
	userRepository repository.UserRepositoryInterface
}

func NewUserService(
	userRepository repository.UserRepositoryInterface,
) *UserService {
	return &UserService{
		userRepository: userRepository,
	}
}

func (s *UserService) GetByEmail(
	ctx context.Context,
	email string,
) (*model.User, error) {
	user, err := s.userRepository.FindByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}

	return user, nil
}
