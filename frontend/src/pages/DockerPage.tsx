import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, Container, RefreshCw, Search } from "lucide-react";

import { api } from "../lib/api";
import ContainerDetailModal from "../features/docker/components/ContainerDetailModal";
import type { DockerContainerDetail } from "../features/docker/components/ContainerDetailModal";

// -----------------------------------------------------------------------------
// Types & normalisasi data
// -----------------------------------------------------------------------------

interface DockerPort {
  PublicPort?: number;
  PrivatePort?: number;
  Type?: string;
  public_port?: number;
  private_port?: number;
  type?: string;
}

interface DockerContainer extends DockerContainerDetail {
  state?: string;
  names?: string[];
  ports?: string[];
}

interface ApiEnvelope<T> {
  data: T;
}

type Filter = "all" | "running" | "stopped";
type Tone = "ok" | "warn" | "crit" | "off";

const REFRESH_INTERVAL_MS = 15000;

function normalizeContainer(raw: Record<string, unknown>): DockerContainer {
  const rawNames = raw.names ?? raw.Names;
  const rawPorts = raw.ports ?? raw.Ports;

  const names = Array.isArray(rawNames) ? rawNames.map(String) : [];

  const ports = Array.isArray(rawPorts)
    ? rawPorts.map((port) => {
        if (typeof port === "string") return port;

        const item = port as DockerPort;
        const publicPort = item.PublicPort ?? item.public_port;
        const privatePort = item.PrivatePort ?? item.private_port;
        const type = item.Type ?? item.type ?? "tcp";

        return publicPort
          ? `${publicPort}:${privatePort}/${type}`
          : `${privatePort}/${type}`;
      })
    : [];

  const rawName = raw.name ?? raw.Name;
  const name = String(
    rawName ?? names[0]?.replace(/^\//, "") ?? "Unknown container",
  ).replace(/^\//, "");

  const id = String(raw.id ?? raw.ID ?? "");
  const image = String(raw.image ?? raw.Image ?? "Unknown image");
  const state = String(raw.state ?? raw.State ?? "");
  const status = String(raw.status ?? raw.Status ?? state ?? "unknown");
  const created = raw.created
    ? new Date(Number(raw.created) * 1000).toLocaleString()
    : raw.Created
      ? new Date(Number(raw.Created) * 1000).toLocaleString()
      : undefined;

  return { id, name, image, status, state, created, ports, names };
}

function isContainerRunning(container: DockerContainer) {
  const state = container.state?.toLowerCase();
  if (state) return state === "running";

  const value = container.status.toLowerCase();
  return value.startsWith("up") || value.includes("running");
}

function getTone(container: DockerContainer): Tone {
  if (isContainerRunning(container)) return "ok";

  const state = (container.state ?? "").toLowerCase();
  if (state === "restarting" || state === "paused") return "warn";
  // Exit code selain 0 berarti container berhenti karena error.
  if (state === "dead" || /exited \((?!0\))/i.test(container.status)) {
    return "crit";
  }
  return "off";
}

const TONE_BADGE: Record<Tone, string> = {
  ok: "bg-emerald-500/10 text-emerald-400",
  warn: "bg-amber-500/10 text-amber-400",
  crit: "bg-red-500/10 text-red-400",
  off: "bg-zinc-800 text-zinc-400",
};

const TONE_DOT: Record<Tone, string> = {
  ok: "bg-emerald-400",
  warn: "bg-amber-400",
  crit: "bg-red-400",
  off: "bg-zinc-500",
};

const ROW_GRID =
  "md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_5.5rem]";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "running", label: "Berjalan" },
  { key: "stopped", label: "Berhenti" },
];

// -----------------------------------------------------------------------------
// Komponen kecil
// -----------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800 motion-reduce:animate-none ${className}`}
    />
  );
}

