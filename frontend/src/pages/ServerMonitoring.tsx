import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Activity,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Cpu,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react";

// -----------------------------------------------------------------------------
// API types
// -----------------------------------------------------------------------------

type SystemMetrics = {
  timestamp: string;
  host: {
    hostname: string;
    os: string;
    platform: string;
    uptime: number;
  };
  cpu: {
    usage_percent: number;
    core_count: number;
  };
  memory: {
    total_bytes: number;
    used_bytes: number;
    available_bytes: number;
    usage_percent: number;
  };
  disk: {
    path: string;
    total_bytes: number;
    used_bytes: number;
    free_bytes: number;
    usage_percent: number;
  };
  network?: {
    bytes_sent: number;
    bytes_recv: number;
    packet_sent: number;
    packet_recv: number;
  };
};

type ApiResponse = { data: SystemMetrics };
type CpuPoint = { t: number; v: number };
type Rates = { recv: number; sent: number };
type Level = "ok" | "warn" | "crit";

const API_BASE = "/api";
const TOKEN_KEY = "carthage_token";
const MAX_CPU_HISTORY = 40;
const RECONNECT_DELAY_MS = 3000;

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond)}/s`;
}

function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${days} hari ${hours} jam ${minutes} menit`;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tidak diketahui";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date);
}

function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeStyle: "medium",
  }).format(timestamp);
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function getLevel(value: number): Level {
  if (value >= 90) return "crit";
  if (value >= 75) return "warn";
  return "ok";
}

const LEVEL_TEXT: Record<Level, string> = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  crit: "text-red-400",
};

const LEVEL_BANNER: Record<Level, string> = {
  ok: "border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  warn: "border-amber-500/25 bg-amber-500/5 text-amber-300",
  crit: "border-red-500/25 bg-red-500/5 text-red-300",
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Terjadi kesalahan saat mengambil data server.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSystemMetrics(value: unknown): value is SystemMetrics {
  if (!isRecord(value)) return false;
  const { host, cpu, memory, disk } = value;
  return (
    typeof value.timestamp === "string" &&
    isRecord(host) &&
    typeof host.hostname === "string" &&
    typeof host.os === "string" &&
    typeof host.platform === "string" &&
    typeof host.uptime === "number" &&
    isRecord(cpu) &&
    typeof cpu.usage_percent === "number" &&
    typeof cpu.core_count === "number" &&
    isRecord(memory) &&
    typeof memory.total_bytes === "number" &&
    typeof memory.used_bytes === "number" &&
    typeof memory.available_bytes === "number" &&
    typeof memory.usage_percent === "number" &&
    isRecord(disk) &&
    typeof disk.path === "string" &&
    typeof disk.total_bytes === "number" &&
    typeof disk.used_bytes === "number" &&
    typeof disk.free_bytes === "number" &&
    typeof disk.usage_percent === "number"
  );
}

function extractMetrics(value: unknown): SystemMetrics {
  const candidate =
    isRecord(value) && "data" in value ? value.data : value;

  if (!isSystemMetrics(candidate)) {
    throw new Error("Format data monitoring dari server tidak valid.");
  }

  return candidate;
}

// -----------------------------------------------------------------------------
// Reusable components
// -----------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-zinc-800 motion-reduce:animate-none ${className}`}
    />
  );
}

function Gauge({
  label,
  icon: Icon,
  percent,
  primary,
  secondary,
  loading,
}: {
  label: string;
  icon: LucideIcon;
  percent?: number;
  primary: string;
  secondary: string;
  loading: boolean;
}) {
  const value = clampPercentage(percent ?? 0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  return (
    <div className="flex items-center gap-4 p-4">
      <div className={`relative size-20 shrink-0 ${LEVEL_TEXT[getLevel(value)]}`}>
        <svg
          viewBox="0 0 100 100"
          className="-rotate-90 size-full"
          aria-hidden="true"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-zinc-800"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={`${dash} ${circumference}`}
            className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums text-zinc-100">
          {loading ? "—" : `${Math.round(value)}%`}
        </span>
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Icon size={16} strokeWidth={1.8} />
          {label}
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-7 w-24" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-zinc-100">
            {primary}
          </p>
        )}
        <p className="mt-0.5 truncate text-sm text-zinc-500">{secondary}</p>
      </div>
    </div>
  );
}

