const CACHE_NAME = 'ninjastracker-v6';

const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/logo_dark.webp',
  '/logo_light.webp',
  '/favicon.webp',
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

// Activate: purge ALL old caches (including any logpose-* or sfy-* caches)
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

// Fetch: network-first para tudo para garantir que atualizações apareçam imediatamente
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
        return caches.match(request, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('/') || caches.match('/dashboard');
          }
          if (url.pathname.match(/\.(png|jpg|jpeg|webp|svg|ico)$/)) {
            return caches.match('/logo_dark.webp');
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});

// Notificações: clique no banner/popup do celular abre o Dashboard ou Recuperação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client && urlToOpen) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Suporte a Web Push remoto (Android, iOS PWA e Desktop)
self.addEventListener('push', (event) => {
  let title = '💰 NINJA TRACKER: Venda Aprovada!';
  let options = {
    body: 'Nova venda aprovada!',
    icon: '/icons/pwa-192.png',
    badge: '/icons/pwa-192.png',
    vibrate: [300, 100, 300, 100, 400],
    renotify: true,
    requireInteraction: true,
    tag: 'ninja-sale-' + Date.now(),
    data: { url: '/dashboard' },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      title = data.title || title;
      options = {
        ...options,
        ...(data.options || {}),
        body: data.body || options.body,
        icon: data.icon || options.icon,
        badge: data.badge || options.badge,
        tag: data.tag || options.tag,
        renotify: data.renotify !== undefined ? data.renotify : options.renotify,
        requireInteraction: data.requireInteraction !== undefined ? data.requireInteraction : options.requireInteraction,
        vibrate: data.vibrate || options.vibrate,
        data: data.data || options.data,
      };
    } catch {
      options.body = event.data.text();
    }
  }

  event.waitUntil(self.registration.showNotification(title, options));
});
