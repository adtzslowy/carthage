export interface SystemSnapshot {
  timestamp: string
  host: {
    hostname: string
    os: string
    platform: string
    uptime: number
  }
  cpu: {
    usage_percent: number
    core_count: number
  }
  memory: {
    total_bytes: number
    used_bytes: number
    available_bytes: number
    usage_percent: number
  }
  disk: {
    path: string
    total_bytes: number
    used_bytes: number
    free_bytes: number
    usage_percent: number
  }
  network: {
    bytes_sent: number
    bytes_recv: number
    packet_sent: number
    packet_recv: number
  }
}