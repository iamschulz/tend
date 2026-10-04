declare const self: ServiceWorkerGlobalScope

const VERSION: string = '__VERSION__'
const CACHE_NAME = `tend-${VERSION}`
const ASSETS: string[] = __ASSETS__

// Localized labels for the static manifest shortcuts, injected at build time from
// i18n/locales/*.json (key `search`), keyed by locale code.
const SHORTCUT_LABELS: Record<string, { search: string }> = __SHORTCUT_LABELS__

// idb-keyval's default database/store — where the app persists its Pinia state.
const IDB_NAME = 'keyval-store'
const IDB_STORE = 'keyval'

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
  const pathname = new URL(request.url).pathname

  // The connectivity probe must hit the network directly. If the SW wraps it,
  // the page-side fetch is shielded from real network failures and Playwright's
  // page.route() can't intercept the SW-originated request.
  if (pathname === '/api/health') return

  // Synthesize the web app manifest so its shortcuts reflect the user's
  // categories and language. The static file is only a fallback for browsers
  // that read the manifest before this handler is in control.
  if (pathname === '/manifest.webmanifest') {
    event.respondWith(buildManifest())
    return
  }

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

/**
 * Builds a manifest whose `shortcuts` are localized and augmented with the
 * user's visible categories (each deep-linking to `/?start=<id>` to begin a
 * timer). Reads categories and the active locale straight from IndexedDB.
 * Falls back to the static English shortcuts if anything is unavailable.
 */
async function buildManifest(): Promise<Response> {
  const cached = await caches.match('/manifest.webmanifest')
  const manifest = cached ? await cached.json() : {}

  let locale = 'en'
  let categories: Array<{ id: string; title: string; hidden?: boolean; activity?: { emoji?: string } }> = []
  let entries: Array<{ categoryId: string; start: number }> = []

  try {
    const storedLocale = await idbGet('tend-locale')
    if (typeof storedLocale === 'string' && storedLocale in SHORTCUT_LABELS) {
      locale = storedLocale
    }
    const rawCategories = await idbGet('tend-categories')
    if (typeof rawCategories === 'string') {
      categories = JSON.parse(rawCategories).categories ?? []
    }
    const rawEntries = await idbGet('tend-entries')
    if (typeof rawEntries === 'string') {
      entries = JSON.parse(rawEntries).entries ?? []
    }
  } catch {
    // Fall back to the static shortcuts below.
  }

  // Most recent entry start time per category, used to surface recently-used ones first.
  const lastUsed = new Map<string, number>()
  for (const entry of entries) {
    if (entry.start > (lastUsed.get(entry.categoryId) ?? 0)) {
      lastUsed.set(entry.categoryId, entry.start)
    }
  }

  const labels = SHORTCUT_LABELS[locale] ?? SHORTCUT_LABELS.en ?? { search: 'Search' }

  const shortcuts = [
    // "Today" is omitted — it's the app's start_url, so a shortcut would be redundant.
    { name: labels.search, url: '/search' },
    // Chrome surfaces only a handful of shortcuts, so show the most recently used
    // (never-used categories keep their original order, after the used ones).
    ...categories
      .filter((c) => !c.hidden)
      .sort((a, b) => (lastUsed.get(b.id) ?? 0) - (lastUsed.get(a.id) ?? 0))
      .slice(0, 4)
      .map((c) => ({
        name: c.activity?.emoji ? `${c.activity.emoji} ${c.title}` : c.title,
        url: `/?start=${c.id}`,
      })),
  ]

  return new Response(JSON.stringify({ ...manifest, shortcuts }), {
    headers: { 'Content-Type': 'application/manifest+json' },
  })
}

/**
 * Reads a single value from idb-keyval's store using the raw IndexedDB API
 * (idb-keyval itself can't be imported — the SW is transpiled, not bundled).
 * Mirrors idb-keyval's schema in `onupgradeneeded` so that if this open creates
 * the database, it still contains the expected object store.
 * @param key - The idb-keyval key to read
 */
function idbGet(key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(IDB_NAME)
    open.addEventListener('upgradeneeded', () => open.result.createObjectStore(IDB_STORE))
    open.addEventListener('error', () => reject(open.error))
    open.addEventListener('success', () => {
      const db = open.result
      try {
        const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key)
        req.addEventListener('success', () => { resolve(req.result); db.close() })
        req.addEventListener('error', () => { reject(req.error); db.close() })
      } catch (err) {
        db.close()
        reject(err)
      }
    })
  })
}
