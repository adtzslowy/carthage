package service

import (
	"context"
	"sync"
	"time"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/adtzslowy/carthage/internal/monitor"
)

type SystemService struct {
	monitor *monitor.SystemMonitor

	mu       sync.RWMutex
	snapshot *model.SystemSnapshot
}

func NewSystemService(systemMonitor *monitor.SystemMonitor) *SystemService {
	return &SystemService{
		monitor: systemMonitor,
	}
}

func (s *SystemService) GetSnapshot() *model.SystemSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	if s.snapshot == nil {
		return nil
	}

	copied := *s.snapshot
	return &copied
}

func (s *SystemService) Refresh(ctx context.Context) error {
	snapshot, err := s.monitor.Snapshot(ctx)
	if err != nil {
		return err
	}

	s.mu.Lock()
	s.snapshot = snapshot
	s.mu.Unlock()

	return nil
}

func (s *SystemService) Start(ctx context.Context, interval time.Duration) {
	if interval <= 0 {
		interval = 2 * time.Second
	}

	go func() {
		_ = s.Refresh(ctx)

		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				_ = s.Refresh(ctx)
			}
		}
	}()
}
