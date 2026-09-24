const CACHE_NAME = 'sfy-v1';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/pwa-192.png',
  '/icons/pwa-512.png',
];

// Install: cache static assets and skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
    })
  );
});

// Activate: purge ALL old caches (including any logpose-* caches)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deletando cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: network-first para tudo para garantir que atualizações do SFY apareçam imediatamente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignora requisições não-GET e APIs do backend
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // Network-first para todos os assets e páginas
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.mode === 'navigate' || url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico|css|js|woff2?|ttf)$/))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/') || caches.match('/dashboard');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
