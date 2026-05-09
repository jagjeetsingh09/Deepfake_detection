import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { FaUpload, FaVideo, FaTimes, FaExclamationCircle } from 'react-icons/fa'

const ACCEPT = {
  'video/mp4': ['.mp4'], 'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'],
}
const fmtSize = b => b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`

export default function UploadBox({ onFile, disabled }) {
  const [preview, setPreview] = useState(null)

  const onDrop = useCallback((ok, bad) => {
    if (bad.length || !ok[0]) return
    const f = ok[0]
    const isVid = f.type.startsWith('video/')
    setPreview({ f, name: f.name, size: fmtSize(f.size), isVid, thumb: isVid ? null : URL.createObjectURL(f) })
    onFile(f)
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop, accept: ACCEPT, maxSize: 500 * 1048576, maxFiles: 1, disabled,
  })

  const clear = e => { e.stopPropagation(); setPreview(null); onFile(null) }

  const borderColor = isDragReject ? 'var(--c-rose)' : isDragActive ? 'var(--c-teal)' : preview ? 'var(--c-teal-border)' : 'var(--c-border-2)'
  const bgColor = isDragActive ? 'var(--c-teal-dim)' : isDragReject ? 'var(--c-rose-dim)' : 'transparent'

  return (
    <div
      {...getRootProps()}
      style={{
        border: `2px dashed ${borderColor}`,
        background: bgColor,
        borderRadius: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s ease',
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <input {...getInputProps()} />
      <AnimatePresence mode="wait">
        {preview ? (
          <motion.div key="p" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-4 p-5">
            {/* Thumbnail */}
            <div className="w-14 h-14 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center"
                 style={{ background: 'var(--c-surface-2)', border: '1px solid var(--c-border)' }}>
              {preview.thumb
                ? <img src={preview.thumb} alt="" className="w-full h-full object-cover" />
                : <FaVideo size={22} style={{ color: 'var(--c-teal)' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate mb-1.5" style={{ color: 'var(--c-text)' }}>
                {preview.name}
              </p>
              <div className="flex items-center gap-2">
                <span className={`chip ${preview.isVid ? 'chip-teal' : 'chip-muted'}`}>
                  {preview.isVid ? '▶ VIDEO' : '◻ IMAGE'}
                </span>
                <span className="mono text-xs text-subtle">{preview.size}</span>
              </div>
              <p className="mono text-xs text-subtle mt-1">Drop another file to replace</p>
            </div>
            <button onClick={clear} className="btn btn-ghost btn-icon flex-shrink-0"><FaTimes size={14} /></button>
          </motion.div>
        ) : (
          <motion.div key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center gap-4 py-12 px-8 text-center">
            <motion.div
              animate={isDragActive ? { scale: 1.12, rotate: 3 } : { scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: isDragActive ? 'var(--c-teal-dim)' : 'var(--c-surface-2)',
                       border: `1px solid ${isDragActive ? 'var(--c-teal-border)' : 'var(--c-border)'}` }}
            >
              <FaUpload size={24} style={{ color: isDragActive ? 'var(--c-teal)' : 'var(--c-text-2)' }} />
            </motion.div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--c-text)' }}>
                {isDragReject ? 'Unsupported format' : isDragActive ? 'Release to upload' : 'Drop file or click to browse'}
              </p>
              <p className="text-xs text-muted">MP4 · MOV · AVI  — up to 500 MB</p>
            </div>
            {isDragReject && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                   style={{ background: 'var(--c-rose-dim)', color: 'var(--c-rose)' }}>
                <FaExclamationCircle size={13} />
                <span className="mono text-xs">Video and image files only</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
