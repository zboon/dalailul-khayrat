/* Offline support: caches the app shell and fonts on first visit.

   Navigations are NETWORK-FIRST: the app checks for a newer index.html when
   there is a connection, and falls back to the cache when there isn't. The
   old worker was cache-first for everything, which meant the ONLY way to
   ever see an update was for this file itself to change — so a deploy that
   missed sw.js froze the app permanently with no way out from the phone.
   Everything else (fonts, icons, manifest) stays cache-first: it's large,
   it doesn't change, and it's what makes the app work with no signal. */
const CACHE = 'dalail-v50'; // bump this whenever you update index.html
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

  /* The page itself: try the network, keep what comes back, fall back to the
     cache. A slow connection shouldn't mean a blank screen, so the network
     attempt gives up after 4 seconds and the cached shell is used instead. */
  if (req.mode === 'navigate') {
    e.respondWith(
      Promise.race([
        fetch(req).then(resp => {
          if (resp && resp.ok) {
            const copy = resp.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          }
          return resp;
        }),
        new Promise(res => setTimeout(() => res(null), 4000))
      ])
        .then(resp => resp || caches.match('./index.html'))
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

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
        /* Handing back HTML for a stylesheet or font request just breaks it. */
        return Response.error();
      });
    })
  );
});
