package system

import (
	"context"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
)

type Metrics struct {
	Timestamp time.Time `json:"timestamp"`

	CPU struct {
		UsagePercent float64 `json:"usage_percent"`
		Cores        int     `json:"cores"`
		Model        string  `json:"model"`
	} `json:"cpu"`

	Memory struct {
		Total        uint64  `json:"total"`
		Used         uint64  `json:"used"`
		Available    uint64  `json:"available"`
		UsagePercent float64 `json:"usage_percent"`
	} `json:"memory"`

	Disk struct {
		Path         string  `json:"path"`
		Total        uint64  `json:"total"`
		Used         uint64  `json:"used"`
		Free         uint64  `json:"free"`
		UsagePercent float64 `json:"usage_percent"`
	} `json:"disk"`

	Host struct {
		Hostname        string `json:"hostname"`
		OS              string `json:"os"`
		Platform        string `json:"platform"`
		PlatformVersion string `json:"platform_version"`
		KernelVersion   string `json:"kernel_version"`
		UptimeSeconds   uint64 `json:"uptime_seconds"`
	} `json:"host"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GetMetrics(ctx context.Context) (*Metrics, error) {
	result := &Metrics{
		Timestamp: time.Now().UTC(),
	}

	cpuInfo, err := cpu.Info()
	if err != nil {
		return nil, err
	}

	cpuUsage, err := cpu.PercentWithContext(ctx, time.Second, false)
	if err != nil {
		return nil, err
	}

	memoryInfo, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, err
	}

	diskInfo, err := disk.UsageWithContext(ctx, "/")
	if err != nil {
		return nil, err
	}

	hostInfo, err := host.InfoWithContext(ctx)
	if err != nil {
		return nil, err
	}

	if len(cpuUsage) > 0 {
		result.CPU.UsagePercent = cpuUsage[0]
	}

	result.CPU.Cores = len(cpuInfo)
	if len(cpuInfo) > 0 {
		result.CPU.Model = cpuInfo[0].ModelName
	}

	result.Memory.Total = memoryInfo.Total
	result.Memory.Used = memoryInfo.Used
	result.Memory.Available = memoryInfo.Available
	result.Memory.UsagePercent = memoryInfo.UsedPercent

	result.Disk.Path = "/"
	result.Disk.Total = diskInfo.Total
	result.Disk.Used = diskInfo.Used
	result.Disk.Free = diskInfo.Free
	result.Disk.UsagePercent = diskInfo.UsedPercent

	result.Host.Hostname = hostInfo.Hostname
	result.Host.OS = hostInfo.OS
	result.Host.Platform = hostInfo.Platform
	result.Host.PlatformVersion = hostInfo.PlatformVersion
	result.Host.KernelVersion = hostInfo.KernelVersion
	result.Host.UptimeSeconds = hostInfo.Uptime

	return result, nil
}
