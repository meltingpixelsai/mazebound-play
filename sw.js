/* Mazebound service worker: cache-first for immutable assets, network-first for the shell. */
const STATIC_CACHE = 'mb-static-v1'
const CORE_CACHE = 'mb-core-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== location.origin) return

  if (/\/(tex|fonts|music|icons|assets|basis)\//.test(url.pathname)) {
    e.respondWith(
      caches.open(STATIC_CACHE).then(async (c) => {
        const hit = await c.match(req)
        if (hit) return hit
        const res = await fetch(req)
        if (res.ok) c.put(req, res.clone())
        return res
      }),
    )
  } else {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CORE_CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return res
        })
        .catch(() => caches.match(req).then((hit) => hit || Response.error())),
    )
  }
})
