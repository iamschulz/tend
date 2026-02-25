declare const self: ServiceWorkerGlobalScope

const VERSION: string = '__VERSION__'
const CACHE_NAME = `tend-${VERSION}`
const ASSETS: string[] = __ASSETS__

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  )
})

self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('foo activate')
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('tend-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
})

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  console.log('foo request', request.url)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/200.html') as Promise<Response>)
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  )
})
