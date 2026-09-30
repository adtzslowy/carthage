
import { useEffect, useState } from "react";
import {
  Box,
  CircleHelp,
  Clock3,
  Container,
  FileText,
  Play,
  RefreshCw,
  Square,
  X,
} from "lucide-react";

export interface DockerContainerDetail {
  id: string;
  name: string;
  image: string;
  status: string;
  created?: string;
  ports?: string[];
}

interface ContainerDetailModalProps {
  container: DockerContainerDetail | null;
  logs: string;
  logsLoading?: boolean;
  onClose: () => void;
  onStart: (id: string) => Promise<void>;
  onStop: (id: string) => Promise<void>;
  onRestart: (id: string) => Promise<void>;
  onRefreshLogs: (id: string, tail: number) => Promise<void>;
}

type Action = "start" | "stop" | "restart";

export default function ContainerDetailModal({
  container,
  logs,
  logsLoading = false,
  onClose,
  onStart,
  onStop,
  onRestart,
  onRefreshLogs,
}: ContainerDetailModalProps) {
  const [actionLoading, setActionLoading] = useState<Action | null>(null);
  const [tail, setTail] = useState(100);
  const [actionError, setActionError] = useState("");

  const isRunning = container?.status.toLowerCase().includes("up")
    || container?.status.toLowerCase().includes("running")
    || container?.status.toLowerCase().includes("healthy");

  useEffect(() => {
    if (!container) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !actionLoading) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [container, actionLoading, onClose]);

  useEffect(() => {
    if (container) {
      setActionError("");
      setTail(100);
      void onRefreshLogs(container.id, 100);
    }
  }, [container?.id]);

  if (!container) return null;

  const runAction = async (action: Action) => {
    if (actionLoading) return;

    if (action === "stop" && !window.confirm(
      `Matikan container "${container.name}"?`
    )) return;

    if (action === "restart" && !window.confirm(
      `Restart container "${container.name}"?`
    )) return;

    setActionError("");
    setActionLoading(action);

    try {
      if (action === "start") await onStart(container.id);
      if (action === "stop") await onStop(container.id);
      if (action === "restart") await onRestart(container.id);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Aksi container gagal."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const refreshLogs = async (nextTail = tail) => {
    await onRefreshLogs(container.id, nextTail);
  };

  const actionButton = (
    action: Action,
    label: string,
    Icon: typeof Play,
    enabled: boolean,
    color: string
  ) => (
    <button
      type="button"
      disabled={!enabled || actionLoading !== null}
      onClick={() => void runAction(action)}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${color}`}
    >
      {actionLoading === action ? (
        <RefreshCw className="h-4 w-4 animate-spin" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {actionLoading === action ? "Processing..." : label}
    </button>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !actionLoading) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="container-modal-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-2.5 text-emerald-400">
              <Container className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="container-modal-title"
                className="truncate text-base font-semibold text-zinc-100"
              >
                {container.name}
              </h2>
              <p className="mt-0.5 truncate text-xs text-zinc-500">
                {container.id}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                isRunning
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {container.status}
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={actionLoading !== null}
              aria-label="Tutup modal"
              className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {/* Container info */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                <Box className="h-3.5 w-3.5" />
                Image
              </div>
              <p className="break-all text-sm text-zinc-200">
                {container.image}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                <Clock3 className="h-3.5 w-3.5" />
                Created
              </div>
              <p className="text-sm text-zinc-200">
                {container.created || "—"}
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 sm:col-span-2">
              <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500">
                <CircleHelp className="h-3.5 w-3.5" />
                Ports
              </div>
              <p className="break-all text-sm text-zinc-200">
                {container.ports?.length
                  ? container.ports.join(", ")
                  : "Tidak ada port yang dipublikasikan"}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">
              Container Actions
            </h3>
            <div className="flex flex-wrap gap-2">
              {actionButton(
                "start",
                "Start",
                Play,
                !isRunning,
                "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
              )}
              {actionButton(
                "stop",
                "Stop",
                Square,
                Boolean(isRunning),
                "border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
              )}
              {actionButton(
                "restart",
                "Restart",
                RefreshCw,
                Boolean(isRunning),
                "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              )}
            </div>
            {actionError && (
              <p role="alert" className="mt-3 text-sm text-red-400">
                {actionError}
              </p>
            )}
          </div>

          {/* Logs */}
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  Container Logs
                </h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Menampilkan {tail} baris terakhir
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={tail}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setTail(value);
                    void refreshLogs(value);
                  }}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300 outline-none focus:border-emerald-500"
                  aria-label="Jumlah baris log"
                >
                  <option value={50}>50 baris</option>
                  <option value={100}>100 baris</option>
                  <option value={500}>500 baris</option>
                  <option value={1000}>1000 baris</option>
                </select>
                <button
                  type="button"
                  onClick={() => void refreshLogs()}
                  disabled={logsLoading}
                  aria-label="Refresh logs"
                  className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${logsLoading ? "animate-spin" : ""}`}
                  />
                </button>
              </div>
            </div>

            <div className="max-h-72 min-h-40 overflow-auto rounded-xl border border-zinc-800 bg-black p-4 font-mono text-xs leading-6">
              {logsLoading ? (
                <p className="text-zinc-500">Memuat log...</p>
              ) : logs ? (
                <pre className="whitespace-pre-wrap break-words text-zinc-300">
                  {logs}
                </pre>
              ) : (
                <p className="text-zinc-600">
                  Belum ada log untuk ditampilkan.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex justify-end border-t border-zinc-800 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={actionLoading !== null}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-40"
          >
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}