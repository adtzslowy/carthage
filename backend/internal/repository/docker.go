package repository

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/moby/moby/api/pkg/stdcopy"
	"github.com/moby/moby/client"
)

var ErrImageInUse = errors.New(
	"Docker image is still used by one or more containers",
)

type DockerRepository struct {
	client *client.Client
}

type dockerStatsResponse struct {
	Read time.Time `json:"read"`

	CPUStats struct {
		CPUUsage struct {
			TotalUsage  uint64   `json:"total_usage"`
			PerCPUUsage []uint64 `json:"percpu_usage"`
		} `json:"cpu_usage"`

		SystemCPUUsage uint64 `json:"system_cpu_usage"`
		OnlineCPUs     uint32 `json:"online_cpus"`
	} `json:"cpu_stats"`

	PreCPUStats struct {
		CPUUsage struct {
			TotalUsage uint64 `json:"total_usage"`
		} `json:"cpu_usage"`

		SystemCPUUsage uint64 `json:"system_cpu_usage"`
	} `json:"precpu_stats"`

	MemoryStats struct {
		Usage uint64 `json:"usage"`
		Limit uint64 `json:"limit"`

		Stats struct {
			Cache        uint64 `json:"cache"`
			InactiveFile uint64 `json:"inactive_file"`
		} `json:"stats"`
	} `json:"memory_stats"`

	Networks map[string]struct {
		RxBytes uint64 `json:"rx_bytes"`
		TxBytes uint64 `json:"tx_bytes"`
	} `json:"networks"`

	PIDsStats struct {
		Current uint64 `json:"current"`
	} `json:"pids_stats"`
}

func (r *DockerRepository) GetContainerStats(
	ctx context.Context,
	containerID string,
) (model.DockerContainerStats, error) {
	result, err := r.client.ContainerStats(
		ctx,
		containerID,
		client.ContainerStatsOptions{
			Stream:                false,
			IncludePreviousSample: true,
		},
	)
	if err != nil {
		return model.DockerContainerStats{}, err
	}
	defer result.Body.Close()

	var raw dockerStatsResponse
	if err := json.NewDecoder(result.Body).Decode(&raw); err != nil {
		return model.DockerContainerStats{}, err
	}

	var cpuPercent float64

	cpuCurrent := raw.CPUStats.CPUUsage.TotalUsage
	cpuPrevious := raw.PreCPUStats.CPUUsage.TotalUsage
	systemCurrent := raw.CPUStats.SystemCPUUsage
	systemPrevious := raw.PreCPUStats.SystemCPUUsage

	if cpuCurrent >= cpuPrevious && systemCurrent > systemPrevious {
		cpuDelta := cpuCurrent - cpuPrevious
		systemDelta := systemCurrent - systemPrevious

		cpus := raw.CPUStats.OnlineCPUs
		if cpus == 0 {
			cpus = uint32(len(raw.CPUStats.CPUUsage.PerCPUUsage))
		}

		if cpus > 0 && systemDelta > 0 {
			cpuPercent = float64(cpuDelta) /
				float64(systemDelta) *
				float64(cpus) * 100
		}
	}

	memoryUsage := raw.MemoryStats.Usage
	cache := raw.MemoryStats.Stats.InactiveFile

	if cache == 0 {
		cache = raw.MemoryStats.Stats.Cache
	}

	if cache < memoryUsage {
		memoryUsage -= cache
	}

	var memoryPercent float64
	if raw.MemoryStats.Limit > 0 {
		memoryPercent = float64(memoryUsage) /
			float64(raw.MemoryStats.Limit) * 100
	}

	var rxBytes, txBytes uint64
	for _, network := range raw.Networks {
		rxBytes += network.RxBytes
		txBytes += network.TxBytes
	}

	return model.DockerContainerStats{
		ReadAt:         raw.Read,
		CPUPercent:     cpuPercent,
		MemoryUsage:    memoryUsage,
		MemoryLimit:    raw.MemoryStats.Limit,
		MemoryPercent:  memoryPercent,
		NetworkRxBytes: rxBytes,
		NetworkTxBytes: txBytes,
		PIDs:           raw.PIDsStats.Current,
	}, nil
}

func NewDockerRepository() (*DockerRepository, error) {
	cli, err := client.New(
		client.FromEnv,
		client.WithUserAgent("carthage/1.0.0"),
	)

	if err != nil {
		return nil, err
	}

	return &DockerRepository{
		client: cli,
	}, nil
}

func (r *DockerRepository) Close() error {
	return r.client.Close()
}

