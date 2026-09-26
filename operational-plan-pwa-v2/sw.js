importScripts('./version.js');

const CACHE = 'operational-plan-pwa-v2-v' + (self.APP_VERSION || '2.1.0');
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './setup-wizard.css',
  './editor.css',
  './db.js',
  './academic-calendar.js',
  './setup-wizard.js',
  './editor.js',
  './print-adapter.js',
  './app.js',
  './version.js',
  './manifest.webmanifest',
  '../operational-plan-pwa/Cairo.ttf',
  '../operational-plan-pwa/icons/icon-192.png',
  '../operational-plan-pwa/icons/icon-512.png',
  '../operational-plan-pwa/icons/apple-touch-icon.png'
];

async function broadcastUpdate(payload) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: 'UPDATE_PROGRESS', version: self.APP_VERSION, ...payload });
  } catch (_) {}
}

function overallProgress(index, total, fraction = 0) {
  return Math.max(0, Math.min(100, Math.round(((index + fraction) / Math.max(1, total)) * 100)));
}

async function cacheAssetWithProgress(cache, asset, index, total) {
  const url = new URL(asset, self.registration.scope).href;
  await broadcastUpdate({ phase: 'downloading', asset, completed: index, total, progress: overallProgress(index, total) });
  const response = await fetch(new Request(url, { cache: 'reload' }));
  if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + asset);

  const length = Number(response.headers.get('content-length')) || 0;
  if (response.body && length > 0) {
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    let lastProgress = -1;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      const fraction = Math.min(1, received / length);
      const progress = overallProgress(index, total, fraction);
      if (progress !== lastProgress) {
        lastProgress = progress;
        await broadcastUpdate({ phase: 'downloading', asset, completed: index, total, progress, assetReceived: received, assetTotal: length });
      }
    }
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');
    await cache.put(url, new Response(new Blob(chunks), { status: response.status, statusText: response.statusText, headers }));
  } else {
    await cache.put(url, response.clone());
  }

  await broadcastUpdate({ phase: 'downloading', asset, completed: index + 1, total, progress: overallProgress(index + 1, total) });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await broadcastUpdate({ phase: 'start', completed: 0, total: APP_SHELL.length, progress: 0 });
    try {
      for (let i = 0; i < APP_SHELL.length; i += 1) {
        await cacheAssetWithProgress(cache, APP_SHELL[i], i, APP_SHELL.length);
      }
      await broadcastUpdate({ phase: 'installed', completed: APP_SHELL.length, total: APP_SHELL.length, progress: 100 });
      await self.skipWaiting();
    } catch (error) {
      await broadcastUpdate({ phase: 'error', asset: String(error?.message || ''), completed: 0, total: APP_SHELL.length, progress: 0 });
      throw error;
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await broadcastUpdate({ phase: 'activating', progress: 100 });
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE && key.startsWith('operational-plan-pwa-v2-'))
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
    await broadcastUpdate({ phase: 'activated', progress: 100 });
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.pathname.endsWith('/version.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(() => caches.match(new URL('./version.js', self.registration.scope).href))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(new URL('./index.html', self.registration.scope).href, copy));
          }
          return response;
        })
        .catch(() => caches.match(new URL('./index.html', self.registration.scope).href))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request).then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }))
    );
  }
});
