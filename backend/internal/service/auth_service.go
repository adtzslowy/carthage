package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/adtzslowy/carthage/internal/repository"
	"github.com/google/uuid"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type AuthService struct {
	userRepository repository.UserRepositoryInterface
	password       *PasswordService
	token          *TokenService
}

func NewAuthService(
	userRepository repository.UserRepositoryInterface,
	password *PasswordService,
	token *TokenService,
) *AuthService {
	return &AuthService{
		userRepository: userRepository,
		password:       password,
		token:          token,
	}
}

func (s *AuthService) Login(
	ctx context.Context,
	email string,
	password string,
) (string, error) {
	user, err := s.userRepository.FindByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return "", ErrInvalidCredentials
		}

		return "", fmt.Errorf("find user: %w", err)
	}

	if err := s.password.Compare(
		password,
		user.PasswordHash,
	); err != nil {
		return "", ErrInvalidCredentials
	}

	token, err := s.token.Generate(user)
	if err != nil {
		return "", fmt.Errorf("generate token: %w", err)
	}

	return token, nil
}

func (s *AuthService) GetCurrentUser(
	ctx context.Context,
	userID string,
) (*model.User, error) {
	id, err := uuid.Parse(userID)

	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	user, err := s.userRepository.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get current user: %w", err)
	}

	return user, nil
}
