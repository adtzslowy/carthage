export interface DockerPort {
  ip?: string;
  private_port: number;
  public_port?: number;
  type: string;
}

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  created_at: string;
  ports: DockerPort[];
}

export interface DockerStats {
  read_at: string;
  cpu_percent: number;
  memory_usage_bytes: number;
  memory_limit_bytes: number;
  memory_percent: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  pids: number;
}

export type DockerAction = "start" | "stop" | "restart";