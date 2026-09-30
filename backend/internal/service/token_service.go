package service

import (
	"fmt"
	"time"

	"github.com/adtzslowy/carthage/internal/config"
	"github.com/adtzslowy/carthage/internal/model"
	"github.com/golang-jwt/jwt/v5"
)

type TokenService struct {
	config config.JWTConfig
}

func NewTokenService(cfg config.JWTConfig) *TokenService {
	return &TokenService{
		config: cfg,
	}
}

func (s *TokenService) Generate(user *model.User) (string, error) {
	now := time.Now()

	claims := jwt.MapClaims{
		"sub":   user.ID.String(),
		"email": user.Email,
		"iat":   now.Unix(),
		"exp":   now.Add(s.config.ExpiresIn).Unix(),
	}

	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	return token.SignedString([]byte(s.config.Secret))
}

func (s *TokenService) Validate(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(
		tokenString,
		func(token *jwt.Token) (interface{}, error) {
			if token.Method != jwt.SigningMethodHS256 {
				return nil, fmt.Errorf("unexpected signing method")
			}

			return []byte(s.config.Secret), nil
		},
	)

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return token, nil
}
