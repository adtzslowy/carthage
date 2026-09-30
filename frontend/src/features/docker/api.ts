
import { api } from "../../lib/api";
import type {
  DockerAction,
  DockerContainer,
  DockerStats,
  DockerActionLog,
} from "../../types/docker";
import type {
  DockerImage,
  DockerImageDetail,
} from "../../types/docker";

interface ApiResponse<T> {
  data: T;
}

export interface PaginatedDockerActionLogs {
  data: DockerActionLog[];
  meta: {
    limit: number;
    offset: number;
  };
}

export async function getDockerContainers(
  signal?: AbortSignal
): Promise<DockerContainer[]> {
  const response = await api.get<ApiResponse<DockerContainer[]>>(
    "/docker/containers",
    { signal }
  );

  return response.data.data ?? [];
}

export async function getDockerStats(
  id: string,
  signal?: AbortSignal
): Promise<DockerStats> {
  const response = await api.get<ApiResponse<DockerStats>>(
    `/docker/containers/${encodeURIComponent(id)}/stats`,
    { signal }
  );

  return response.data.data;
}

export async function getDockerLogs(
  id: string,
  tail = 100,
  signal?: AbortSignal
): Promise<string> {
  const response = await api.get<
    ApiResponse<{ container_id: string; logs: string }>
  >(`/docker/containers/${encodeURIComponent(id)}/logs`, {
    params: { tail },
    signal,
  });

  return response.data.data?.logs ?? "";
}

export async function performDockerAction(
  id: string,
  action: DockerAction
): Promise<void> {
  await api.post(
    `/docker/containers/${encodeURIComponent(id)}/${action}`
  );
}

export async function getDockerActionLogs(
  limit = 20,
  offset = 0,
  signal?: AbortSignal
): Promise<PaginatedDockerActionLogs> {
  const response = await api.get<PaginatedDockerActionLogs>(
    "/docker/actions",
    {
      params: { limit, offset },
      signal,
    }
  );

  return response.data;
}

export async function getDockerImages(
  signal?: AbortSignal
): Promise<DockerImage[]> {
  const response = await api.get<ApiResponse<DockerImage[]>>(
    "/docker/images",
    { signal }
  );

  return response.data.data ?? [];
}

export const getDockerImage = async (id: string) => {
  const response = await api.get(
    `/docker/images/${id}`,
  );

  return response.data.data;
};

export async function removeDockerImage(id: string): Promise<void> {
  await api.delete(
    `/docker/images/${encodeURIComponent(id)}`
  );
}