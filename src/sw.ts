/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// ponytail: plain Cache API instead of workbox-precaching. The cache name changes with any
// file revision, so every deploy re-downloads the whole shell (about 1 MB by Phase 3). Switch to
// workbox-precaching if per-file updates ever matter.
const manifest = self.__WB_MANIFEST;
const CACHE = `shell-${hash(JSON.stringify(manifest))}`;
// Cloudflare redirects /index.html to /: a cached redirect breaks navigations on iOS,
// so cache the shell under "/".
const SHELL = '/';
const urls = manifest.map(({ url }) =>
  url === 'index.html' ? SHELL : `/${url.replace(/^\//, '')}`,
);

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(urls.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Sent by useRegisterSW().updateServiceWorker() when the user taps "Aggiorna".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request.mode === 'navigate' ? SHELL : request, {
        ignoreSearch: request.mode === 'navigate',
        ignoreVary: true, // vite preview sends Vary: Origin; crossorigin assets carry an Origin the stored copy lacks
      });
      return cached ?? fetch(request);
    })(),
  );
});

// Every push must show a notification, or Safari may revoke the subscription (SPEC §7.2).
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    // Not JSON: show the default text.
  }
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Recupero finito', {
      body: data.body ?? '',
      tag: 'rest-timer',
      icon: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const [client] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (client) await client.focus();
      else await self.clients.openWindow('/');
    })(),
  );
});

export {};
