package model

import "time"

type SystemSnapshot struct {
	Timestamp time.Time `json:"timestamp"`

	Host struct {
		Hostname string `json:"hostname"`
		OS       string `json:"os"`
		Platform string `json:"platform"`
		Uptime   uint64 `json:"uptime"`
	} `json:"host"`

	CPU struct {
		UsagePercent float64 `json:"usage_percent"`
		CoreCount    int     `json:"core_count"`
	} `json:"cpu"`

	Memory struct {
		Total        uint64  `json:"total_bytes"`
		Used         uint64  `json:"used_bytes"`
		Available    uint64  `json:"available_bytes"`
		UsagePercent float64 `json:"usage_percent"`
	} `json:"memory"`

	Disk struct {
		Path         string  `json:"path"`
		Total        uint64  `json:"total_bytes"`
		Used         uint64  `json:"used_bytes"`
		Free         uint64  `json:"free_bytes"`
		UsagePercent float64 `json:"usage_percent"`
	} `json:"disk"`

	Network struct {
		BytesSent  uint64 `json:"bytes_sent"`
		BytesRecv  uint64 `json:"bytes_recv"`
		PacketSent uint64 `json:"packet_sent"`
		PacketRecv uint64 `json:"packet_recv"`
	} `json:"network"`
}