function StatusBadge({ container }: { container: DockerContainer }) {
  const tone = getTone(container);
  const label = container.state || (tone === "ok" ? "running" : "unknown");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${TONE_BADGE[tone]}`}
    >
      <span className={`size-1.5 rounded-full ${TONE_DOT[tone]}`} />
      {label}
    </span>
  );
}

function PortList({ ports }: { ports?: string[] }) {
  // Docker sering melaporkan port yang sama untuk IPv4 dan IPv6.
  const unique = Array.from(new Set(ports ?? []));

  if (unique.length === 0) {
    return <span className="text-sm text-zinc-600">—</span>;
  }

  const shown = unique.slice(0, 2);
  const rest = unique.length - shown.length;

  return (
    <div className="flex min-w-0 flex-wrap gap-1.5" title={unique.join(", ")}>
      {shown.map((port) => (
        <span
          key={port}
          className="rounded-md bg-zinc-800/70 px-2 py-0.5 text-xs tabular-nums text-zinc-300"
        >
          {port}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-md px-1.5 py-0.5 text-xs text-zinc-500">
          +{rest}
        </span>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Halaman utama
// -----------------------------------------------------------------------------

export default function DockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [logs, setLogs] = useState("");
  const [logsLoading, setLogsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchContainers = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response =
        await api.get<ApiEnvelope<unknown>>("/docker/containers");

      const payload = response.data?.data;
      const rawContainers = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { containers?: unknown[] })?.containers)
          ? (payload as { containers: unknown[] }).containers
          : [];

      const normalized = rawContainers
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null,
        )
        .map(normalizeContainer)
        .filter((item) => item.id.length > 0);

      setContainers(normalized);
      setLastUpdated(new Date());

      setSelectedContainer((current) => {
        if (!current) return current;

        const updated = normalized.find((item) => item.id === current.id);
        return updated ?? null;
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil daftar container Docker.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshLogs = useCallback(async (id: string, tail: number) => {
    setLogsLoading(true);

    try {
      const response = await api.get<
        ApiEnvelope<{ container_id?: string; logs?: string }>
      >(`/docker/containers/${encodeURIComponent(id)}/logs`, {
        params: { tail },
      });

      setLogs(response.data?.data?.logs ?? "");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Gagal memuat log container.";

      setLogs(`Gagal memuat log: ${message}`);
      throw err;
    } finally {
      setLogsLoading(false);
    }
  }, []);

  const runContainerAction = useCallback(
    async (id: string, action: "start" | "stop" | "restart") => {
      await api.post(`/docker/containers/${encodeURIComponent(id)}/${action}`);

      await fetchContainers(true);

      // Ambil ulang log setelah aksi berhasil.
      try {
        await refreshLogs(id, 100);
      } catch {
        // Status container tetap diperbarui meskipun pengambilan log gagal.
      }
    },
    [fetchContainers, refreshLogs],
  );

  useEffect(() => {
    void fetchContainers();

    // Refresh berkala, dilewati saat tab tidak terlihat, dan langsung
    // menyegarkan data ketika tab kembali aktif.
    const tick = () => {
      if (!document.hidden) void fetchContainers(true);
    };

    const interval = window.setInterval(tick, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [fetchContainers]);

  const runningCount = containers.filter(isContainerRunning).length;
  const stoppedCount = containers.length - runningCount;
  const runningPct = containers.length
    ? (runningCount / containers.length) * 100
    : 0;

  const counts: Record<Filter, number> = {
    all: containers.length,
    running: runningCount,
    stopped: stoppedCount,
  };

  const filteredContainers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return containers.filter((container) => {
      if (filter === "running" && !isContainerRunning(container)) return false;
      if (filter === "stopped" && isContainerRunning(container)) return false;

      if (!keyword) return true;

      return [container.name, container.id, container.image, container.status]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [containers, search, filter]);

  const handleSelectContainer = (container: DockerContainer) => {
    setSelectedContainer(container);
    setLogs("");
  };

  const isFiltering = search.trim() !== "" || filter !== "all";
  const waiting = loading && containers.length === 0;

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl space-y-6 bg-zinc-950 text-zinc-100">
      {/* Heading */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Docker Monitoring
          </h1>
          <p className="mt-2 text-sm text-zinc-500 sm:text-base">
            Monitor dan kelola container Docker.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchContainers(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={15}
            className={
              refreshing ? "animate-spin motion-reduce:animate-none" : ""
            }
          />
          Muat ulang
        </button>
      </header>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-red-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-red-300">
              Container tidak dapat dimuat
            </p>
            <p className="mt-1 break-words text-sm text-zinc-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void fetchContainers(true)}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-red-300 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* Ringkasan */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div>
            <p className="text-sm text-zinc-400">Container berjalan</p>
            {waiting ? (
              <Skeleton className="mt-2 h-11 w-28" />
            ) : (
              <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums text-zinc-100">
                {runningCount}
                <span className="ml-1.5 text-2xl text-zinc-500">
                  / {containers.length}
                </span>
              </p>
            )}
          </div>

          <dl className="flex gap-8 text-sm">
            <div>
              <dt className="flex items-center gap-2 text-zinc-500">
                <span className="size-2 rounded-full bg-emerald-400" />
                Berjalan
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
                {runningCount}
              </dd>
            </div>
            <div>
              <dt className="flex items-center gap-2 text-zinc-500">
                <span className="size-2 rounded-full bg-zinc-600" />
                Berhenti atau lainnya
              </dt>
              <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
                {stoppedCount}
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="mt-5 h-2.5 overflow-hidden rounded-full bg-zinc-800"
          role="img"
          aria-label={`${runningCount} dari ${containers.length} container berjalan`}
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: `${runningPct}%` }}
          />
        </div>
      </section>

      {/* Daftar container */}
      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
        <div className="flex flex-col justify-between gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center">
          <div
            className="inline-flex self-start rounded-lg border border-zinc-800 bg-zinc-950 p-1"
            role="group"
            aria-label="Filter status container"
          >
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                aria-pressed={filter === key}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                  filter === key
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {label}
                <span className="ml-2 tabular-nums text-zinc-500">
                  {counts[key]}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, image, atau ID"
              aria-label="Cari container"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Header kolom (desktop) */}
        <div
          className={`hidden gap-x-4 border-b border-zinc-800 bg-zinc-950/40 px-4 py-2.5 text-sm text-zinc-500 md:grid ${ROW_GRID}`}
        >
          <span>Container</span>
          <span>Status</span>
          <span>Port</span>
          <span>Image</span>
          <span />
        </div>

        {waiting ? (
          <ul className="divide-y divide-zinc-800/80" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className={`grid items-center gap-x-4 gap-y-2 px-4 py-4 ${ROW_GRID}`}
              >
                <Skeleton className="h-9 w-3/4" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="hidden h-5 w-24 md:block" />
                <Skeleton className="hidden h-5 w-32 md:block" />
                <span />
              </li>
            ))}
          </ul>
        ) : filteredContainers.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-16 text-center">
            <Container className="size-8 text-zinc-600" strokeWidth={1.5} />
            <p className="mt-3 text-sm font-medium text-zinc-300">
              {isFiltering
                ? "Container tidak ditemukan"
                : "Belum ada container"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {isFiltering
                ? "Coba kata kunci atau filter lain."
                : "Container Docker akan muncul di sini setelah terdeteksi."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800/80">
            {filteredContainers.map((container) => {
              const selected = selectedContainer?.id === container.id;
              const tone = getTone(container);
              const stateLabel =
                container.state || (tone === "ok" ? "running" : "unknown");
              const showDetail =
                container.status &&
                container.status.toLowerCase() !== stateLabel.toLowerCase();

              return (
                <li
                  key={container.id}
                  onClick={() => handleSelectContainer(container)}
                  className={`grid cursor-pointer items-center gap-x-4 gap-y-2 px-4 py-3.5 transition-colors hover:bg-zinc-800/40 ${ROW_GRID} ${
                    selected ? "bg-emerald-500/[0.06]" : ""
                  }`}
                >
                  <button
                    type="button"
                    aria-label={`Lihat detail ${container.name}`}
                    className="flex min-w-0 items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
                  >
                    <span
                      className={`rounded-lg border p-2 ${
                        selected
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-zinc-800 bg-zinc-950 text-zinc-500"
                      }`}
                    >
                      <Container className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-zinc-200">
                        {container.name}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-xs text-zinc-500">
                        {container.id.slice(0, 12)}
                      </span>
                    </span>
                  </button>

                  <div className="min-w-0">
                    <StatusBadge container={container} />
                    {showDetail && (
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {container.status}
                      </p>
                    )}
                  </div>

                  <PortList ports={container.ports} />

                  <p
                    className="truncate text-sm text-zinc-400"
                    title={container.image}
                  >
                    {container.image}
                  </p>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectContainer(container);
                    }}
                    aria-label={`Kelola container ${container.name}`}
                    className="hidden justify-self-end rounded-lg border border-zinc-800 px-3 py-1.5 text-sm font-medium text-zinc-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 md:inline-flex"
                  >
                    Kelola
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-col justify-between gap-1 border-t border-zinc-800 px-4 py-3 text-sm text-zinc-500 sm:flex-row sm:items-center">
          <span>
            Menampilkan {filteredContainers.length} dari {containers.length}{" "}
            container
          </span>
          <span>
            {lastUpdated
              ? `Diperbarui ${new Intl.DateTimeFormat("id-ID", {
                  timeStyle: "medium",
                }).format(
                  lastUpdated,
                )}, otomatis tiap ${REFRESH_INTERVAL_MS / 1000} detik`
              : "Menunggu data"}
          </span>
        </div>
      </section>

      {/* Modal detail container */}
      <ContainerDetailModal
        container={selectedContainer}
        logs={logs}
        logsLoading={logsLoading}
        onClose={() => setSelectedContainer(null)}
        onStart={(id) => runContainerAction(id, "start")}
        onStop={(id) => runContainerAction(id, "stop")}
        onRestart={(id) => runContainerAction(id, "restart")}
        onRefreshLogs={refreshLogs}
      />
    </div>
  );
}
