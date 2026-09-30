
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  CheckCircle2,
  CircleAlert,
  Container,
  Database,
  LoaderCircle,
  Network,
  RefreshCw,
  Search,
  Server,
} from "lucide-react";

import {api} from "../lib/api";
import ContainerDetailModal from "../features/docker/components/ContainerDetailModal";
import type {
  DockerContainerDetail,
} from "../features/docker/components/ContainerDetailModal";

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

function normalizeContainer(raw: Record<string, unknown>): DockerContainer {
  const rawNames = raw.names ?? raw.Names;
  const rawPorts = raw.ports ?? raw.Ports;

  const names = Array.isArray(rawNames)
    ? rawNames.map(String)
    : [];

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
    rawName ??
    names[0]?.replace(/^\//, "") ??
    "Unknown container"
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

  return {
    id,
    name,
    image,
    status,
    state,
    created,
    ports,
    names,
  };
}

function isContainerRunning(container: DockerContainer) {
  const value = `${container.state ?? ""} ${container.status}`.toLowerCase();

  return (
    value.includes("running") ||
    value.includes("up ") ||
    value === "up" ||
    value.includes("healthy")
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Boxes;
  iconClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100">
            {value}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-800/70 p-2.5">
          <Icon className={`h-4 w-4 ${iconClassName ?? "text-emerald-400"}`} />
        </div>
      </div>
    </div>
  );
}

function ContainerStatus({ container }: { container: DockerContainer }) {
  const running = isContainerRunning(container);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
        running
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-zinc-800 text-zinc-400"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          running ? "bg-emerald-400" : "bg-zinc-500"
        }`}
      />
      {running ? "running" : container.status}
    </span>
  );
}

export default function DockerPage() {
  const [containers, setContainers] = useState<DockerContainer[]>([]);
  const [selectedContainer, setSelectedContainer] =
    useState<DockerContainer | null>(null);

  const [search, setSearch] = useState("");
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
      const response = await api.get<ApiEnvelope<unknown>>(
        "/docker/containers"
      );

      const payload = response.data?.data;
      const rawContainers = Array.isArray(payload)
        ? payload
        : Array.isArray((payload as { containers?: unknown[] })?.containers)
          ? (payload as { containers: unknown[] }).containers
          : [];

      const normalized = rawContainers
        .filter(
          (item): item is Record<string, unknown> =>
            typeof item === "object" && item !== null
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
      const message =
        err instanceof Error
          ? err.message
          : "Gagal mengambil daftar container Docker.";

      setError(message);
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
    async (
      id: string,
      action: "start" | "stop" | "restart"
    ) => {
      await api.post(
        `/docker/containers/${encodeURIComponent(id)}/${action}`
      );

      await fetchContainers(true);

      // Ambil ulang log setelah aksi berhasil.
      try {
        await refreshLogs(id, 100);
      } catch {
        // Status container tetap diperbarui meskipun pengambilan log gagal.
      }
    },
    [fetchContainers, refreshLogs]
  );

  useEffect(() => {
    void fetchContainers();

    // Refresh status secara berkala ketika halaman terbuka.
    const interval = window.setInterval(() => {
      void fetchContainers(true);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [fetchContainers]);

  const filteredContainers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) return containers;

    return containers.filter((container) =>
      [
        container.name,
        container.id,
        container.image,
        container.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword)
    );
  }, [containers, search]);

  const runningCount = containers.filter(isContainerRunning).length;
  const stoppedCount = containers.length - runningCount;

  const handleSelectContainer = (container: DockerContainer) => {
    setSelectedContainer(container);
    setLogs("");
  };

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100">
      <main className="mx-auto w-full max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        {/* Page heading */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-emerald-400">Docker</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
                <Boxes className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Docker Monitoring
                </h1>
                <p className="mt-1 text-sm text-zinc-400">
                  Monitor dan kelola container Docker.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void fetchContainers(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-red-300">
                Gagal memuat container
              </p>
              <p className="mt-1 break-words text-sm text-red-400/80">
                {error}
              </p>
              <button
                type="button"
                onClick={() => void fetchContainers(true)}
                className="mt-2 text-xs font-medium text-red-300 underline underline-offset-4"
              >
                Coba lagi
              </button>
            </div>
          </div>
        )}

        {/* Statistics */}
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Total Containers"
            value={containers.length}
            description="Container terdaftar"
            icon={Boxes}
          />
          <StatCard
            title="Running"
            value={runningCount}
            description="Container aktif"
            icon={Activity}
            iconClassName="text-emerald-400"
          />
          <StatCard
            title="Stopped / Other"
            value={stoppedCount}
            description="Container tidak berjalan"
            icon={RefreshCw}
            iconClassName="text-amber-400"
          />
        </section>

        {/* Container list */}
        <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-col justify-between gap-3 border-b border-zinc-800 p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-zinc-100">Containers</h2>
              <p className="mt-1 text-xs text-zinc-500">
                Klik container untuk membuka detail, kontrol, dan log.
              </p>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari container..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-zinc-200 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Table for desktop */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-950/70 text-[11px] uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Container</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Ports</th>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <LoaderCircle className="mx-auto h-5 w-5 animate-spin text-emerald-400" />
                      <p className="mt-3 text-sm text-zinc-500">
                        Memuat container...
                      </p>
                    </td>
                  </tr>
                ) : filteredContainers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <Container className="mx-auto h-8 w-8 text-zinc-600" />
                      <p className="mt-3 text-sm font-medium text-zinc-300">
                        {search
                          ? "Container tidak ditemukan"
                          : "Belum ada container"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {search
                          ? "Coba kata kunci pencarian lain."
                          : "Container Docker akan muncul di sini setelah terdeteksi."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredContainers.map((container) => {
                    const selected =
                      selectedContainer?.id === container.id;

                    return (
                      <tr
                        key={container.id}
                        onClick={() => handleSelectContainer(container)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" ||
                            event.key === " "
                          ) {
                            event.preventDefault();
                            handleSelectContainer(container);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-label={`Lihat detail ${container.name}`}
                        className={`cursor-pointer transition hover:bg-zinc-800/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-emerald-500 ${
                          selected
                            ? "bg-emerald-500/[0.07]"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`rounded-lg border p-2 ${
                                selected
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                  : "border-zinc-800 bg-zinc-950 text-zinc-500"
                              }`}
                            >
                              <Container className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-200">
                                {container.name}
                              </p>
                              <p className="mt-1 max-w-36 truncate font-mono text-[10px] text-zinc-500">
                                {container.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <ContainerStatus container={container} />
                        </td>
                        <td className="max-w-48 px-4 py-3">
                          <p className="truncate text-xs text-zinc-400">
                            {container.ports?.join(", ") || "—"}
                          </p>
                        </td>
                        <td className="max-w-48 px-4 py-3">
                          <p className="truncate text-xs text-zinc-400">
                            {container.image}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSelectContainer(container);
                            }}
                            className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile container list */}
          <div className="divide-y divide-zinc-800 md:hidden">
            {loading ? (
              <div className="flex flex-col items-center py-14 text-zinc-500">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-400" />
                <p className="mt-3 text-sm">Memuat container...</p>
              </div>
            ) : filteredContainers.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-14 text-center">
                <Container className="h-8 w-8 text-zinc-600" />
                <p className="mt-3 text-sm text-zinc-300">
                  {search
                    ? "Container tidak ditemukan"
                    : "Belum ada container"}
                </p>
              </div>
            ) : (
              filteredContainers.map((container) => (
                <button
                  key={container.id}
                  type="button"
                  onClick={() => handleSelectContainer(container)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-zinc-800/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400">
                      <Container className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {container.name}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {container.image}
                      </p>
                      <p className="mt-1 truncate font-mono text-[10px] text-zinc-600">
                        {container.id}
                      </p>
                    </div>
                  </div>
                  <ContainerStatus container={container} />
                </button>
              ))
            )}
          </div>

          <div className="flex flex-col justify-between gap-2 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-500 sm:flex-row sm:items-center">
            <span>
              Menampilkan {filteredContainers.length} dari{" "}
              {containers.length} container
            </span>
            <span>
              {lastUpdated
                ? `Diperbarui ${lastUpdated.toLocaleTimeString()}`
                : "Menunggu data"}
            </span>
          </div>
        </section>

        {/* Docker information footer */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-600">
          <span className="inline-flex items-center gap-1.5">
            <Server className="h-3.5 w-3.5" />
            Docker Engine
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Network className="h-3.5 w-3.5" />
            Container management
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5" />
            API connected
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Auto refresh 15s
          </span>
        </div>
      </main>

      {/* Container detail modal */}
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