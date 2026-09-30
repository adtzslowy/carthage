package repository

import (
	"context"
	"fmt"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type DockerActionLogRepository struct {
	db *pgxpool.Pool
}

func NewDockerActionLogRepository(
	db *pgxpool.Pool,
) *DockerActionLogRepository {
	return &DockerActionLogRepository{db: db}
}

func (r *DockerActionLogRepository) Create(
	ctx context.Context,
	log *model.DockerActionLog,
) error {
	query := `
		INSERT INTO docker_action_logs (
			user_id,
			container_id,
			container_name,
			action,
			status,
			error_message
		)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at
	`

	err := r.db.QueryRow(
		ctx,
		query,
		log.UserID,
		log.ContainerID,
		log.ContainerName,
		log.Action,
		log.Status,
		nullableError(log.ErrorMessage),
	).Scan(&log.ID, &log.CreatedAt)

	if err != nil {
		return fmt.Errorf("create docker action log: %w", err)
	}

	return nil
}

func (r *DockerActionLogRepository) ListByUser(
	ctx context.Context,
	userID uuid.UUID,
	limit, offset int,
) ([]model.DockerActionLog, error) {
	if limit < 1 || limit > 500 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT
			id,
			user_id,
			container_id,
			container_name,
			action,
			status,
			COALESCE(error_message, ''),
			created_at
		FROM docker_action_logs
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list docker action logs: %w", err)
	}
	defer rows.Close()

	logs := make([]model.DockerActionLog, 0)

	for rows.Next() {
		var item model.DockerActionLog
		var userID *uuid.UUID

		if err := rows.Scan(
			&item.ID,
			&userID,
			&item.ContainerID,
			&item.ContainerName,
			&item.Action,
			&item.Status,
			&item.ErrorMessage,
			&item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan docker action log: %w", err)
		}

		item.UserID = userID
		logs = append(logs, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate docker action logs: %w", err)
	}

	return logs, nil
}

func nullableError(message string) any {
	if message == "" {
		return nil
	}
	return message
}
