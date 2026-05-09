import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FaMicrochip, FaChevronDown, FaExternalLinkAlt } from 'react-icons/fa'
import { fetchStatus, fetchHealth } from '../services/api'

function Row({ label, value, mono = false }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2"
         style={{ borderBottom: '1px solid var(--c-border)' }}>
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-xs text-right ${mono ? 'mono' : 'font-medium'}`}
            style={{ color: 'var(--c-text)' }}>
        {value}
      </span>
    </div>
  )
}

export default function ModelPanel() {
  const [open, setOpen]       = useState(false)
  const [status, setStatus]   = useState(null)
  const [health, setHealth]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || status) return
    setLoading(true)
    Promise.all([fetchStatus().catch(() => null), fetchHealth().catch(() => null)])
      .then(([s, h]) => { setStatus(s); setHealth(h) })
      .finally(() => setLoading(false))
  }, [open])

  const isOnline = health?.model_loaded

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 transition-colors"
        style={{ background: open ? 'var(--c-surface-2)' : 'transparent' }}
      >
        <div className="flex items-center gap-2.5">
          <FaMicrochip size={13} style={{ color: 'var(--c-teal)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>Model info</span>
          {health !== null && (
            <div className="flex items-center gap-1.5">
              <motion.div className="w-1.5 h-1.5 rounded-full"
                style={{ background: isOnline ? 'var(--c-emerald)' : 'var(--c-rose)' }}
                animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <span className="mono text-[10px]"
                    style={{ color: isOnline ? 'var(--c-emerald)' : 'var(--c-rose)' }}>
                {isOnline ? 'online' : 'offline'}
              </span>
            </div>
          )}
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FaChevronDown size={12} style={{ color: 'var(--c-text-2)' }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', borderTop: '1px solid var(--c-border)' }}
          >
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-5 text-xs text-muted">
                  <motion.div className="w-4 h-4 rounded-full border-2 border-t-transparent"
                    style={{ borderColor: 'var(--c-teal)' }}
                    animate={{ rotate: 360 }} transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }} />
                  Fetching status...
                </div>
              ) : (
                <>
                  <div>
                    <Row label="Architecture"     value="ResNeXt-50 32×4d + LSTM" />
                    <Row label="Sequence length"  value={`${status?.sequence_length ?? 20} frames`} mono />
                    <Row label="Input resolution" value={`${status?.image_size ?? 224}×${status?.image_size ?? 224}px`} mono />
                    <Row label="Device"           value={(status?.device ?? health?.device ?? 'CPU').toUpperCase()} mono />
                    <Row label="Model status"     value={health?.model_status ?? '—'} />
                    <Row label="Warm-up"          value={status?.warmup_enabled ? 'Completed' : 'Disabled'} />
                    <Row label="Debug frames"     value={status?.save_debug_frames ? 'Saving' : 'Off'} />
                  </div>

                  <div>
                    <div className="label mb-2">Quick links</div>
                    {[
                      { label: 'Swagger UI',   path: '/docs' },
                      { label: 'Health check', path: '/system/health' },
                      { label: 'Model status', path: '/system/status' },
                    ].map(({ label, path }) => (
                      <a key={path}
                         href={`http://localhost:8000${path}`}
                         target="_blank" rel="noopener noreferrer"
                         className="flex items-center justify-between px-2.5 py-2 rounded-lg mb-1 group transition-colors"
                         style={{ background: 'var(--c-surface-2)' }}
                      >
                        <span className="mono text-xs" style={{ color: 'var(--c-text)' }}>{path}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-subtle group-hover:text-muted">{label}</span>
                          <FaExternalLinkAlt size={10} style={{ color: 'var(--c-text-3)' }} />
                        </div>
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
