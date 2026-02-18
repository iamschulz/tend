import { type ChildProcess, spawn } from 'node:child_process'
import { createServer } from 'node:net'
import puppeteer, { type Browser, type Page } from 'puppeteer'

let browser: Browser | null = null
let serverProcess: ChildProcess | null = null
let baseUrl = ''

/** Find a free port by binding to 0 and releasing. */
async function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = createServer()
    srv.listen(0, () => {
      const addr = srv.address()
      if (addr && typeof addr === 'object') {
        const port = addr.port
        srv.close(() => resolve(port))
      } else {
        reject(new Error('Could not get port'))
      }
    })
  })
}

/** Start nuxt preview server on a random port. Resolves once the server is listening. */
export async function startServer(): Promise<string> {
  const port = await getFreePort()
  baseUrl = `http://localhost:${port}`

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['nuxt', 'preview', '--port', String(port)], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', NUXT_TELEMETRY_DISABLED: '1' },
    })

    serverProcess = child

    let resolved = false
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true
        reject(new Error('Server start timed out'))
      }
    }, 20_000)

    const onData = (chunk: Buffer) => {
      const text = chunk.toString()
      if (!resolved && (text.includes(`localhost:${port}`) || text.includes('Listening on') || text.includes('Local:'))) {
        resolved = true
        clearTimeout(timeout)
        setTimeout(() => resolve(baseUrl), 500)
      }
    }

    child.stdout?.on('data', onData)
    child.stderr?.on('data', onData)

    child.on('error', (err) => {
      if (!resolved) {
        resolved = true
        clearTimeout(timeout)
        reject(err)
      }
    })
  })
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
}

export async function launchBrowser(): Promise<Browser> {
  browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  return browser
}

export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close()
    browser = null
  }
}

/**
 * Get a new page with clean state, navigate to path, and wait for Nuxt hydration.
 * Uses CDP to clear all site storage before navigation, ensuring no state leaks
 * between tests (prevents pinia-plugin-persistedstate from restoring stale data).
 */
export async function getPage(path: string): Promise<Page> {
  if (!browser) throw new Error('Browser not launched')
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  // Force English locale for consistent test assertions
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en' })

  // Use CDP to clear all storage for the origin BEFORE navigating
  const client = await page.createCDPSession()
  await client.send('Storage.clearDataForOrigin', {
    origin: baseUrl,
    storageTypes: 'local_storage,session_storage,cookies',
  })
  await client.detach()

  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle0' })
  // Wait for Nuxt hydration
  await page.waitForFunction(() => !document.querySelector('[data-loading]'), { timeout: 10_000 })
  return page
}

/** Navigate to a path and wait for hydration. Reuses the existing page. */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle0' })
  await page.waitForFunction(() => !document.querySelector('[data-loading]'), { timeout: 10_000 })
}

/** Open the Categories details section in the menu (it may be closed). */
export async function ensureCategoriesOpen(page: Page): Promise<void> {
  const isVisible = await page.evaluate(() => {
    const details = document.querySelectorAll('dialog.menu details')
    const categoriesDetails = details[1]
    return categoriesDetails?.hasAttribute('open') ?? false
  })
  if (!isVisible) {
    const summaries = await page.$$('dialog.menu details summary')
    if (summaries[1]) {
      await summaries[1].click()
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}

/** Open the Select Day details section in the menu. */
export async function ensureSelectDayOpen(page: Page): Promise<void> {
  const isVisible = await page.evaluate(() => {
    const details = document.querySelectorAll('dialog.menu details')
    const selectDayDetails = details[0]
    return selectDayDetails?.hasAttribute('open') ?? false
  })
  if (!isVisible) {
    const summaries = await page.$$('dialog.menu details summary')
    if (summaries[0]) {
      await summaries[0].click()
      await new Promise((r) => setTimeout(r, 300))
    }
  }
}

export function getBaseUrl(): string {
  return baseUrl
}
