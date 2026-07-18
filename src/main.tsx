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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

