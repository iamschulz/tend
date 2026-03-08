/**
 * Local Nuxt module that turns the app into a PWA.
 *
 * - Injects the web app manifest and SW registration into every page
 * - After build, reads the SW template from service-worker/template.ts,
 *   replaces __VERSION__ and __ASSETS__ placeholders with real values,
 *   transpiles the TS via esbuild, and writes the final sw.js to the output
 */
import { defineNuxtModule, addDevServerHandler } from 'nuxt/kit'
import { defineEventHandler } from 'h3'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { createHash } from 'node:crypto'
import { transform } from 'esbuild'

export default defineNuxtModule({
  meta: { name: 'pwa' },

  /** @param _ - Module options (unused)
   *  @param nuxt - The Nuxt instance */
  setup(_, nuxt) {
    const head = nuxt.options.app.head

    head.link = head.link || []
    head.link.push({ rel: 'manifest', href: '/manifest.webmanifest' })

    head.script = head.script || []
    head.script.push({
      innerHTML: `if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js')}`,
      tagPosition: 'bodyClose',
    })

    // In dev, serve a no-op SW (caching would fight HMR)
    if (nuxt.options.dev) {
      addDevServerHandler({
        route: '/sw.js',
        handler: defineEventHandler(() =>
          new Response('self.addEventListener("fetch",()=>{})\n', {
            headers: { 'Content-Type': 'application/javascript' },
          })
        ),
      })
    }

    // After build, generate sw.js with the full asset list
    nuxt.hook('nitro:build:public-assets', async (nitro) => {
      const publicDir = nitro.options.output.publicDir

      const assets = collectFiles(publicDir)
        .map((file) => '/' + relative(publicDir, file))
        .sort()

      // Version = "<package.json version>-<8-char content hash>"
      const { version: pkgVersion } = JSON.parse(
        readFileSync(join(nuxt.options.rootDir, 'package.json'), 'utf-8'),
      )
      const hash = createHash('md5')
        .update(JSON.stringify(assets))
        .digest('hex')
        .slice(0, 8)
      const version = `${pkgVersion}-${hash}`

      // Read the TS template, inject computed values, transpile to JS
      const template = readFileSync(
        join(nuxt.options.rootDir, 'service-worker/template.ts'),
        'utf-8',
      )
      const injected = template
        .replace("'__VERSION__'", `'${version}'`)
        .replace('__ASSETS__', JSON.stringify(assets, null, 2))
      const { code } = await transform(injected, { loader: 'ts' })

      writeFileSync(join(publicDir, 'sw.js'), code)
      console.log(`[pwa] wrote sw.js (version: ${version}, ${assets.length} assets)`)

      // Inject font preload hints into HTML files.
      // @nuxt/fonts embeds @font-face rules in the CSS entry but doesn't add
      // <link rel="preload"> in static/generate mode, creating a request chain
      // (HTML → CSS → Fonts). Preloading collapses this into parallel requests.
      injectFontPreloads(publicDir)
    })
  },
})

/**
 * Scans the CSS entry for font URLs and injects <link rel="preload"> tags
 * into all HTML files so fonts load in parallel with CSS instead of after it.
 * @param publicDir - The build output public directory
 */
function injectFontPreloads(publicDir: string): void {
  const nuxtDir = join(publicDir, '_nuxt')
  const cssFile = readdirSync(nuxtDir).find(f => f.startsWith('entry.') && f.endsWith('.css'))
  if (!cssFile) return

  const css = readFileSync(join(nuxtDir, cssFile), 'utf-8')

  // Only preload Latin-subset woff2 fonts — these cover the primary character
  // range and are the ones the browser will fetch first. Preloading all subsets
  // would compete for bandwidth and hurt performance.
  const fontUrls = [...css.matchAll(/@font-face\{[^}]+\}/g)]
    .filter(m => m[0].includes('U+0000-00FF'))
    .flatMap(m => [...m[0].matchAll(/url\(\.\.(\/_fonts\/[^)]+\.woff2)\)/g)])
    .map(m => m[1]!)

  if (fontUrls.length === 0) return

  const preloadTags = fontUrls
    .map(url => `<link rel="preload" as="font" type="font/woff2" crossorigin href="${url}">`)
    .join('\n')

  const htmlFiles = collectFiles(publicDir).filter(f => f.endsWith('.html'))
  for (const file of htmlFiles) {
    const html = readFileSync(file, 'utf-8')
    writeFileSync(file, html.replace('</head>', `${preloadTags}\n</head>`))
  }
  console.log(`[pwa] injected ${fontUrls.length} font preload hints`)
}

/**
 * Recursively collect all file paths under a directory.
 * @param dir - The directory to scan
 */
function collectFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...collectFiles(full))
    } else {
      results.push(full)
    }
  }
  return results
}
