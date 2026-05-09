import { useState, useEffect, useRef, useCallback, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-toastify'
import {
  FaSun, FaMoon, FaBolt, FaShieldAlt, FaHeartbeat, FaMicrochip,
  FaRedo, FaExclamationTriangle, FaCheckCircle, FaExternalLinkAlt,
} from 'react-icons/fa'

import UploadBox        from '../components/UploadBox'
import ScanAnimation    from '../components/ScanAnimation'
import ResultCard       from '../components/ResultCard'
import FrameGallery     from '../components/FrameGallery'
import Timeline         from '../components/Timeline'
import ModelPanel       from '../components/ModelPanel'
import HistoryPanel     from '../components/HistoryPanel'
import PDFReportButton, { PrintableReport } from '../components/PDFReport'
import { SkeletonResultCard, SkeletonTimeline, SkeletonGallery } from '../components/Skeleton'
import { useTheme }     from '../context/ThemeContext'
import { useHistory }   from '../context/HistoryContext'
import { analyzeFile, fetchHealth } from '../services/api'

/* ── State IDs ─────────────────────────────────────────────────────────── */
const S = { IDLE: 0, UPLOADING: 1, PROCESSING: 2, DONE: 3, ERROR: 4 }

/* ── Upload progress bar ───────────────────────────────────────────────── */
function UploadBar({ pct }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <span className="label">{pct >= 100 ? 'Upload complete' : 'Uploading…'}</span>
        <span className="mono text-xs font-medium"
              style={{ color: pct >= 100 ? 'var(--c-emerald)' : 'var(--c-teal)' }}>
          {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--c-surface-3)' }}>
        <motion.div className="h-full rounded-full"
          style={{ background: pct >= 100 ? 'var(--c-emerald)' : 'var(--c-teal)' }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
}

/* ── Error panel ───────────────────────────────────────────────────────── */
function ErrorPanel({ msg, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 rounded-xl"
      style={{ background: 'var(--c-rose-dim)', border: '1px solid rgba(251,113,133,0.25)' }}
    >
      <FaExclamationTriangle size={16} style={{ color: 'var(--c-rose)', flexShrink: 0, marginTop: 2 }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm" style={{ color: 'var(--c-rose)' }}>Analysis failed</p>
        <p className="mono text-xs mt-0.5" style={{ color: 'var(--c-rose)', opacity: 0.7 }}>{msg}</p>
      </div>
      {onRetry && (
        <button onClick={onRetry} className="btn btn-ghost py-1.5 px-2.5 text-xs gap-1.5 flex-shrink-0">
          <FaRedo size={11} /> Retry
        </button>
      )}
    </motion.div>
  )
}

/* ── Navbar ─────────────────────────────────────────────────────────────── */
const Navbar = memo(({ health, onReset, hasResult }) => {
  const { theme, toggle } = useTheme()
  const isOnline = health?.model_loaded

  return (
    <nav className="no-print sticky top-0 z-40"
         style={{
           background: 'rgba(13,13,16,0.82)',
           backdropFilter: 'blur(18px)',
           WebkitBackdropFilter: 'blur(18px)',
           borderBottom: '1px solid var(--c-border)',
         }}>
      <style>{`.light nav { background: rgba(245,245,240,0.88) !important; }`}</style>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
               style={{ background: 'var(--c-teal)' }}>
            <FaShieldAlt size={13} color="#0d0d10" />
          </div>
          <span className="font-black text-base tracking-tight" style={{ color: 'var(--c-text)' }}>
            Deepfake detector
          </span>
          <span className="chip chip-teal hidden sm:inline-flex">v1.0</span>
        </div>

        {/* Status indicator */}
        <div className="flex-1 flex justify-center">
          {health !== null && (
            <div className="flex items-center gap-1.5">
              <motion.div className="w-1.5 h-1.5 rounded-full"
                style={{ background: isOnline ? 'var(--c-emerald)' : 'var(--c-rose)' }}
                animate={{ opacity: [1, 0.35, 1] }}
                transition={{ duration: 2, repeat: Infinity }} />
              <span className="mono text-xs hidden sm:block"
                    style={{ color: isOnline ? 'var(--c-emerald)' : 'var(--c-rose)' }}>
                {isOnline ? 'Model ready' : 'Model offline'}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {hasResult && (
            <button onClick={onReset} className="btn btn-secondary py-1.5 px-3 gap-1.5 text-xs">
              <FaRedo size={11} /> New
            </button>
          )}
          {/*<a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer"
             className="btn btn-ghost btn-icon">
            <FaExternalLinkAlt size={13} />
          </a>*/}
          <button onClick={toggle} aria-label="Toggle theme" className="btn btn-ghost btn-icon">
            {theme === 'dark' ? <FaSun size={13} /> : <FaMoon size={13} />}
          </button>
        </div>
      </div>
    </nav>
  )
})

/* ── Feature pills ──────────────────────────────────────────────────────── */
const FEATURES = [
  //{ icon: FaBolt,      label: 'Real-time · <5s' },
  { icon: FaMicrochip, label: 'ResNeXt-50 + LSTM' },
  { icon: FaShieldAlt, label: 'Forensic-grade' },
  { icon: FaHeartbeat, label: 'Temporal sampling' },
]

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [state,     setState]     = useState(S.IDLE)
  const [file,      setFile]      = useState(null)
  const [uploadPct, setUploadPct] = useState(0)
  const [scanStage, setScanStage] = useState(0)
  const [result,    setResult]    = useState(null)
  const [errMsg,    setErrMsg]    = useState('')
  const [health,    setHealth]    = useState(null)
  const timers = useRef([])
  const { add: addHistory } = useHistory()

  /* Fetch health on mount */
  useEffect(() => {
    fetchHealth().then(setHealth).catch(() => setHealth({ model_loaded: false }))
  }, [])

  /* Cleanup */
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const handleFile = useCallback(f => {
    setFile(f)
    if (state !== S.IDLE) { setState(S.IDLE); setResult(null); setErrMsg('') }
  }, [state])

  const analyse = async () => {
    if (!file) { toast.warn('Please select a file first.'); return }
    clearTimers()
    setState(S.UPLOADING)
    setUploadPct(0); setResult(null); setErrMsg(''); setScanStage(0)

    try {
      const data = await analyzeFile(file, pct => {
        setUploadPct(pct)
        if (pct >= 100) {
          setState(S.PROCESSING)
          ;[1, 2, 3, 4].forEach((s, i) => {
            const t = setTimeout(() => setScanStage(s), 700 + i * 900)
            timers.current.push(t)
          })
        }
      })

      clearTimers()
      setResult(data)
      setState(S.DONE)
      addHistory({ ...data, filename: file.name })

      const isReal = data.label === 'REAL'
      toast[isReal ? 'success' : 'error'](
        isReal ? 'Authentic video confirmed ✓' : 'Deepfake detected ⚠',
        { autoClose: 4000, position: 'bottom-right' }
      )
    } catch (err) {
      clearTimers()
      setErrMsg(err.message || 'Unknown error')
      setState(S.ERROR)
      toast.error(`Analysis failed: ${err.message}`, { autoClose: 6000, position: 'bottom-right' })
    }
  }

  const reset = () => {
    clearTimers()
    setFile(null); setResult(null); setErrMsg('')
    setUploadPct(0); setScanStage(0); setState(S.IDLE)
  }

  const isWorking = state === S.UPLOADING || state === S.PROCESSING
  const isDone    = state === S.DONE

  return (
    <>
      <Navbar health={health} onReset={reset} hasResult={isDone} />

      {/* Hidden print report */}
      {result && <PrintableReport result={result} filename={file?.name} />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-20">
        {/* Two-column layout: sidebar | main */}
        <div className="grid grid-cols-1 lg:grid-cols-[268px,1fr] gap-6 items-start">

          {/* ══ LEFT SIDEBAR ══ */}
          <aside className="space-y-4 lg:sticky lg:top-20">
            <ModelPanel />
            <HistoryPanel />
          </aside>

          {/* ══ MAIN COLUMN ══ */}
          <section className="space-y-5 min-w-0">

            {/* Hero */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3 text-center"
            >
              <div className="flex flex-wrap justify-center gap-1.5">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <span key={label} className="chip chip-muted gap-1.5">
                    <Icon size={10} style={{ color: 'var(--c-teal)' }} />
                    {label}
                  </span>
                ))}
              </div>
              <h1 className="font-black text-3xl sm:text-4xl md:text-[2.6rem] tracking-tight leading-[1.1]"
                  style={{ color: 'var(--c-text)' }}>
                Detect deepfakes with{' '}
                <span className="text-gradient-teal"> precision</span>
              </h1>
              <p className="text-sm sm:text-base max-w-lg mx-auto leading-relaxed"
                 style={{ color: 'var(--c-text-2)' }}>
                Upload a video for forensic frame-by-frame analysis.
                Results with full confidence breakdown.
              </p>
            </motion.div>

            {/* ── Upload card ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="card p-5 space-y-4"
            >
              <UploadBox onFile={handleFile} disabled={isWorking} />

              <AnimatePresence>
                {state === S.UPLOADING && (
                  <motion.div key="bar"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}>
                    <UploadBar pct={uploadPct} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {state === S.PROCESSING && (
                  <motion.div key="scan"
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}>
                    <ScanAnimation stage={scanStage} uploadPct={uploadPct} />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {state === S.ERROR && (
                  <motion.div key="err"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <ErrorPanel msg={errMsg} onRetry={analyse} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CTA button */}
              <button
                onClick={isDone ? reset : analyse}
                disabled={(!file || isWorking) && !isDone}
                className="btn btn-primary w-full justify-center py-3"
                style={{ fontSize: '0.9rem', letterSpacing: '0.01em' }}
              >
                {isWorking ? (
                  <>
                    <motion.div
                      className="w-4 h-4 rounded-full border-2"
                      style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#0d0d10' }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.75, ease: 'linear', repeat: Infinity }}
                    />
                    {state === S.UPLOADING ? 'Uploading…' : 'Analysing…'}
                  </>
                ) : isDone ? (
                  <><FaRedo size={13} /> Analyse another file</>
                ) : (
                  <><FaBolt size={13} /> Analyse file</>
                )}
              </button>
            </motion.div>

            {/* ── Results area ── */}
            <AnimatePresence mode="wait">
              {/* Skeleton loaders while processing */}
              {state === S.PROCESSING && (
                <motion.div key="skeletons" className="space-y-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SkeletonResultCard />
                  <SkeletonTimeline />
                  <SkeletonGallery n={10} />
                </motion.div>
              )}

              {/* Real results */}
              {isDone && result && (
                <motion.div key="results" className="space-y-4"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                  <div className="section-row">
                    <FaCheckCircle size={12} style={{ color: 'var(--c-emerald)' }} />
                    Analysis complete
                  </div>

                  <ResultCard result={result} />
                  <Timeline result={result} />

                  {result.frames?.length > 0 && (
                    <FrameGallery frames={result.frames} result={result} />
                  )}

                  <PDFReportButton result={result} filename={file?.name} />
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="no-print" style={{ borderTop: '1px solid var(--c-border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5
                        flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="mono text-xs" style={{ color: 'var(--c-text-3)' }}>
            © 2026 Veridian — Deepfake Detection 
          </span>
          <div className="flex items-center gap-5">
            {['PyTorch', 'ResNeXt-50 + LSTM', 'FastAPI', 'FaceForensics++'].map(t => (
              <span key={t} className="mono text-xs" style={{ color: 'var(--c-text-3)' }}>{t}</span>
            ))}
          </div>
        </div>
      </footer>
    </>
  )
}
