import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import './styles/responsive.css'
import './styles/daw.css'
import App from './App.tsx'

// Auto-update service worker: new deploys activate without sticky stale shells
registerSW({
  immediate: true,
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

// Mark standalone PWA mode for CSS (safe-areas / chrome)
if (typeof document !== 'undefined') {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  if (standalone) document.documentElement.classList.add('sl-pwa')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
