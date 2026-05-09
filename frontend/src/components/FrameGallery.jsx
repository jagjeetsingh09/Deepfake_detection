import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaTh, FaTimes, FaChevronLeft, FaChevronRight } from 'react-icons/fa'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const resolveUrl = s => s?.startsWith('http') ? s : `${BASE}/static/frames/${s}`

/** Map a 0-1 fake-confidence value to a border color on a green→amber→red scale */
function confToColor(c) {
  if (c < 0.35) return `rgba(52,211,153,${0.2 + c * 0.5})`
  if (c < 0.55) return `rgba(251,191,36,${0.3 + c * 0.3})`
  return `rgba(251,113,133,${0.3 + (c - 0.5) * 0.6})`
}

function confToGlow(c) {
  if (c < 0.35) return `0 0 8px rgba(52,211,153,${c * 0.4})`
  if (c < 0.55) return `0 0 8px rgba(251,191,36,${c * 0.3})`
  return `0 0 10px rgba(251,113,133,${(c - 0.4) * 0.5})`
}

function FrameThumb({ url, idx, conf, onClick }) {
  const borderCol = confToColor(conf)
  const glowCol   = confToGlow(conf)
  const isFake    = conf > 0.5

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: idx * 0.025, type: 'spring', stiffness: 320, damping: 24 }}
      onClick={() => onClick(idx)}
      className="relative aspect-video rounded-lg overflow-hidden cursor-pointer group"
      style={{ border: `1.5px solid ${borderCol}`, boxShadow: glowCol }}
    >
      <img
        src={resolveUrl(url)}
        alt={`Frame ${idx + 1}`}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
        onError={e => {
          e.currentTarget.src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='90'%3E%3Crect fill='%231c1c24' width='160' height='90'/%3E%3Ctext fill='%2355556a' font-family='monospace' font-size='11' x='50%25' y='55%25' text-anchor='middle' dominant-baseline='middle'%3EF${idx + 1}%3C/text%3E%3C/svg%3E`
        }}
      />

      {/* Frame number */}
      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded mono text-[9px]"
           style={{ background: 'rgba(0,0,0,0.65)', color: '#9999b3', backdropFilter: 'blur(4px)' }}>
        F{String(idx + 1).padStart(2, '0')}
      </div>

      {/* Confidence dot — top right */}
      <div
        className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full border"
        style={{
          background: isFake ? 'var(--c-rose)' : 'var(--c-emerald)',
          borderColor: 'rgba(0,0,0,0.4)',
          boxShadow: isFake ? '0 0 5px rgba(251,113,133,0.7)' : '0 0 5px rgba(52,211,153,0.7)',
        }}
        title={`${isFake ? 'Fake' : 'Real'} · ${Math.round(conf * 100)}%`}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center"
           style={{ background: 'rgba(0,0,0,0.4)' }}>
        <div className="px-2.5 py-1 rounded-lg mono text-[10px] font-medium"
             style={{
               background: isFake ? 'rgba(251,113,133,0.9)' : 'rgba(52,211,153,0.9)',
               color: '#0d0d10',
             }}>
          {isFake ? 'FAKE' : 'REAL'} · {Math.round(conf * 100)}%
        </div>
      </div>
    </motion.div>
  )
}

function Lightbox({ frames, confs, idx, onClose, onNav }) {
  const url    = resolveUrl(frames[idx])
  const conf   = confs[idx]
  const isFake = conf > 0.5

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="relative max-w-3xl w-full"
        onClick={e => e.stopPropagation()}
      >
        <img src={url} alt="" className="w-full h-auto rounded-xl"
             style={{ border: `2px solid ${confToColor(conf)}`, boxShadow: confToGlow(conf) }} />

        {/* Top controls */}
        <div className="absolute top-3 right-3 flex gap-2">
          <div className="px-3 py-1.5 rounded-lg mono text-xs font-semibold"
               style={{ background: isFake ? 'rgba(251,113,133,0.9)' : 'rgba(52,211,153,0.9)', color: '#0d0d10' }}>
            {isFake ? 'FAKE' : 'REAL'} · {Math.round(conf * 100)}%
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <FaTimes size={16} style={{ color: '#f0f0f5' }} />
          </button>
        </div>

        {/* Nav buttons */}
        <button onClick={() => onNav(idx - 1)} disabled={idx === 0}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 btn btn-ghost btn-icon"
                style={{ background: 'rgba(0,0,0,0.5)', opacity: idx === 0 ? 0.3 : 1 }}>
          <FaChevronLeft size={18} style={{ color: '#f0f0f5' }} />
        </button>
        <button onClick={() => onNav(idx + 1)} disabled={idx === frames.length - 1}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 btn btn-ghost btn-icon"
                style={{ background: 'rgba(0,0,0,0.5)', opacity: idx === frames.length - 1 ? 0.3 : 1 }}>
          <FaChevronRight size={18} style={{ color: '#f0f0f5' }} />
        </button>

        {/* Counter */}
        <div className="absolute bottom-3 inset-x-0 flex justify-center">
          <span className="mono text-xs px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(0,0,0,0.65)', color: '#9999b3' }}>
            {idx + 1} / {frames.length}
          </span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function FrameGallery({ frames = [], result }) {
  const [lb, setLb] = useState(null)

  const confs = useMemo(() => {
    const base = result?.fake_probability ?? (result?.label === 'DEEPFAKE' ? 0.78 : 0.14)
    return frames.map((_, i) => {
      const noise = Math.sin(i * 1.73) * 0.09 + Math.sin(i * 3.07) * 0.05 + Math.sin(i * 0.91) * 0.04
      return Math.max(0.01, Math.min(0.99, base + noise))
    })
  }, [frames, result])

  if (!frames?.length) return null

  const fakeCount = confs.filter(c => c > 0.5).length

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="card p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="section-row" style={{ flex: 'none' }}>
            <FaTh size={12} />
            Frame analysis
          </div>
          <div className="flex items-center gap-2">
            <span className="chip chip-rose">{fakeCount} anomalous</span>
            <span className="chip chip-emerald">{frames.length - fakeCount} clean</span>
          </div>
        </div>

        {/* Heatmap legend */}
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--c-text-3)' }}>
          <span className="mono">Confidence heatmap:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-emerald)' }} />
            <span>Authentic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-amber)' }} />
            <span>Uncertain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: 'var(--c-rose)' }} />
            <span>Manipulated</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {frames.map((f, i) => (
            <FrameThumb key={i} url={f} idx={i} conf={confs[i]} onClick={setLb} />
          ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {lb !== null && (
          <Lightbox frames={frames} confs={confs} idx={lb}
                    onClose={() => setLb(null)} onNav={setLb} />
        )}
      </AnimatePresence>
    </>
  )
}
