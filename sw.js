const CACHE_NAME = 'orbita-pwa-v76';
const SUPABASE_SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/dist/umd/supabase.min.js';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './js/app_bootstrap.js',
  './js/core.js',
  './js/services.js',
  './js/pwa.js',
  './js/data.js',
  './js/game.js',
  './js/render.js',
  './js/gameplay_ui.js',
  './js/flappy_radical_patch.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

async function precacheAll(cache) {
  await cache.addAll(APP_SHELL);
  try {
    const sdkReq = new Request(SUPABASE_SDK_URL, { mode: 'cors', credentials: 'omit' });
    const sdkResp = await fetch(sdkReq);
    if (sdkResp && sdkResp.ok) {
      await cache.put(sdkReq, sdkResp.clone());
    }
  } catch (e) {
    // SDK precache failure is non-fatal; runtime cache-first will retry.
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => precacheAll(cache))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  if (url.href === SUPABASE_SDK_URL) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const network = fetch(req)
            .then(resp => {
              if (resp && resp.ok) {
                cache.put(req, resp.clone()).catch(() => {});
              }
              return resp;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  const isAppAsset =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.webmanifest') ||
    url.pathname === '/' ||
    url.pathname.endsWith('index.html');

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  if (isAppAsset) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(resp => {
          if (resp && resp.status === 200) {
            const copy = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);

      return cached || network;
    })
  );
});
