import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './lib/pwa.ts'

// Limpar caches antigos do service worker (LogPose / SFY -> NINJA'S TRACKER)
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.keys().then((names) => {
    names.forEach((name) => {
      if (name.includes('logpose') || name.startsWith('logpose') || name.includes('sfy') || name.startsWith('sfy')) {
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
