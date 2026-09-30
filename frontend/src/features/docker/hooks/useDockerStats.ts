import { useEffect, useState } from "react";
import { getDockerStats } from "../api";
import type { DockerStats } from "../../../types/docker";

interface UseDockerStatsOptions {
  pollInterval?: number;
}

export function useDockerStats(
  containerId: string | null,
  enabled: boolean,
  { pollInterval = 5000 }: UseDockerStatsOptions = {}
) {
  const [stats, setStats] = useState<DockerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerId || !enabled) {
      setStats(null);
      setLoading(false);
      setError("");
      return;
    }

    let active = true;
    let firstRequest = true;
    let controller: AbortController | null = null;

    const fetchStats = async () => {
      controller?.abort();
      controller = new AbortController();

      if (firstRequest) {
        setLoading(true);
      }

      try {
        const data = await getDockerStats(
          containerId,
          controller.signal
        );

        if (!active) return;

        setStats(data);
        setError("");
      } catch (err) {
        if (!active || controller.signal.aborted) return;

        console.error("Failed to fetch Docker stats:", err);
        setError("Statistik container tidak tersedia saat ini.");
      } finally {
        if (active && firstRequest) {
          setLoading(false);
          firstRequest = false;
        }
      }
    };

    setStats(null);
    setError("");
    setLoading(true);

    void fetchStats();

    const interval = window.setInterval(() => {
      void fetchStats();
    }, pollInterval);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, [containerId, enabled, pollInterval]);

  return {
    stats,
    loading,
    error,
  };
}