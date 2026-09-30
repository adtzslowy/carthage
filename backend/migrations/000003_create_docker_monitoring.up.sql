-- =========================================================
-- Docker Action Logs
-- Records container actions performed through Carthage.
-- =========================================================

CREATE TABLE IF NOT EXISTS docker_action_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,

    container_id VARCHAR(128) NOT NULL,
    container_name VARCHAR(255) NOT NULL,

    action VARCHAR(20) NOT NULL
        CHECK (action IN ('start', 'stop', 'restart')),

    status VARCHAR(20) NOT NULL
        CHECK (status IN ('success', 'failed')),

    error_message TEXT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docker_action_logs_created_at
    ON docker_action_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_docker_action_logs_container
    ON docker_action_logs (container_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_docker_action_logs_user
    ON docker_action_logs (user_id, created_at DESC);


-- =========================================================
-- Docker Metrics
-- Historical CPU and memory snapshots.
-- Container IDs are not foreign keys because Docker
-- containers can be recreated or removed.
-- =========================================================

CREATE TABLE IF NOT EXISTS docker_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    container_id VARCHAR(128) NOT NULL,
    container_name VARCHAR(255) NOT NULL,

    cpu_percent DOUBLE PRECISION NOT NULL DEFAULT 0
        CHECK (cpu_percent >= 0),

    memory_usage BIGINT NOT NULL DEFAULT 0
        CHECK (memory_usage >= 0),

    memory_limit BIGINT NOT NULL DEFAULT 0
        CHECK (memory_limit >= 0),

    network_rx BIGINT NOT NULL DEFAULT 0
        CHECK (network_rx >= 0),

    network_tx BIGINT NOT NULL DEFAULT 0
        CHECK (network_tx >= 0),

    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docker_metrics_container_time
    ON docker_metrics (container_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_docker_metrics_recorded_at
    ON docker_metrics (recorded_at DESC);


-- =========================================================
-- Docker Preferences
-- Per-user dashboard preferences and favorite containers.
-- =========================================================

CREATE TABLE IF NOT EXISTS docker_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL UNIQUE
        REFERENCES users(id) ON DELETE CASCADE,

    favorite_containers JSONB NOT NULL DEFAULT '[]'::JSONB
        CHECK (jsonb_typeof(favorite_containers) = 'array'),

    log_tail INTEGER NOT NULL DEFAULT 100
        CHECK (log_tail BETWEEN 1 AND 5000),

    auto_refresh_seconds INTEGER NOT NULL DEFAULT 15
        CHECK (auto_refresh_seconds BETWEEN 5 AND 3600),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);