function CpuChart({
  points,
  cores,
  loading,
}: {
  points: CpuPoint[];
  cores?: number;
  loading: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const count = points.length;
  const last = count ? points[count - 1] : null;
  const current = last?.v ?? 0;
  const average = count
    ? points.reduce((sum, point) => sum + point.v, 0) / count
    : 0;
  const peak = count ? Math.max(...points.map((point) => point.v)) : 0;
  const tone = LEVEL_TEXT[getLevel(current)];

  const xPct = useCallback(
    (index: number) => (count <= 1 ? 100 : (index / (count - 1)) * 100),
    [count],
  );

  const linePoints = useMemo(
    () =>
      points
        .map((point, index) => `${xPct(index)},${100 - clampPercentage(point.v)}`)
        .join(" "),
    [points, xPct],
  );

  const handleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || count === 0) return;
    const relative = Math.min(
      1,
      Math.max(0, (event.clientX - rect.left) / rect.width),
    );
    setHover(count === 1 ? 0 : Math.round(relative * (count - 1)));
  };

  const hovered = hover !== null ? points[hover] : undefined;
  const hoverX = hover !== null ? xPct(hover) : 0;
  const tooltipShift = hoverX < 12 ? "0%" : hoverX > 88 ? "-100%" : "-50%";

  return (
    <div className="flex min-w-0 flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Cpu size={16} strokeWidth={1.8} />
            Penggunaan CPU
            {cores ? (
              <span className="text-zinc-600">{cores} core logis</span>
            ) : null}
          </div>
          {loading ? (
            <Skeleton className="mt-3 h-12 w-40" />
          ) : (
            <p
              className={`mt-2 text-4xl font-semibold tracking-tight tabular-nums ${tone}`}
            >
              {current.toFixed(1)}
              <span className="ml-1 text-2xl text-zinc-500">%</span>
            </p>
          )}
        </div>

        <dl className="flex gap-6 text-sm">
          <div>
            <dt className="text-zinc-500">Rata-rata</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
              {average.toFixed(1)}%
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Puncak</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-zinc-200">
              {peak.toFixed(1)}%
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 flex gap-3">
        <div className="relative w-8 shrink-0 text-right text-xs tabular-nums text-zinc-600">
          {[100, 75, 50, 25, 0].map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${100 - tick}%` }}
            >
              {tick}
            </span>
          ))}
        </div>

        <div
          className={`relative h-40 min-w-0 flex-1 touch-pan-y ${tone}`}
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
        >
          {[0, 25, 50, 75, 100].map((tick) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-dashed border-zinc-800"
              style={{ top: `${100 - tick}%` }}
            />
          ))}

          {count === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-500">
              Menunggu data CPU…
            </div>
          ) : (
            <>
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible"
                role="img"
                aria-label="Grafik riwayat penggunaan CPU"
              >
                <defs>
                  <linearGradient id="cpu-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {count > 1 && (
                  <>
                    <polygon
                      points={`0,100 ${linePoints} 100,100`}
                      fill="url(#cpu-area)"
                    />
                    <polyline
                      points={linePoints}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </>
                )}
              </svg>

              {last && (
                <span
                  className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-4 ring-zinc-950"
                  style={{
                    left: `${xPct(count - 1)}%`,
                    top: `${100 - clampPercentage(last.v)}%`,
                  }}
                />
              )}

              {hovered && (
                <>
                  <div
                    className="absolute inset-y-0 w-px bg-zinc-600"
                    style={{ left: `${hoverX}%` }}
                  />
                  <span
                    className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-zinc-950 bg-current"
                    style={{
                      left: `${hoverX}%`,
                      top: `${100 - clampPercentage(hovered.v)}%`,
                    }}
                  />
                  <div
                    className="pointer-events-none absolute -top-2 z-10 whitespace-nowrap rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs shadow-lg"
                    style={{
                      left: `${hoverX}%`,
                      transform: `translate(${tooltipShift}, -100%)`,
                    }}
                  >
                    <span className="font-semibold tabular-nums text-zinc-100">
                      {hovered.v.toFixed(1)}%
                    </span>
                    <span className="ml-2 text-zinc-500">
                      {formatClock(hovered.t)}
                    </span>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-2 flex justify-between pl-11 text-xs tabular-nums text-zinc-600">
        <span>{count ? formatClock(points[0].t) : ""}</span>
        <span>{count} pembacaan</span>
        <span>{last ? formatClock(last.t) : ""}</span>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  note,
  loading,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  loading: boolean;
}) {
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Icon size={16} strokeWidth={1.8} />
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-32" />
      ) : (
        <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-zinc-100">
          {value}
        </p>
      )}
      <p className="mt-1 text-sm text-zinc-500">{note}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-zinc-200">
        {value || "—"}
      </dd>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default function ServerMonitoring() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cpuHistory, setCpuHistory] = useState<CpuPoint[]>([]);
  const [rates, setRates] = useState<Rates | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const prevNet = useRef<{ t: number; recv: number; sent: number } | null>(null);
  const streamAbort = useRef<AbortController | null>(null);

  const applyMetrics = useCallback((next: SystemMetrics) => {
    const timestamp = Date.parse(next.timestamp);
    const t = Number.isNaN(timestamp) ? Date.now() : timestamp;

    setMetrics(next);
    setLastUpdated(next.timestamp);

    setCpuHistory((previous) => {
      if (previous.some((point) => point.t === t)) return previous;
      return [
        ...previous,
        { t, v: clampPercentage(next.cpu.usage_percent) },
      ]
        .sort((a, b) => a.t - b.t)
        .slice(-MAX_CPU_HISTORY);
    });

    if (next.network) {
      const previous = prevNet.current;

      if (previous && t > previous.t) {
        const seconds = (t - previous.t) / 1000;
        const recvDelta = next.network.bytes_recv - previous.recv;
        const sentDelta = next.network.bytes_sent - previous.sent;

        if (seconds > 0 && recvDelta >= 0 && sentDelta >= 0) {
          setRates({
            recv: recvDelta / seconds,
            sent: sentDelta / seconds,
          });
        } else {
          // Counter reset, host reboot, or invalid interval: wait for
          // the next valid pair of samples instead of showing a false rate.
          setRates(null);
        }
      }

      if (!previous || t > previous.t) {
        prevNet.current = {
          t,
          recv: next.network.bytes_recv,
          sent: next.network.bytes_sent,
        };
      }
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/system`, {
        method: "GET",
        headers: getAuthHeaders(),
        cache: "no-store",
      });

      if (response.status === 401) {
        throw new Error("Sesi login tidak valid. Silakan login kembali.");
      }
      if (!response.ok) {
        throw new Error(`Gagal mengambil data server (HTTP ${response.status}).`);
      }

      const result: unknown = await response.json();
      applyMetrics(extractMetrics(result));
      setLoading(false);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  }, [applyMetrics]);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const controller = new AbortController();
    streamAbort.current = controller;
    const { signal } = controller;
    let mounted = true;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (signal.aborted) {
          resolve();
          return;
        }

        const onAbort = () => {
          clearTimeout(timer);
          resolve();
        };
        const timer = setTimeout(() => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        }, ms);

        signal.addEventListener("abort", onAbort, { once: true });
      });

    async function readStream() {
      const response = await fetch(`${API_BASE}/system/stream`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          Accept: "text/event-stream",
        },
        cache: "no-store",
        signal,
      });

      if (response.status === 401) {
        throw new Error("Sesi login berakhir. Silakan login kembali.");
      }
      if (!response.ok) {
        throw new Error(`Live monitoring gagal (HTTP ${response.status}).`);
      }
      if (!response.body) {
        throw new Error("Browser tidak mendukung pembacaan SSE stream.");
      }

      if (mounted) setConnected(true);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (!signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n/g, "\n");

          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";

          for (const event of events) {
            if (!mounted) break;

            const rawData = event
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("\n");

            if (!rawData || rawData === "[DONE]") continue;

            try {
              const parsed: unknown = JSON.parse(rawData);
              const next = extractMetrics(parsed);
              applyMetrics(next);
              setError(null);
              setLoading(false);
            } catch (parseError) {
              // Ignore heartbeat/non-JSON events, but surface malformed
              // metric payloads only through console diagnostics.
              if (parseError instanceof SyntaxError) continue;
              console.warn("SSE payload diabaikan:", parseError);
            }
          }
        }
      } finally {
        await reader.cancel().catch(() => undefined);
      }
    }

    async function run() {
      while (mounted && !signal.aborted) {
        try {
          await readStream();
        } catch (err) {
          if (signal.aborted || !mounted) return;

          const message = getErrorMessage(err);
          setConnected(false);
          setError(message);

          // Do not retry indefinitely with an expired/invalid token.
          if (message.includes("Sesi login")) return;
        }

        if (!mounted || signal.aborted) return;
        setConnected(false);
        await wait(RECONNECT_DELAY_MS);
      }
    }

    void run();

    return () => {
      mounted = false;
      controller.abort();
      if (streamAbort.current === controller) {
        streamAbort.current = null;
      }
    };
  }, [applyMetrics]);

  const host = metrics?.host;
  const cpu = metrics?.cpu;
  const memory = metrics?.memory;
  const disk = metrics?.disk;
  const network = metrics?.network;
  const waiting = loading && !metrics;

  const health = useMemo(() => {
    if (!cpu || !memory || !disk) return null;

    const worst = [
      { name: "CPU", value: cpu.usage_percent },
      { name: "Memori", value: memory.usage_percent },
      { name: "Disk", value: disk.usage_percent },
    ].reduce((a, b) => (b.value > a.value ? b : a));

    const level = getLevel(worst.value);
    const percent = clampPercentage(worst.value).toFixed(0);
    const text =
      level === "ok"
        ? "Semua resource dalam batas normal"
        : level === "warn"
          ? `${worst.name} mendekati batas (${percent}%)`
          : `${worst.name} mencapai tingkat kritis (${percent}%)`;

    return { level, text };
  }, [cpu, memory, disk]);

  return (
    <div className="mx-auto min-h-full w-full max-w-6xl space-y-4 bg-zinc-950 text-zinc-100">
      {/* Heading */}
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Server Monitoring
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
            {host ? (
              <>
                <span className="inline-flex items-center gap-1.5 font-medium text-zinc-300">
                  <Server size={14} />
                  {host.hostname}
                </span>
                <span>{host.os}</span>
              </>
            ) : (
              <span>Memuat informasi host…</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${
              connected
                ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
                : "border-zinc-800 bg-zinc-900 text-zinc-500"
            }`}
            role="status"
          >
            {connected ? (
              <>
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                Live
              </>
            ) : (
              <>
                <WifiOff size={15} />
                Menyambung
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => void loadSnapshot()}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin motion-reduce:animate-none" : ""}
            />
            Muat ulang
          </button>
        </div>
      </header>

      {/* Resource health */}
      <div
        role="status"
        className={`flex flex-wrap items-center justify-between gap-x-6 gap-y-1 rounded-xl border px-4 py-3 text-sm ${
          health
            ? LEVEL_BANNER[health.level]
            : "border-zinc-800 bg-zinc-900/60 text-zinc-400"
        }`}
      >
        <span className="inline-flex items-center gap-2 font-medium">
          {health?.level === "ok" ? (
            <CheckCircle2 size={17} />
          ) : (
            <Activity size={17} />
          )}
          {health ? health.text : "Menunggu data dari server…"}
        </span>
        {lastUpdated && (
          <span className="text-zinc-500">
            Diperbarui {formatDateTime(lastUpdated)}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
        >
          <AlertCircle size={19} className="mt-0.5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-300">
              Data monitoring mengalami kendala
            </p>
            <p className="mt-1 break-words text-sm text-zinc-400">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-medium text-amber-300 hover:text-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* CPU + memory/disk gauges */}
      <section className="grid grid-cols-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 lg:grid-cols-[minmax(0,1fr)_300px]">
        <CpuChart points={cpuHistory} cores={cpu?.core_count} loading={waiting} />
        <div className="divide-y divide-zinc-800 border-t border-zinc-800 lg:border-l lg:border-t-0">
          <Gauge
            label="Memori"
            icon={MemoryStick}
            percent={memory?.usage_percent}
            primary={memory ? formatBytes(memory.used_bytes) : "—"}
            secondary={
              memory
                ? `dari ${formatBytes(memory.total_bytes)}`
                : "Menunggu data"
            }
            loading={waiting}
          />
          <Gauge
            label="Disk"
            icon={HardDrive}
            percent={disk?.usage_percent}
            primary={disk ? formatBytes(disk.used_bytes) : "—"}
            secondary={
              disk
                ? `dari ${formatBytes(disk.total_bytes)} di ${disk.path}`
                : "Menunggu data"
            }
            loading={waiting}
          />
        </div>
      </section>

      {/* Uptime + network */}
      <section className="grid grid-cols-1 divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <Stat
          icon={Clock3}
          label="Uptime"
          value={host ? formatUptime(host.uptime) : "—"}
          note="Sejak boot terakhir"
          loading={waiting}
        />
        <Stat
          icon={ArrowDown}
          label="Unduh"
          value={rates ? formatRate(rates.recv) : "—"}
          note={
            network
              ? `Total ${formatBytes(network.bytes_recv)}, ${network.packet_recv.toLocaleString("id-ID")} paket`
              : "Menunggu data"
          }
          loading={waiting}
        />
        <Stat
          icon={ArrowUp}
          label="Unggah"
          value={rates ? formatRate(rates.sent) : "—"}
          note={
            network
              ? `Total ${formatBytes(network.bytes_sent)}, ${network.packet_sent.toLocaleString("id-ID")} paket`
              : "Menunggu data"
          }
          loading={waiting}
        />
      </section>

      {/* Host details */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
        <h2 className="text-base font-semibold text-zinc-100">
          Informasi host
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem label="Hostname" value={host?.hostname ?? "—"} />
          <InfoItem label="Sistem operasi" value={host?.os ?? "—"} />
          <InfoItem label="Platform" value={host?.platform ?? "—"} />
          <InfoItem
            label="Jumlah core CPU"
            value={cpu ? String(cpu.core_count) : "—"}
          />
          <InfoItem label="Mount disk" value={disk?.path ?? "—"} />
          <InfoItem
            label="Pembaruan terakhir"
            value={lastUpdated ? formatDateTime(lastUpdated) : "Menunggu data"}
          />
        </dl>

        <div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-3 text-sm text-zinc-500">
          {connected ? (
            <Wifi size={15} className="text-emerald-400" />
          ) : (
            <WifiOff size={15} className="text-amber-400" />
          )}
          {connected
            ? "Menerima metrik sistem secara langsung"
            : "Koneksi live terputus atau sedang menyambung ulang"}
        </div>
      </section>
    </div>
  );
}
