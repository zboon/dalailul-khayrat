/* Offline support: caches the app shell and fonts on first visit,
   then serves everything from cache (works with no connection). */
const CACHE = 'dalail-v17'; // bump this (v2, v3…) whenever you update index.html
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        /* Cache same-origin successes AND opaque cross-origin responses.
           The Google Fonts stylesheet is fetched no-cors, so it comes back
           opaque with status 0 and resp.ok === false — without the opaque
           check it was never cached, and the Arabic font quietly fell back
           to a system font offline. */
        if (resp && (resp.ok || resp.type === 'opaque')) {
          const copy = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return resp;
      }).catch(() => {
        /* Only fall back to the app shell for page navigations. Handing back
           HTML for a stylesheet or font request just breaks it. */
        if (req.mode === 'navigate') return caches.match('./index.html');
        return Response.error();
      });
    })
  );
});
