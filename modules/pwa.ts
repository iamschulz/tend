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
    })
  },
})

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
