import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  percent?: number
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  percent,
}: MetricCardProps) {
  const safePercent =
    percent === undefined
      ? undefined
      : Math.min(100, Math.max(0, percent))

  return (
    <article className="rounded-xl border border-zinc-800 bg-[#0e0e11] p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-zinc-500">{title}</span>
        <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] p-2 text-emerald-400">
          <Icon size={18} />
        </div>
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-tight text-zinc-100">
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>

      {safePercent !== undefined && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${safePercent}%` }}
          />
        </div>
      )}
    </article>
  )
}