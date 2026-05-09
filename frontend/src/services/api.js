import axios from 'axios'
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const http = axios.create({ baseURL: BASE, timeout: 0 })
http.interceptors.response.use(
  r => r,
  err => {
    const detail = err?.response?.data?.detail
    const msg = typeof detail === 'string' ? detail : err?.message || 'Unexpected error'
    return Promise.reject(new Error(msg))
  }
)
export const analyzeFile = (file, onProgress) => {
  const fd = new FormData()
  fd.append('file', file)
  return http.post('/upload', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => e.total && onProgress?.(Math.round(e.loaded / e.total * 100)),
  }).then(r => r.data)
}
export const fetchHealth = () => http.get('/system/health').then(r => r.data)
export const fetchStatus = () => http.get('/system/status').then(r => r.data)
export default http
