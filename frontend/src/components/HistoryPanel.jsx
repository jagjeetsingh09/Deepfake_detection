import { motion, AnimatePresence } from 'framer-motion'
import { FaHistory, FaTrash, FaTimes, FaShieldAlt, FaExclamationTriangle } from 'react-icons/fa'
import { useHistory } from '../context/HistoryContext'

function fmt(ts) {
  const d = new Date(ts)
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000)   return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

export default function HistoryPanel() {
  const { history, remove, clear } = useHistory()

  return (
    <div className="card flex flex-col overflow-hidden" style={{ maxHeight: 340 }}>
      <div className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
           style={{ borderBottom: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-2">
          <FaHistory size={13} style={{ color: 'var(--c-text-2)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--c-text)' }}>History</span>
          {history.length > 0 && (
            <span className="chip chip-muted">{history.length}</span>
          )}
        </div>
        {history.length > 0 && (
          <button onClick={clear} className="btn btn-ghost btn-icon" style={{ padding: '0.35rem' }}>
            <FaTrash size={12} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          {history.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-8 gap-2">
              <FaHistory size={22} style={{ color: 'var(--c-text-3)' }} />
              <p className="text-xs text-subtle">No analyses yet</p>
            </motion.div>
          ) : history.map(e => {
            const isReal = e.label === 'REAL'
            const conf   = e.confidence > 1 ? Math.round(e.confidence) : Math.round(e.confidence * 100)
            return (
              <motion.div key={e.id} layout
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8, height: 0, marginBottom: 0 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg mb-0.5 group transition-colors"
                onMouseEnter={ev => ev.currentTarget.style.background = 'var(--c-surface-2)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                     style={{ background: isReal ? 'var(--c-emerald-dim)' : 'var(--c-rose-dim)' }}>
                  {isReal
                    ? <FaShieldAlt size={12} style={{ color: 'var(--c-emerald)' }} />
                    : <FaExclamationTriangle size={12} style={{ color: 'var(--c-rose)' }} />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="mono text-xs truncate" style={{ color: 'var(--c-text)' }}>
                    {e.filename || 'Unknown file'}
                  </p>
                  <p className="mono text-[10px] text-subtle">{fmt(e.ts)}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`chip ${isReal ? 'chip-emerald' : 'chip-rose'} text-[9px]`}>
                    {e.label}
                  </span>
                  <span className="mono text-[10px] text-subtle">{conf}%</span>
                </div>

                <button onClick={() => remove(e.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-ghost btn-icon"
                  style={{ padding: '0.2rem' }}>
                  <FaTimes size={11} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
