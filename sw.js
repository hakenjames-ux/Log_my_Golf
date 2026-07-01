/* Log My Golf — service worker
   Strategy:
   - Navigations (the app shell): network-first, fall back to cached index.html
     when offline. Keeps users on the latest deploy when online; lets the app
     open offline once it has been visited.
   - App code (/js/, /css/): network-first with cache fallback — fresh when
     online, still works offline.
   - Icons/assets: cache-first (rarely change).
   - Supabase API and other cross-origin calls: never cached.
*/
const VERSION = 'lmg-v3';
const SHELL = `${VERSION}-shell`;
const STATIC = `${VERSION}-static`;

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/styles.css',
  '/js/config.js',
  '/js/boot.js',
  '/js/auth.js',
  '/js/rounds.js',
  '/js/courses.js',
  '/js/dashboard.js',
  '/js/stats.js',
  '/js/profile.js',
  '/js/social.js',
  '/js/share.js',
  '/js/reviews-weather.js',
  '/js/ui.js',
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
  if (url.origin !== self.location.origin) return;

  // App-shell navigations + app code (/js/, /css/): network-first, cache fallback.
  // Note: only the root navigation is cached under the '/index.html' shell key —
  // other pages (courses/*, privacy, terms) cache under their own URL so they
  // can't poison the offline app shell.
  const isAppCode = url.pathname.startsWith('/js/') || url.pathname.startsWith('/css/');
  if (request.mode === 'navigate' || isAppCode) {
    const isRoot = url.pathname === '/' || url.pathname === '/index.html';
    const cacheKey = request.mode === 'navigate' && isRoot ? '/index.html' : request;
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put(cacheKey, copy));
          return res;
        })
        .catch(() => caches.match(cacheKey).then((r) => r || caches.match('/index.html')))
    );
    return;
  }

  // Icons/assets: cache-first.
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
});
