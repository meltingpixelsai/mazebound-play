/* Mazebound service worker.
 * - immutable assets (textures/fonts/icons/hashed bundles): cache-first
 * - music: network-first — slot files get REPLACED under the same names when
 *   new tracks land, and a cache-first strategy would freeze the old audio
 *   into every returning player forever
 * - shell: network-first with cache fallback (offline still boots)
 * Bump VERSION on strategy changes; activate prunes every older cache.
 */
const VERSION = 'v3'
const STATIC_CACHE = `mb-static-${VERSION}`
const CORE_CACHE = `mb-core-${VERSION}`

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n.startsWith('mb-') && n !== STATIC_CACHE && n !== CORE_CACHE).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

/* cache.put throws on partial (206) responses — iOS fetches media with Range
 * headers, so guard status AND skip caching ranged requests entirely. */
async function safePut(cacheName, req, res) {
  if (!res || res.status !== 200 || req.headers.has('range')) return
  try {
    const c = await caches.open(cacheName)
    await c.put(req, res.clone())
  } catch {
    /* quota or partial — playing on network is fine */
  }
}

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  if (/\/(tex|fonts|icons|assets|basis)\//.test(url.pathname)) {
    // immutable: cache-first
    e.respondWith(
      (async () => {
        const hit = await caches.match(req)
        if (hit) return hit
        const res = await fetch(req)
        await safePut(STATIC_CACHE, req, res)
        return res
      })(),
    )
  } else {
    // shell + music: network-first, cache fallback
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req)
          await safePut(CORE_CACHE, req, res)
          return res
        } catch {
          const hit = await caches.match(req)
          return hit || Response.error()
        }
      })(),
    )
  }
})
