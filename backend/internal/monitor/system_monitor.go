package monitor

import (
	"context"
	"fmt"
	"runtime"
	"time"

	"github.com/adtzslowy/carthage/internal/model"
	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	"github.com/shirou/gopsutil/v4/net"
)

type SystemMonitor struct{}

func NewSystemMonitor() *SystemMonitor {
	return &SystemMonitor{}
}

func (m *SystemMonitor) Snapshot(ctx context.Context) (*model.SystemSnapshot, error) {
	snapshot := &model.SystemSnapshot{
		Timestamp: time.Now(),
	}

	// Host information
	hostInfo, err := host.InfoWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("get host info: %w", err)
	}

	uptime, err := host.UptimeWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("get uptime: %w", err)
	}

	snapshot.Host.Hostname = hostInfo.Hostname
	snapshot.Host.OS = hostInfo.OS
	snapshot.Host.Platform = hostInfo.Platform
	snapshot.Host.Uptime = uptime

	// CPU
	cpuPercent, err := cpu.PercentWithContext(ctx, 0, false)
	if err != nil {
		return nil, fmt.Errorf("get CPU usage: %w", err)
	}

	if len(cpuPercent) > 0 {
		snapshot.CPU.UsagePercent = cpuPercent[0]
	}
	snapshot.CPU.CoreCount = runtime.NumCPU()

	// Memory
	memory, err := mem.VirtualMemoryWithContext(ctx)
	if err != nil {
		return nil, fmt.Errorf("get memory: %w", err)
	}

	snapshot.Memory.Total = memory.Total
	snapshot.Memory.Used = memory.Used
	snapshot.Memory.Available = memory.Available
	snapshot.Memory.UsagePercent = memory.UsedPercent

	// Disk: root filesystem
	diskUsage, err := disk.UsageWithContext(ctx, "/")
	if err != nil {
		return nil, fmt.Errorf("get disk usage: %w", err)
	}

	snapshot.Disk.Path = "/"
	snapshot.Disk.Total = diskUsage.Total
	snapshot.Disk.Used = diskUsage.Used
	snapshot.Disk.Free = diskUsage.Free
	snapshot.Disk.UsagePercent = diskUsage.UsedPercent

	// Network: aggregate network interfaces
	network, err := net.IOCountersWithContext(ctx, false)
	if err != nil {
		return nil, fmt.Errorf("get network counters: %w", err)
	}

	if len(network) > 0 {
		snapshot.Network.BytesSent = network[0].BytesSent
		snapshot.Network.BytesRecv = network[0].BytesRecv
		snapshot.Network.PacketSent = network[0].PacketsSent
		snapshot.Network.PacketRecv = network[0].PacketsRecv
	}

	return snapshot, nil
}
