
import { useEffect, useState } from 'react'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Server,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MetricCard } from '../components/dashboard/MetricCard'
import { ResourceChart } from '../components/dashboard/ResourceChart'
import { useSystemMonitor } from '../hooks/useSystemMonitor'
import type { SystemSnapshot } from '../types/system'

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )

  return `${(bytes / 1024 ** index).toFixed(1)} ${units[index]}`
}

function formatUptime(seconds?: number) {
  if (seconds == null || !Number.isFinite(seconds)) {
    return "—";
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}h ${hours}j ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }

  return `${minutes}m`;
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { system, connected, error } = useSystemMonitor()
  const [history, setHistory] = useState<SystemSnapshot[]>([])

  useEffect(() => {
    if (!system) return

    setHistory((previous) => {
      const next = [...previous, system]
      return next.slice(-60)
    })
  }, [system])

  function signOut() {
    localStorage.removeItem('carthage_token')
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-[#09090b] p-5 text-zinc-100 md:p-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Server size={16} />
            Carthage / Overview
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            System Overview
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Monitor your server health and resources.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${
              connected
                ? 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-400'
                : 'border-zinc-800 bg-zinc-900 text-zinc-500'
            }`}
          >
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? 'Live' : 'Connecting'}
          </div>

          <button
            onClick={signOut}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      {error && (
        <div
          role="status"
          className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-300"
        >
          {error}
        </div>
      )}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="CPU Usage"
          value={system ? `${system.cpu.usage_percent.toFixed(1)}%` : '--'}
          subtitle={system ? `${system.cpu.core_count} logical cores` : 'Loading metrics'}
          icon={Cpu}
          percent={system?.cpu.usage_percent}
        />
        <MetricCard
          title="Memory"
          value={system ? `${system.memory.usage_percent.toFixed(1)}%` : '--'}
          subtitle={
            system
              ? `${formatBytes(system.memory.used_bytes)} / ${formatBytes(system.memory.total_bytes)}`
              : 'Loading metrics'
          }
          icon={MemoryStick}
          percent={system?.memory.usage_percent}
        />
        <MetricCard
          title="Disk Usage"
          value={system ? `${system.disk.usage_percent.toFixed(1)}%` : '--'}
          subtitle={
            system
              ? `${formatBytes(system.disk.Used)} / ${formatBytes(system.disk.total_bytes)}`
              : 'Loading metrics'
          }
          icon={HardDrive}
          percent={system?.disk.usage_percent}
        />
        <MetricCard
          title="Uptime"
          value={system ? formatUptime(system?.host?.uptime) : '--'}
          subtitle={system?.host.hostname ?? 'Loading host'}
          icon={Activity}
        />
      </section>

      <section className="mb-6 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <ResourceChart history={history} />

        <article className="rounded-xl border border-zinc-800 bg-[#0e0e11] p-5">
          <h2 className="font-semibold">Host Information</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Current server details
          </p>

          <dl className="mt-6 space-y-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Hostname</dt>
              <dd className="break-all text-right text-zinc-200">
                {system?.host.hostname ?? '--'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Operating system</dt>
              <dd className="text-right text-zinc-200">
                {system?.host.os ?? '--'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Platform</dt>
              <dd className="text-right text-zinc-200">
                {system?.host.platform ?? '--'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Disk mount</dt>
              <dd className="text-right text-zinc-200">
                {system?.disk.path ?? '--'}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-500">Last update</dt>
              <dd className="text-right text-zinc-200">
                {system
                  ? new Date(system.timestamp).toLocaleTimeString()
                  : '--'}
              </dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border border-zinc-800 bg-[#0e0e11] p-5">
          <h2 className="font-semibold">Network counters</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Cumulative traffic counters
          </p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-zinc-500">Received</p>
              <p className="mt-2 text-xl font-semibold">
                {system ? formatBytes(system.network.bytes_recv) : '--'}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Sent</p>
              <p className="mt-2 text-xl font-semibold">
                {system ? formatBytes(system.network.bytes_sent) : '--'}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-xl border border-zinc-800 bg-[#0e0e11] p-5">
          <h2 className="font-semibold">Monitoring status</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Backend telemetry connection
          </p>
          <div className="mt-5 flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-sm text-zinc-300">
              {connected
                ? 'Receiving realtime updates'
                : 'Waiting for connection'}
            </span>
          </div>
        </article>
      </section>
    </main>
  )
}