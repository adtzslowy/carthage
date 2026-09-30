package model

import "time"

type DockerContainer struct {
	ID        string       `json:"id"`
	Name      string       `json:"name"`
	Image     string       `json:"image"`
	State     string       `json:"state"`
	Status    string       `json:"status"`
	CreatedAt time.Time    `json:"created_at"`
	Ports     []DockerPort `json:"ports"`
}

type DockerPort struct {
	IP          string `json:"ip,omitempty"`
	PrivatePort uint16 `json:"private_port"`
	PublicPort  uint16 `json:"public_port,omitempty"`
	Type        string `json:"type"`
}

type DockerContainerStats struct {
	ReadAt         time.Time `json:"read_at"`
	CPUPercent     float64   `json:"cpu_percent"`
	MemoryUsage    uint64    `json:"memory_usage_bytes"`
	MemoryLimit    uint64    `json:"memory_limit_bytes"`
	MemoryPercent  float64   `json:"memory_percent"`
	NetworkRxBytes uint64    `json:"network_rx_bytes"`
	NetworkTxBytes uint64    `json:"network_tx_bytes"`
	PIDs           uint64    `json:"pids"`
}
