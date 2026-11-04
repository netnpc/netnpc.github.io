/*
 * Service worker: makes every update visible on the next reload instead of
 * up to 10 minutes later.
 *
 * GitHub Pages serves everything with `cache-control: max-age=600`. The build
 * hook rewrites the `?v=` stamp on the JS files on every commit, which busts
 * the cache of the JS itself -- but the stamp lives inside index.html, and the
 * URL of index.html never changes, so the browser can keep running the old
 * page (and therefore the old stamp, and therefore the old JS) for those ten
 * minutes. A service worker closes that gap:
 *
 *   - Navigation requests (the page itself) go network-first: the freshest
 *     index.html wins whenever the network answers, so a new deployment is
 *     picked up on the very next reload. The cache is only consulted when the
 *     network is unreachable, which doubles as offline support.
 *   - Everything else (JS modules, CSS, textures) is cache-first: those URLs
 *     already carry the ?v= build stamp, so a changed build means a changed
 *     URL and the old entry can never be served by mistake. This keeps
 *     reloads instant and the game playable offline once visited.
 */

const CACHE = 'zerostrike-v1';

self.addEventListener('install', (e) => {
  // The page itself is precached so a first-visit offline reload still works;
  // everything else lands in the cache as it is fetched.
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/index.html'])));
  // Take over from any previous worker immediately instead of waiting for all
  // tabs to close -- otherwise an old worker could serve an old page.
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    // Drop caches from older versions of this worker
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    // Claim existing tabs so the new strategies apply without a second reload
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // The page: always try the network first, cache as a fallback for offline.
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put('/', fresh.clone());
        return fresh;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('/')) || (await cache.match('/index.html')) || Response.error();
      }
    })());
    return;
  }

  // Versioned assets (?v=...) and everything else: cache-first. The URL
  // changes with every build, so a cache hit is always the correct version.
  e.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    const fresh = await fetch(req);
    // Only cache same-origin responses that actually succeeded; opaque and
    // error responses are left alone.
    if (fresh.ok && new URL(req.url).origin === self.location.origin) {
      const cache = await caches.open(CACHE);
      cache.put(req, fresh.clone());
    }
    return fresh;
  })());
});
