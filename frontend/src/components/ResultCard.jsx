import { motion } from 'framer-motion'
import { FaShieldAlt, FaExclamationTriangle, FaClock, FaThLarge, FaPercent } from 'react-icons/fa'

function Bar({ label, value, color }) {
  const pct = Math.round(value * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--c-text-2)' }}>{label}</span>
        <span className="mono font-medium" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-3)' }}>
        <motion.div className="h-full rounded-full" style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  )
}

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="stat-block">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon size={11} style={{ color: 'var(--c-text-3)' }} />
        <span className="label text-[10px]">{label}</span>
      </div>
      <div className="mono text-lg font-semibold" style={{ color: 'var(--c-text)' }}>{value}</div>
    </div>
  )
}

export default function ResultCard({ result }) {
  const isReal    = result.label === 'REAL'
  const conf      = result.confidence > 1 ? result.confidence / 100 : result.confidence
  const confPct   = Math.round(conf * 100)
  const realProb  = result.real_probability ?? (isReal ? conf : 1 - conf)
  const fakeProb  = result.fake_probability ?? (isReal ? 1 - conf : conf)
  const frames    = result.frames_analyzed ?? '—'
  const procTime  = result.processing_time_seconds != null ? `${result.processing_time_seconds.toFixed(2)}s` : (result.processing_time ?? '—')

  const accent      = isReal ? 'var(--c-emerald)' : 'var(--c-rose)'
  const accentDim   = isReal ? 'var(--c-emerald-dim)' : 'var(--c-rose-dim)'
  const borderColor = isReal ? 'rgba(52,211,153,0.2)' : 'rgba(251,113,133,0.2)'
  const glowShadow  = isReal
    ? '0 0 0 1px rgba(52,211,153,0.15), 0 4px 24px rgba(52,211,153,0.08)'
    : '0 0 0 1px rgba(251,113,133,0.15), 0 4px 24px rgba(251,113,133,0.08)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card p-6 space-y-5"
      style={{ borderColor, boxShadow: glowShadow }}
    >
      {/* ── Verdict row ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 280, delay: 0.1 }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: accentDim, border: `1px solid ${borderColor}` }}
          >
            {isReal
              ? <FaShieldAlt size={26} style={{ color: accent }} />
              : <FaExclamationTriangle size={26} style={{ color: accent }} />}
          </motion.div>

          <div>
            <div className="label mb-1">Forensic verdict</div>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`font-black text-3xl tracking-tight leading-none ${isReal ? 'text-gradient-real' : 'text-gradient-fake'}`}
            >
              {isReal ? 'AUTHENTIC' : 'DEEPFAKE'}
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="px-3.5 py-1.5 rounded-full mono text-xs font-semibold"
          style={{ background: accentDim, color: accent, border: `1px solid ${borderColor}` }}
        >
          {isReal ? '● VERIFIED AUTHENTIC' : '⚠ MANIPULATION DETECTED'}
        </motion.div>
      </div>

      <div className="divider" />

      {/* ── Confidence meter ── */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <span className="label">Confidence score</span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mono font-bold text-2xl"
            style={{ color: accent }}
          >
            {confPct}%
          </motion.span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-3)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}99, ${accent})` }}
            initial={{ width: 0 }}
            animate={{ width: `${confPct}%` }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        {/* Tick labels */}
        <div className="flex justify-between mono text-[9px] text-subtle">
          {['0', '25', '50', '75', '100'].map(t => <span key={t}>{t}%</span>)}
        </div>
      </div>

      {/* ── Probability breakdown ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Bar label="Authentic signal"    value={realProb} color="var(--c-emerald)" />
        <Bar label="Manipulation signal" value={fakeProb} color="var(--c-rose)" />
      </div>

      <div className="divider" />

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatBlock icon={FaPercent}  label="Confidence" value={`${confPct}%`} />
        <StatBlock icon={FaThLarge}  label="Frames"      value={frames} />
        <StatBlock icon={FaClock}    label="Proc. time"  value={procTime} />
      </div>
    </motion.div>
  )
}
