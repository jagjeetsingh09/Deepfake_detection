import { createContext, useCallback, useContext, useEffect, useState } from 'react'
const KEY = 'vrd-history'
const Ctx = createContext(null)
export function HistoryProvider({ children }) {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(history.slice(0,25))) } catch {} }, [history])
  const add    = useCallback(e => setHistory(h => [{ id: crypto.randomUUID(), ts: Date.now(), ...e }, ...h].slice(0,25)), [])
  const remove = useCallback(id => setHistory(h => h.filter(e => e.id !== id)), [])
  const clear  = useCallback(() => setHistory([]), [])
  return <Ctx.Provider value={{ history, add, remove, clear }}>{children}</Ctx.Provider>
}
export const useHistory = () => useContext(Ctx)
