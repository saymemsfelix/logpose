import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa.ts'

// Limpar caches antigos do service worker (LogPose / SFY / v1 -> NINJA'S TRACKER v2)
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name !== 'ninjastracker-v2') {
        caches.delete(name);
      }
    });
  });
}

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
