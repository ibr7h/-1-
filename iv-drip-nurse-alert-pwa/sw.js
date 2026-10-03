const VERSION = 'iv-drip-nurse-alert-v1.0.0';
const APP_CACHE = `${VERSION}-app`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(APP_CACHE);
    await cache.addAll(APP_SHELL);
    try {
      const request = new Request('https://cdn.tailwindcss.com', { mode: 'no-cors' });
      const response = await fetch(request);
      await cache.put(request, response);
    } catch (_) {}
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => ![APP_CACHE, RUNTIME_CACHE].includes(key)).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(APP_CACHE);
        cache.put('./index.html', fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        return (await caches.match('./index.html')) || (await caches.match('./offline.html'));
      }
    })());
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request).then(async response => {
        if (response && response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      }).catch(() => null);
      return cached || (await networkPromise) || Response.error();
    })());
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      const networkPromise = fetch(request).then(async response => {
        const cache = await caches.open(RUNTIME_CACHE);
        cache.put(request, response.clone()).catch(() => {});
        return response;
      }).catch(() => null);
      return cached || (await networkPromise) || Response.error();
    })());
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || './';
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(targetUrl);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});