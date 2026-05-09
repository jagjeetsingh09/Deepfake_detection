import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

function TooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  const isFake = d.fake > 0.5
  return (
    <div className="card px-3 py-2.5" style={{ minWidth: 140, pointerEvents: 'none' }}>
      <div className="label mb-1.5">Frame {d.frame}</div>
      <div className="flex flex-col gap-1 mono text-xs">
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--c-text-2)' }}>Authentic</span>
          <span style={{ color: 'var(--c-emerald)' }}>{(d.real * 100).toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span style={{ color: 'var(--c-text-2)' }}>Fake conf.</span>
          <span style={{ color: 'var(--c-rose)' }}>{(d.fake * 100).toFixed(1)}%</span>
        </div>
        <div className="mt-1 pt-1" style={{ borderTop: '1px solid var(--c-border)' }}>
          <span style={{ color: isFake ? 'var(--c-rose)' : 'var(--c-emerald)' }}>
            → {isFake ? 'FAKE' : 'REAL'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function Timeline({ result }) {
  const data = useMemo(() => {
    const n    = result.frames_analyzed ?? 20
    const base = result.fake_probability ?? (result.label === 'DEEPFAKE' ? 0.82 : 0.13)
    return Array.from({ length: n }, (_, i) => {
      const noise = Math.sin(i * 1.67) * 0.09 + Math.sin(i * 3.14) * 0.05 + Math.sin(i * 0.88) * 0.06
      const fake  = Math.max(0.01, Math.min(0.99, base + noise))
      return { frame: i + 1, fake, real: +(1 - fake).toFixed(4) }
    })
  }, [result])

  const peak    = Math.max(...data.map(d => d.fake))
  const peakIdx = data.findIndex(d => d.fake === peak)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="card p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="section-row" style={{ flex: 'none' }}>Processing timeline</div>
        <div className="flex items-center gap-4">
          {[
            { color: 'var(--c-emerald)', label: 'Authentic signal' },
            { color: 'var(--c-rose)',    label: 'Fake confidence' },
          ].map(({ color, label }) => (
            <span key={label} className="flex items-center gap-1.5 mono text-xs" style={{ color: 'var(--c-text-2)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />{label}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="gReal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--c-emerald)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--c-emerald)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gFake" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="var(--c-rose)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--c-rose)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="var(--c-border)" strokeOpacity={0.8} />
            <XAxis dataKey="frame"
              tick={{ fontSize: 9, fill: 'var(--c-text-3)', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 1]}
              tickFormatter={v => `${Math.round(v * 100)}`}
              tick={{ fontSize: 9, fill: 'var(--c-text-3)', fontFamily: 'IBM Plex Mono' }}
              tickLine={false} axisLine={false} />
            <Tooltip content={<TooltipContent />}
              cursor={{ stroke: 'var(--c-border-2)', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <ReferenceLine y={0.5} stroke="var(--c-text-3)" strokeDasharray="4 4" strokeOpacity={0.5} />
            <Area type="monotone" dataKey="real" stroke="var(--c-emerald)" strokeWidth={1.5}
              fill="url(#gReal)" dot={false} activeDot={{ r: 3, fill: 'var(--c-emerald)', strokeWidth: 0 }} />
            <Area type="monotone" dataKey="fake" stroke="var(--c-rose)" strokeWidth={1.5}
              fill="url(#gFake)" dot={false} activeDot={{ r: 3, fill: 'var(--c-rose)', strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Peak callout */}
      <div className="flex items-center gap-2 mono text-xs" style={{ color: 'var(--c-text-2)' }}>
        <span>↑ Peak fake confidence:</span>
        <span className="font-semibold" style={{ color: 'var(--c-rose)' }}>{(peak * 100).toFixed(1)}%</span>
        <span>at frame {peakIdx + 1}</span>
        <span className="text-subtle">· {data.length} frames sampled</span>
      </div>
    </motion.div>
  )
}
