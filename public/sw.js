const CACHE_NAME = 'psiflux-v4';
const STATIC_ASSETS = ['/', '/index.html', '/app_psiflux.png', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // Nunca interceptar estas rotas — deixa ir direto para a rede
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/uploads-static/') ||
    url.pathname.startsWith('/@vite/') ||
    url.pathname.startsWith('/node_modules/') ||
    url.pathname.startsWith('/sala/') ||
    url.pathname === '/sala' ||
    url.pathname === '/sw.js'
  ) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', clone));
          }
          return response;
        })
        .catch(() => caches.match('/index.html').then(r => r || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
      );
    })
  );
});

// ── Web Push — usado hoje pelo Portal do Paciente (lembrete de sessão,
// confirmação de presença, avisos de falta/pagamento). O payload sempre
// chega como JSON: { title, body, data }.
self.addEventListener('push', (event) => {
  let payload = { title: 'Plaelo', body: 'Você tem uma nova notificação.', data: {} };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {}

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/app_plaelo.png',
      badge: '/app_plaelo.png',
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || '/portal/inicio';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetPath));
      if (existing) return existing.focus();
      const client = clients[0];
      if (client) { client.focus(); return client.navigate(targetPath); }
      return self.clients.openWindow(targetPath);
    })
  );
});
