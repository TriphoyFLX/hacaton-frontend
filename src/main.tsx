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
import './styles/device-ux.css'
import { installDisablePictureInPicture } from './lib/disablePictureInPicture'
import { bindPwaInstallCapture } from './lib/pwa'
import { bindPwaControllerReload, startPwaAutoUpdate } from './lib/pwaUpdate'
import App from './App.tsx'

installDisablePictureInPicture()

// Capture beforeinstallprompt ASAP — Android only offers a real WebAPK install
// after SW + BIP are ready. Late listeners miss the event → "Add shortcut" only.
if (typeof window !== 'undefined') {
  bindPwaInstallCapture()
  bindPwaControllerReload()
}

// Register SW immediately so Chrome Android can install as standalone app, not a bookmark.
// autoUpdate + skipWaiting activate new builds; we also poll on focus (mobile kills timers).
if (typeof window !== 'undefined') {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      startPwaAutoUpdate(registration)
    },
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

// Mark standalone PWA mode for CSS (safe-areas / chrome) + device install flag
if (typeof document !== 'undefined') {
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  if (standalone) {
    document.documentElement.classList.add('sl-pwa')
    try {
      localStorage.setItem('sl_pwa_installed_device_v1', '1')
    } catch {
      /* ignore */
    }
    // Phone PWA: prefer OS portrait lock; CSS counter-rotates if lock is denied
    const syncPhonePortrait = () => {
      const phone = window.matchMedia('(max-width: 768px)').matches
      if (!phone) return
      const angle =
        (screen.orientation && typeof screen.orientation.angle === 'number'
          ? screen.orientation.angle
          : typeof (window as Window & { orientation?: number }).orientation === 'number'
            ? (window as Window & { orientation?: number }).orientation
            : 0) || 0
      document.documentElement.dataset.slOrient = String(angle)
      const lock = (
        screen.orientation as ScreenOrientation & {
          lock?: (orientation: string) => Promise<void>
        }
      )?.lock
      if (typeof lock === 'function') {
        void lock.call(screen.orientation, 'portrait').catch(() => {
          void lock.call(screen.orientation, 'portrait-primary').catch(() => undefined)
        })
      }
    }
    syncPhonePortrait()
    window.addEventListener('orientationchange', syncPhonePortrait)
    screen.orientation?.addEventListener?.('change', syncPhonePortrait)
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
