import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { SystemSnapshot } from '../../types/system'

interface ResourceChartProps {
  history: SystemSnapshot[]
}

export function ResourceChart({ history }: ResourceChartProps) {
  const data = history.map((item) => ({
    time: new Date(item.timestamp).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    cpu: Number(item.cpu.usage_percent.toFixed(1)),
    memory: Number(item.memory.usage_percent.toFixed(1)),
  }))

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0e0e11] p-5">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-zinc-100">Resource Usage</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Live CPU and memory utilization
          </p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            CPU
          </span>
          <span className="flex items-center gap-2 text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            Memory
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={30}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#71717a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value: number) => `${value}%`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: '#18181b',
                border: '1px solid #3f3f46',
                borderRadius: 10,
                color: '#fafafa',
                fontSize: 12,
              }}
              formatter={(value) => [`${value}%`]}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              name="CPU"
              stroke="#34d399"
              strokeWidth={2}
              fill="url(#cpuGradient)"
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="memory"
              name="Memory"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#memoryGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}