package model

import (
	"time"

	"github.com/google/uuid"
)

type DockerActionLog struct {
	ID            uuid.UUID  `json:"id"`
	UserID        *uuid.UUID `json:"user_id,omitempty"`
	ContainerID   string     `json:"container_id"`
	ContainerName string     `json:"container_name"`
	Action        string     `json:"action"`
	Status        string     `json:"status"`
	ErrorMessage  string     `json:"error_message,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}
