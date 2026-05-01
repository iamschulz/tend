declare const self: ServiceWorkerGlobalScope

const VERSION: string = '__VERSION__'
const CACHE_NAME = `tend-${VERSION}`
const ASSETS: string[] = __ASSETS__

self.addEventListener('install', (event: ExtendableEvent) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('tend-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event

  // The connectivity probe must hit the network directly. If the SW wraps it,
  // the page-side fetch is shielded from real network failures and Playwright's
  // page.route() can't intercept the SW-originated request.
  if (new URL(request.url).pathname === '/api/health') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((cached) =>
          cached || new Response('You are offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      )
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
