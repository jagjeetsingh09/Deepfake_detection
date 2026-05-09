import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { ThemeProvider } from './context/ThemeContext'
import { HistoryProvider } from './context/HistoryContext'
import Home from './pages/Home'

export default function App() {
  return (
    <ThemeProvider>
      <HistoryProvider>
        <Home />
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          theme="dark"
          toastStyle={{
            fontFamily: '"Outfit", sans-serif',
            fontSize: '13px',
            borderRadius: '12px',
            background: 'var(--c-surface)',
            color: 'var(--c-text)',
            border: '1px solid var(--c-border-2)',
            boxShadow: 'var(--c-shadow-lg)',
          }}
          progressStyle={{ background: 'var(--c-teal)' }}
        />
      </HistoryProvider>
    </ThemeProvider>
  )
}
