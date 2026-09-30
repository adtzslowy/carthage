
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

export interface DockerActionLog {
  id: string;
  user_id?: string;
  container_id: string;
  container_name: string;
  action: DockerAction;
  status: "success" | "failed";
  error_message?: string;
  created_at: string;
}

export interface DockerImage {
  id: string;
  repo_tags: string[];
  repo_digests: string[];
  created_at: string;
  size_bytes: number;
  container_count: number;
}

export interface DockerImageDetail extends DockerImage {
  architecture: string;
  os: string;
}