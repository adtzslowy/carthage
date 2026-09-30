import { useCallback, useEffect, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Cpu,
  HardDrive,
  LogOut,
  MemoryStick,
  Server,
  Wifi,
  WifiOff,
  Clock3,
  RefreshCw,
  CircleCheck,
  CirclePause,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { MetricCard } from '../components/dashboard/MetricCard'
import { ResourceChart } from '../components/dashboard/ResourceChart'
import { useSystemMonitor } from '../hooks/useSystemMonitor'
import type { SystemSnapshot } from '../types/system'

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

function formatUptime(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return '—'

  const total = Math.floor(seconds)
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)

  if (days > 0) return `${days} hari ${hours} jam ${minutes} menit`
  if (hours > 0) return `${hours} jam ${minutes} menit`
  return `${minutes} menit`
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return 'Belum tersedia'
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'Tidak diketahui'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function Panel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={`rounded-2xl border border-zinc-800/90 bg-zinc-900/40 ${className}`}
    >
      {children}
    </section>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string
  title: string
  description?: string
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-400/80">
          {eyebrow}
        </p>
      )}
      <h2 className="text-sm font-semibold text-zinc-100 sm:text-base">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{description}</p>
      )}
    </div>
  )
}


type DockerContainer = {
  id: string
  name: string
  image: string
  state: string
  status: string
  created_at: string
  ports: { ip: string; private_port: number; public_port: number; type: string }[]
}

type DockerResponse = { data: DockerContainer[] }

