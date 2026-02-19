import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'puppeteer'
import {
    startServer,
    stopServer,
    launchBrowser,
    closeBrowser,
    getPage,
} from './_setup'
import { addCategory, openMenu } from './_helpers'
import { generateSeedData } from '../../scripts/generate-seed-data'

describe('Data export', () => {
    let page: Page
    let downloadDir: string

    beforeAll(async () => {
        await startServer()
        await launchBrowser()
    })

    afterAll(async () => {
        await closeBrowser()
        stopServer()
    })

    beforeEach(async () => {
        downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tend-export-'))
        page = await getPage('/')

        // Configure CDP to download files to temp directory
        const client = await page.createCDPSession()
        await client.send('Browser.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadDir,
        })
    })

    afterEach(async () => {
        await page.close()
        fs.rmSync(downloadDir, { recursive: true, force: true })
    })

    /** Wait for a .tend.json file to appear in the download directory. */
    async function waitForDownload(timeout = 5000): Promise<string> {
        const start = Date.now()
        while (Date.now() - start < timeout) {
            const files = fs.readdirSync(downloadDir).filter(f => f.endsWith('.tend.json'))
            if (files.length > 0) {
                return path.join(downloadDir, files[0]!)
            }
            await new Promise(r => setTimeout(r, 200))
        }
        throw new Error('Download timed out')
    }

    /** Open the Data details section and click Export. */
    async function clickExport(): Promise<void> {
        await openMenu(page)

        // Open the Data details section (last one)
        await page.evaluate(() => {
            const details = document.querySelectorAll('dialog.menu details')
            const dataDetails = details[details.length - 1]
            if (dataDetails && !dataDetails.hasAttribute('open')) {
                dataDetails.querySelector('summary')?.click()
            }
        })
        await new Promise(r => setTimeout(r, 300))

        // Click the Export button (second button in the Data section)
        const exportBtn = await page.evaluateHandle(() => {
            const buttons = document.querySelectorAll('dialog.menu details:last-of-type button')
            return Array.from(buttons).find(b => b.textContent?.trim() === 'Export') ?? null
        })
        expect(exportBtn).not.toBeNull()
        await (exportBtn as import('puppeteer').ElementHandle<HTMLButtonElement>).click()
    }

    it('exports data with a category', async () => {
        await addCategory(page, 'Meditation')
        await clickExport()

        const filePath = await waitForDownload()
        expect(filePath).toMatch(/\.tend\.json$/)

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        expect(content).toHaveProperty('categories')
        expect(content.categories).toHaveLength(1)
        expect(content.categories[0].title).toBe('Meditation')
    })

    it('import then export round-trip passes validation', async () => {
        const seedData = generateSeedData()
        const seedJson = JSON.stringify(seedData)

        // Import seed data via the file input
        await openMenu(page)

        // Open the Data details section
        await page.evaluate(() => {
            const details = document.querySelectorAll('dialog.menu details')
            const dataDetails = details[details.length - 1]
            if (dataDetails && !dataDetails.hasAttribute('open')) {
                dataDetails.querySelector('summary')?.click()
            }
        })
        await new Promise(r => setTimeout(r, 300))

        // Upload seed data via the hidden file input
        const fileInput = await page.$('dialog.menu details:last-of-type input[type="file"]')
        expect(fileInput).not.toBeNull()

        // Write seed data to a temp file for upload
        const seedFile = path.join(downloadDir, 'seed.json')
        fs.writeFileSync(seedFile, seedJson)

        const input = fileInput as import('puppeteer').ElementHandle<HTMLInputElement>
        await input.uploadFile(seedFile)

        // Confirm the import dialog
        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 5000 })
        await page.click('dialog.confirm-dialog button[data-variant="primary"]')
        await page.waitForFunction(
            () => !document.querySelector('dialog.confirm-dialog[open]'),
            { timeout: 5000 },
        )

        // Now export
        await clickExport()

        const filePath = await waitForDownload()
        const exported = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        expect(exported).toHaveProperty('categories')
        expect(Array.isArray(exported.categories)).toBe(true)
        expect(exported.categories.length).toBe(seedData.categories.length)

        // Verify it passes the same validation used by import
        const { validateImportData } = await import('../../app/util/validateImportData')
        expect(validateImportData(exported)).toBe(true)
    })
})
