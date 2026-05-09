import { createContext, useContext, useEffect, useState } from 'react'
const Ctx = createContext(null)
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('vrd-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') }
    catch { return 'dark' }
  })
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
    try { localStorage.setItem('vrd-theme', theme) } catch {}
  }, [theme])
  return <Ctx.Provider value={{ theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') }}>{children}</Ctx.Provider>
}
export const useTheme = () => useContext(Ctx)
