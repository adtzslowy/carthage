import { useEffect, useState } from "react";
import { RefreshCw, Terminal, AlertCircle } from "lucide-react";
import { getDockerLogs } from "../api";

interface ContainerLogsProps {
  containerId: string | null;
  containerName?: string;
}

export default function ContainerLogs({
  containerId,
  containerName,
}: ContainerLogsProps) {
  const [logs, setLogs] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!containerId) {
      setLogs("");
      setError("");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadLogs() {
      setLoading(true);
      setError("");

      try {
        const result = await getDockerLogs(
          containerId!,
          100,
          controller.signal
        );

        if (!controller.signal.aborted) {
          setLogs(result);
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Failed to load container logs:", err);
        setError("Gagal mengambil log. Periksa endpoint logs backend.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadLogs();

    return () => controller.abort();
  }, [containerId, refreshKey]);

  return (
    <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800 p-4">
        <div className="flex min-w-0 items-center gap-2">
          <Terminal size={17} className="shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <h2 className="font-semibold text-zinc-100">Container Logs</h2>
            <p className="mt-1 truncate text-xs text-zinc-500">
              {containerName ?? "Pilih container"} · 100 baris terakhir
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRefreshKey((value) => value + 1)}
          disabled={!containerId || loading}
          aria-label="Refresh logs"
          className="shrink-0 rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RefreshCw
            size={15}
            className={loading ? "animate-spin" : ""}
          />
        </button>
      </div>

      <div className="max-h-80 min-h-36 overflow-auto bg-zinc-950 p-4">
        {loading ? (
          <p className="text-xs text-zinc-500">Memuat log...</p>
        ) : error ? (
          <p className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} />
            {error}
          </p>
        ) : logs ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-5 text-zinc-400">
            {logs}
          </pre>
        ) : (
          <p className="text-xs text-zinc-600">
            {containerId
              ? "Belum ada log atau container belum menghasilkan output."
              : "Pilih container untuk melihat log."}
          </p>
        )}
      </div>
    </section>
  );
}