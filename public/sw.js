const CACHE = 'noct-shell-v4';
const BASE = new URL(self.registration.scope).pathname;

/* The app registers this worker with the crowd API origin, so a stopped API
   answers through the worker instead of failing in the page. */
const API_BASE = (() => {
  try {
    const raw = new URL(self.location.href).searchParams.get('api');
    return raw ? raw.replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
})();

function isCrowdRequest(url) {
  return Boolean(API_BASE) && (url.href === API_BASE || url.href.startsWith(`${API_BASE}/`));
}
const SHELL = [
  BASE,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  `${BASE}icon.svg`,
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (isCrowdRequest(url)) {
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-noct-device',
    };
    /* A preflight must still pass when the API is down, or the browser logs a
       CORS error before the answer is even attempted. */
    if (request.method === 'OPTIONS') {
      event.respondWith(new Response(null, { status: 204, headers: cors }));
      return;
    }
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(JSON.stringify({ offline: true }), {
            status: 200,
            headers: { ...cors, 'content-type': 'application/json' },
          }),
      ),
    );
    return;
  }

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // Never serve stale game state from a live server.
  if (url.pathname.startsWith(`${BASE}api/`)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(`${BASE}index.html`).then((r) => r ?? Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((res) => {
        if (res.ok && (url.pathname.startsWith(`${BASE}assets/`) || url.pathname.endsWith('.svg'))) {
          const copy = res.clone();
          void caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      });
    }),
  );
});
