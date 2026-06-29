/* Log My Golf — service worker
   Strategy:
   - Navigations (the app shell): network-first, fall back to cached index.html
     when offline. Keeps users on the latest deploy when online; lets the app
     open offline once it has been visited.
   - Static icons/manifest: cache-first.
   - Supabase API, fonts CSS, analytics: never cached (always go to network).
*/
const VERSION = 'lmg-v1';
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Supabase or other cross-origin API/data calls.
  if (url.hostname.endsWith('supabase.co')) return;

  // App-shell navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Local static assets (icons, manifest): cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/assets/'))) {
            const copy = res.clone();
            caches.open(STATIC).then((c) => c.put(request, copy));
          }
          return res;
        })
      )
    );
  }
});
