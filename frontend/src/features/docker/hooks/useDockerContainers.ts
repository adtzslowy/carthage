import { useCallback, useEffect, useState } from "react";
import { getDockerContainers } from "../api";
import type { DockerContainer } from "../../../types/docker";

interface UseDockerContainersOptions {
  pollInterval?: number;
}

export function useDockerContainers({
  pollInterval = 10000,
}: UseDockerContainersOptions = {}) {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    }

    try {
      const data = await getDockerContainers();

      setContainers(data);
      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      console.error("Failed to fetch Docker containers:", err);
      setError("Gagal mengambil daftar container dari Docker Engine.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const interval = window.setInterval(() => {
      void refresh();
    }, pollInterval);

    return () => window.clearInterval(interval);
  }, [refresh, pollInterval]);

  return {
    containers,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  };
}