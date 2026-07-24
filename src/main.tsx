import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import '@fontsource/syne/latin-400.css'
import '@fontsource/syne/latin-500.css'
import '@fontsource/syne/latin-600.css'
import '@fontsource/syne/latin-700.css'
import '@fontsource/syne/latin-800.css'
import '@fontsource/dm-mono/latin-300.css'
import '@fontsource/dm-mono/latin-400.css'
import '@fontsource/dm-mono/latin-500.css'
import './index.css'
import './styles/responsive.css'
import App from './App.tsx'

function registerServiceWorker() {
  // Auto-update service worker: new deploys activate without sticky stale shells
  registerSW({
    immediate: false,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // Check for updates periodically while the tab is open
      window.setInterval(() => {
        void registration.update()
      }, 60 * 60 * 1000)
    },
    onNeedRefresh() {
      // autoUpdate + skipWaiting already handles this; soft reload if preload fails
    },
  })
}

// Defer SW off the critical first-paint path
const scheduleIdle =
  typeof window !== 'undefined' && 'requestIdleCallback' in window
    ? (cb: () => void) => window.requestIdleCallback(() => cb(), { timeout: 4000 })
    : (cb: () => void) => window.setTimeout(cb, 1500)

if (typeof window !== 'undefined') {
  const startSw = () => scheduleIdle(registerServiceWorker)
  if (document.readyState === 'complete') startSw()
  else window.addEventListener('load', startSw, { once: true })
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

// Mark standalone PWA mode for CSS (safe-areas / chrome) + device install flag
if (typeof document !== 'undefined') {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  if (standalone) {
    document.documentElement.classList.add('sl-pwa')
    try {
      localStorage.setItem('sl_pwa_installed_device_v1', '1')
    } catch {
      /* ignore */
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
