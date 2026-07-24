import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/responsive.css'
import './styles/daw.css'
import App from './App.tsx'

// Drop stale service workers / cached shells that keep serving deleted JS bundles
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((reg) => void reg.unregister())
  })
}

// After a deploy, old lazy chunks 404 — reload once to pick up the new index.html
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    const key = 'sl_chunk_reload'
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1')
      window.location.reload()
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

