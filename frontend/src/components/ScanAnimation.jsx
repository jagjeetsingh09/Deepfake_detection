import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const STAGES = [
  { label: 'Transferring file',          icon: '⬆' },
  { label: 'Decoding video container',   icon: '📦' },
  { label: 'Temporal frame sampling',    icon: '🎞' },
  { label: 'Neural network inference',   icon: '⚡' },
  { label: 'Compiling forensic report',  icon: '📊' },
]

function WaveBar({ i, active }) {
  const heights = [3, 6, 10, 16, 22, 16, 10, 6, 3]
  return (
    <motion.div
      className="w-px rounded-full flex-shrink-0"
      style={{ background: active ? 'var(--c-teal)' : 'var(--c-surface-3)' }}
      animate={{ height: active ? heights[i % heights.length] : 3 }}
      transition={{ duration: 0.35, delay: i * 0.05, type: 'spring', stiffness: 300 }}
    />
  )
}

export default function ScanAnimation({ stage = 0, uploadPct = 0 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let t = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      canvas.width  = canvas.offsetWidth  * dpr
      canvas.height = canvas.offsetHeight * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const isLight = document.documentElement.classList.contains('light')
      const tealHex = isLight ? '#009990' : '#00d4c8'

      // Grid lines
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      for (let y = h * 0.25; y < h; y += h * 0.25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
      }

      // Center reference
      ctx.strokeStyle = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke()
      ctx.setLineDash([])

      // Gradient waveform
      const grad = ctx.createLinearGradient(0, 0, w, 0)
      grad.addColorStop(0,   'rgba(0,212,200,0)')
      grad.addColorStop(0.12, tealHex)
      grad.addColorStop(0.88, tealHex)
      grad.addColorStop(1,   'rgba(0,212,200,0)')

      ctx.beginPath()
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.5
      for (let x = 0; x <= w; x += 1.5) {
        const progress = t * 0.018
        const y = h / 2
          + Math.sin(x * 0.04 + progress)        * h * 0.22
          + Math.sin(x * 0.09 + progress * 1.6)  * h * 0.12
          + Math.sin(x * 0.17 + progress * 2.3)  * h * 0.07
          + (Math.random() - 0.5)                * h * 0.025
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Vertical scan cursor
      const cursorX = (t * 1.4) % (w + 40) - 20
      const cgrad = ctx.createLinearGradient(cursorX - 18, 0, cursorX + 2, 0)
      cgrad.addColorStop(0, 'rgba(0,212,200,0)')
      cgrad.addColorStop(1, isLight ? 'rgba(0,153,144,0.7)' : 'rgba(0,212,200,0.7)')
      ctx.strokeStyle = cgrad
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(cursorX, 0); ctx.lineTo(cursorX, h); ctx.stroke()

      t++
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [])

  const stageProgress = Math.min(99, stage * 25 + (uploadPct < 100 ? uploadPct * 0.25 : 0))

  return (
    <div className="space-y-5">
      {/* Waveform canvas */}
      <div className="relative overflow-hidden rounded-xl"
           style={{ height: 90, background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="label opacity-30">SIGNAL ANALYSIS</span>
        </div>
      </div>

      {/* Overall progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="label">Pipeline progress</span>
          <span className="mono text-xs" style={{ color: 'var(--c-teal)' }}>{Math.round(stageProgress)}%</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-3)' }}>
          <motion.div className="h-full rounded-full" style={{ background: 'var(--c-teal)' }}
            animate={{ width: `${stageProgress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stage list */}
      <div className="space-y-1">
        {STAGES.map((s, i) => {
          const done = i < stage, active = i === stage
          return (
            <motion.div key={i}
              initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07 }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: active ? 'var(--c-teal-dim)' : 'transparent',
                border: `1px solid ${active ? 'var(--c-teal-border)' : 'transparent'}`,
              }}
            >
              {/* Status circle */}
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{
                     background: done ? 'var(--c-emerald-dim)' : active ? 'var(--c-teal-dim)' : 'var(--c-surface-3)',
                     border: `1px solid ${done ? 'rgba(52,211,153,0.35)' : active ? 'var(--c-teal-border)' : 'transparent'}`,
                   }}>
                {done
                  ? <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="var(--c-emerald)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  : active
                  ? <motion.div className="w-2 h-2 rounded-full" style={{ background: 'var(--c-teal)' }}
                      animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  : <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--c-surface-3)' }} />
                }
              </div>

              <span className="mono text-xs flex-1"
                    style={{ color: done ? 'var(--c-emerald)' : active ? 'var(--c-teal)' : 'var(--c-text-3)' }}>
                {s.label}
              </span>

              {/* Live wave bars */}
              {active && (
                <div className="flex items-center gap-px h-6">
                  {Array.from({ length: 9 }).map((_, j) => <WaveBar key={j} i={j} active />)}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