func (r *DockerRepository) ListContainers(
	ctx context.Context,
) ([]model.DockerContainer, error) {
	result, err := r.client.ContainerList(
		ctx,
		client.ContainerListOptions{
			All: true,
		},
	)
	if err != nil {
		return nil, err
	}

	containers := make([]model.DockerContainer, 0, len(result.Items))

	for _, item := range result.Items {
		name := ""
		if len(item.Names) > 0 {
			name = strings.TrimPrefix(item.Names[0], "/")
		}

		if name == "" {
			name = item.ID
			if len(name) > 12 {
				name = name[:12]
			}
		}

		ports := make([]model.DockerPort, 0, len(item.Ports))

		for _, port := range item.Ports {
			ip := ""
			if port.IP.IsValid() {
				ip = port.IP.String()
			}

			ports = append(ports, model.DockerPort{
				IP:          ip,
				PrivatePort: port.PrivatePort,
				PublicPort:  port.PublicPort,
				Type:        port.Type,
			})
		}

		containers = append(containers, model.DockerContainer{
			ID:        item.ID,
			Name:      name,
			Image:     item.Image,
			State:     string(item.State),
			Status:    item.Status,
			CreatedAt: time.Unix(item.Created, 0).UTC(),
			Ports:     ports,
		})
	}

	return containers, nil
}

func (r *DockerRepository) GetContainerLogs(
	ctx context.Context,
	containerID string,
	tail string,
) (string, error) {
	result, err := r.client.ContainerLogs(
		ctx,
		containerID,
		client.ContainerLogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Timestamps: true,
			Tail:       tail,
		},
	)
	if err != nil {
		return "", err
	}
	defer result.Close()

	var logs bytes.Buffer

	// Decode Docker's multiplexed stdout/stderr stream.
	// Both streams are written to the same buffer to retain
	// their observed order.
	if _, err := stdcopy.StdCopy(&logs, &logs, result); err != nil {
		return "", err
	}

	return logs.String(), nil
}

func (r *DockerRepository) StartContainer(
	ctx context.Context,
	containerID string,
) error {
	_, err := r.client.ContainerStart(
		ctx,
		containerID,
		client.ContainerStartOptions{},
	)
	return err
}

func (r *DockerRepository) StopContainer(
	ctx context.Context,
	containerID string,
) error {
	_, err := r.client.ContainerStop(
		ctx,
		containerID,
		client.ContainerStopOptions{},
	)
	return err
}

func (r *DockerRepository) RestartContainer(
	ctx context.Context,
	containerID string,
) error {
	_, err := r.client.ContainerRestart(
		ctx,
		containerID,
		client.ContainerRestartOptions{},
	)
	return err
}

func (r *DockerRepository) ListImages(
	ctx context.Context,
) ([]model.DockerImage, error) {
	result, err := r.client.ImageList(
		ctx,
		client.ImageListOptions{},
	)
	if err != nil {
		return nil, err
	}

	containers, err := r.client.ContainerList(
		ctx,
		client.ContainerListOptions{All: true},
	)
	if err != nil {
		return nil, err
	}

	containerCounts := make(map[string]int)
	for _, container := range containers.Items {
		containerCounts[container.ImageID]++
	}

	images := make([]model.DockerImage, 0, len(result.Items))
	for _, item := range result.Items {
		images = append(images, model.DockerImage{
			ID:             item.ID,
			RepoTags:       item.RepoTags,
			RepoDigests:    item.RepoDigests,
			CreatedAt:      time.Unix(item.Created, 0).UTC(),
			Size:           item.Size,
			ContainerCount: containerCounts[item.ID],
		})
	}

	return images, nil
}

func (r *DockerRepository) GetImage(
	ctx context.Context,
	imageID string,
) (model.DockerImageDetail, error) {
	log.Printf("Docker ImageInspect requested: imageID=%q", imageID)

	result, err := r.client.ImageInspect(ctx, imageID)
	if err != nil {
		log.Printf("Docker ImageInspect failed: imageID=%q, error=%v", imageID, err)
		return model.DockerImageDetail{}, fmt.Errorf(
			"inspect Docker image %q: %w",
			imageID,
			err,
		)
	}

	createdAt, err := time.Parse(time.RFC3339Nano, result.Created)
	if err != nil {
		return model.DockerImageDetail{}, fmt.Errorf(
			"parse Docker image creation time: %w",
			err,
		)
	}

	return model.DockerImageDetail{
		DockerImage: model.DockerImage{
			ID:          result.ID,
			RepoTags:    result.RepoTags,
			RepoDigests: result.RepoDigests,
			CreatedAt:   createdAt,
			Size:        result.Size,
		},
		Architecture: result.Architecture,
		OS:           result.Os,
	}, nil
}

func (r *DockerRepository) RemoveImage(
	ctx context.Context,
	imageID string,
) error {
	if strings.TrimSpace(imageID) == "" {
		return fmt.Errorf("image ID is required")
	}

	containers, err := r.client.ContainerList(
		ctx,
		client.ContainerListOptions{All: true},
	)
	if err != nil {
		return err
	}

	for _, container := range containers.Items {
		if container.ImageID == imageID {
			return ErrImageInUse
		}
	}

	_, err = r.client.ImageRemove(
		ctx,
		imageID,
		client.ImageRemoveOptions{
			Force:         false,
			PruneChildren: false,
		},
	)
	if err != nil {
		return fmt.Errorf("remove Docker image %q: %w", imageID, err)
	}

	return nil
}
