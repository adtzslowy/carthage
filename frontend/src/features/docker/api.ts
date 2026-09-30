import { api } from '../../lib/api';
import type {DockerAction, DockerContainer, DockerStats} from '../../types/docker';

interface ApiResponse<T> {
    data: T;
}

export async function getDockerContainers(): Promise<DockerContainer[]> {
    const response = await api.get<ApiResponse<DockerContainer[]>>(
        "/docker/containers"
    );

    return response.data.data ?? [];
}

export async function getDockerStats(id: string, signal?: AbortSignal): Promise<DockerStats> {
    const response = await api.get<ApiResponse<DockerStats>>(
        `/docker/containers/${encodeURIComponent(id)}/stats`,
        {signal}
    );

    return response.data.data;
}

function normalizeLogs(payload: unknown): string {
  if (typeof payload === "string") {
    try {
      return normalizeLogs(JSON.parse(payload));
    } catch {
      return payload;
    }
  }

  if (Array.isArray(payload)) {
    return payload.map((line) => String(line)).join("\n");
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if ("data" in record) {
      return normalizeLogs(record.data);
    }

    if ("logs" in record) {
      return normalizeLogs(record.logs);
    }

    if ("message" in record && typeof record.message === "string") {
      return record.message;
    }

    return JSON.stringify(payload, null, 2);
  }

  return payload == null ? "" : String(payload);
}

export async function getDockerLogs(
  id: string,
  tail = 100,
  signal?: AbortSignal
): Promise<string> {
  const response = await api.get<string>(
    `/docker/containers/${encodeURIComponent(id)}/logs`,
    {
      params: { tail },
      responseType: "text",
      signal,
    }
  );

  return normalizeLogs(response.data);
}

export async function performDockerAction(
  id: string,
  action: DockerAction
): Promise<void> {
  await api.post(
    `/docker/containers/${encodeURIComponent(id)}/${action}`
  );
}