function DockerSummary() {
  const [containers, setContainers] = useState<DockerContainer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContainers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const token = localStorage.getItem('carthage_token')
    if (!token) {
      setError('Sesi tidak ditemukan. Silakan login kembali.')
      setLoading(false)
      return
    }
    try {
      const response = await fetch('/api/docker/containers', {
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      })
      if (response.status === 401 || response.status === 403) throw new Error('Akses ditolak. Silakan login kembali.')
      if (!response.ok) throw new Error(`Gagal mengambil container (${response.status})`)
      const result = (await response.json()) as DockerResponse
      if (!Array.isArray(result?.data)) throw new Error('Format respons Docker tidak sesuai.')
      setContainers(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat Docker containers.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadContainers() }, [loadContainers])

  const running = containers.filter((item) => item.state.toLowerCase() === 'running').length
  const stopped = containers.length - running

  return (
    <Panel className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <SectionHeading eyebrow="Docker Engine" title="Container summary" description="Status container yang terdeteksi oleh Docker Engine." />
        <button type="button" onClick={() => void loadContainers()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>
      {error && <p role="alert" className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">{error}</p>}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3"><p className="text-[11px] text-zinc-500">Total</p><p className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">{loading && !containers.length ? '—' : containers.length}</p></div>
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-3"><p className="text-[11px] text-zinc-500">Running</p><p className="mt-1 text-xl font-semibold tabular-nums text-emerald-400">{loading && !containers.length ? '—' : running}</p></div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-3"><p className="text-[11px] text-zinc-500">Stopped</p><p className="mt-1 text-xl font-semibold tabular-nums text-zinc-300">{loading && !containers.length ? '—' : stopped}</p></div>
      </div>
      {!loading && !error && containers.length === 0 && <p className="mt-4 text-xs text-zinc-500">Belum ada container.</p>}
      {containers.length > 0 && <div className="mt-4 divide-y divide-zinc-800/80">{containers.map((item) => {
        const isRunning = item.state.toLowerCase() === 'running'
        return <div key={item.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="flex min-w-0 items-start gap-2.5"><span className={`mt-0.5 rounded-lg p-2 ${isRunning ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}`}>{isRunning ? <CircleCheck size={15} /> : <CirclePause size={15} />}</span><div className="min-w-0"><p className="truncate text-xs font-medium text-zinc-200">{item.name}</p><p className="mt-1 truncate text-[11px] text-zinc-500">{item.image}</p><p className="mt-1 text-[10px] text-zinc-600">{item.ports?.length ? item.ports.map((port) => `${port.public_port}:${port.private_port}/${port.type}`).join(', ') : 'No published ports'}</p></div></div>
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-medium ${isRunning ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}>{item.state}</span>
        </div>
      })}</div>}
    </Panel>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { system, connected, error } = useSystemMonitor()
  const [history, setHistory] = useState<SystemSnapshot[]>([])
  const [lastSeen, setLastSeen] = useState<string | null>(null)

  useEffect(() => {
    if (!system) return

    setHistory((previous) => {
      // Avoid adding the same snapshot more than once during rerenders.
      if (previous.at(-1)?.timestamp === system.timestamp) return previous
      return [...previous, system].slice(-60)
    })
    setLastSeen(system.timestamp)
  }, [system])

  const signOut = useCallback(() => {
    localStorage.removeItem('carthage_token')
    navigate('/login', { replace: true })
  }, [navigate])

  const refreshLabel = lastSeen ? formatTime(lastSeen) : 'Menunggu data'
  const hostName = system?.host?.hostname ?? 'Server belum terdeteksi'

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Server size={14} className="text-emerald-400" />
            <span>Carthage</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-400">Overview</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            System Overview
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Ringkasan kondisi dan penggunaan resource server.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${
              connected
                ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
                : 'border-zinc-800 bg-zinc-900/70 text-zinc-400'
            }`}
          >
            {connected ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-50 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
              </span>
            ) : (
              <WifiOff size={14} />
            )}
            {connected ? 'Live monitoring' : 'Menghubungkan'}
          </div>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
          >
            <LogOut size={14} />
            Keluar
          </button>
        </div>
      </header>

      {/* Connection / telemetry notice */}
      {error && (
        <div
          role="alert"
          className="flex flex-col gap-1 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <WifiOff size={16} className="mt-0.5 shrink-0 text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Koneksi monitoring mengalami kendala
              </p>
              <p className="mt-0.5 break-words text-xs text-amber-200/70">
                {error}
              </p>
            </div>
          </div>
          <span className="pl-6 text-[11px] text-zinc-500 sm:pl-0">
            Data terakhir: {refreshLabel}
          </span>
        </div>
      )}

      {/* Resource metric cards */}
      <section aria-label="Ringkasan resource" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="CPU Usage"
          value={system ? `${system.cpu.usage_percent.toFixed(1)}%` : '—'}
          subtitle={
            system
              ? `${system.cpu.core_count} logical cores`
              : 'Menunggu metrik'
          }
          icon={Cpu}
          percent={system?.cpu.usage_percent}
        />
        <MetricCard
          title="Memory"
          value={system ? `${system.memory.usage_percent.toFixed(1)}%` : '—'}
          subtitle={
            system
              ? `${formatBytes(system.memory.used_bytes)} / ${formatBytes(system.memory.total_bytes)}`
              : 'Menunggu metrik'
          }
          icon={MemoryStick}
          percent={system?.memory.usage_percent}
        />
        <MetricCard
          title="Disk Usage"
          value={system ? `${system.disk.usage_percent.toFixed(1)}%` : '—'}
          subtitle={
            system
              ? `${formatBytes(system.disk.used_bytes)} / ${formatBytes(system.disk.total_bytes)}`
              : 'Menunggu metrik'
          }
          icon={HardDrive}
          percent={system?.disk.usage_percent}
        />
        <MetricCard
          title="Uptime"
          value={system ? formatUptime(system.host?.uptime) : '—'}
          subtitle={system?.host?.hostname ?? 'Menunggu host'}
          icon={Activity}
        />
      </section>

      {/* Trends and host details */}
      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <Panel className="min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-800/80 px-4 py-4 sm:px-5">
            <SectionHeading
              eyebrow="Performance"
              title="Resource utilization"
              description="Riwayat penggunaan resource berdasarkan pembacaan terbaru."
            />
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2.5 py-1.5 text-[11px] text-zinc-400">
              <RefreshCw size={12} className={connected ? 'text-emerald-400' : ''} />
              {connected ? 'Live updates' : 'Reconnecting'}
            </div>
          </div>
          <div className="p-2 sm:p-4">
            <ResourceChart history={history} />
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <SectionHeading
              eyebrow="Infrastructure"
              title="Host information"
              description="Identitas mesin yang mengirimkan telemetry."
            />
            <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-zinc-400">
              <Server size={16} />
            </span>
          </div>

          <dl className="mt-5 divide-y divide-zinc-800/80">
            <div className="flex items-start justify-between gap-4 py-3 first:pt-0">
              <dt className="text-xs text-zinc-500">Hostname</dt>
              <dd className="max-w-[65%] break-all text-right text-xs font-medium text-zinc-200">
                {hostName}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-xs text-zinc-500">Operating system</dt>
              <dd className="text-right text-xs font-medium capitalize text-zinc-200">
                {system?.host?.os ?? '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-xs text-zinc-500">Platform</dt>
              <dd className="text-right text-xs font-medium text-zinc-200">
                {system?.host?.platform ?? '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-xs text-zinc-500">CPU cores</dt>
              <dd className="text-right text-xs font-medium tabular-nums text-zinc-200">
                {system ? system.cpu.core_count : '—'}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-xs text-zinc-500">Disk mount</dt>
              <dd className="text-right text-xs font-medium text-zinc-200">
                {system?.disk?.path ?? '—'}
              </dd>
            </div>
          </dl>

          <div className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-950/50 px-3 py-2.5">
            <Clock3 size={14} className="shrink-0 text-zinc-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-zinc-600">
                Last update
              </p>
              <p className="mt-0.5 truncate text-xs text-zinc-300">
                {refreshLabel}
              </p>
            </div>
          </div>
        </Panel>
      </section>

      {/* Docker container summary */}
      <DockerSummary />

      {/* Network and service status */}
      <section className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(260px,1fr)]">
        <Panel className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <SectionHeading
              eyebrow="Traffic"
              title="Network counters"
              description="Akumulasi trafik sejak counter jaringan mulai dihitung."
            />
            <span className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-2 text-zinc-400">
              <Activity size={16} />
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ArrowDownToLine size={14} className="text-sky-400" />
                Received
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-zinc-100">
                {system ? formatBytes(system.network.bytes_recv) : '—'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">Total data diterima</p>
            </div>
            <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ArrowUpFromLine size={14} className="text-violet-400" />
                Sent
              </div>
              <p className="mt-2 text-xl font-semibold tracking-tight tabular-nums text-zinc-100">
                {system ? formatBytes(system.network.bytes_sent) : '—'}
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">Total data dikirim</p>
            </div>
          </div>
        </Panel>

        <Panel className="p-4 sm:p-5">
          <SectionHeading
            eyebrow="Telemetry"
            title="Monitoring status"
            description="Status koneksi stream dari backend."
          />
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                connected
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {connected ? <Wifi size={17} /> : <WifiOff size={17} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-200">
                {connected ? 'Receiving realtime updates' : 'Waiting for connection'}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {connected
                  ? 'Data sistem diperbarui melalui koneksi live.'
                  : 'Dashboard akan menampilkan data saat koneksi tersedia.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-600">
            <span>Current host</span>
            <span className="max-w-[65%] truncate text-zinc-400">{hostName}</span>
          </div>
        </Panel>
      </section>
    </div>
  )
}
