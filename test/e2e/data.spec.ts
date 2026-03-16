import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
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
    })

    afterEach(async () => {
        await page.close()
        fs.rmSync(downloadDir, { recursive: true, force: true })
    })

    /** Open the settings details section and click Export, returning the downloaded file path. */
    async function clickExport(): Promise<string> {
        await openMenu(page)

        // Open the settings details section (last one)
        await page.evaluate(() => {
            const details = document.querySelectorAll('dialog.menu details')
            const dataDetails = details[2]
            if (dataDetails && !dataDetails.hasAttribute('open')) {
                dataDetails.querySelector('summary')?.click()
            }
        })
        await new Promise(r => setTimeout(r, 300))

        // Set up download listener before triggering
        const downloadPromise = page.waitForEvent('download')

        // Click the Export button
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('dialog.menu details:nth-of-type(3) button')
            const exportBtn = Array.from(buttons).find(b => b.textContent?.trim() === 'Export')
            if (exportBtn) (exportBtn as HTMLElement).click()
        })

        const download = await downloadPromise
        const dest = path.join(downloadDir, download.suggestedFilename())
        await download.saveAs(dest)
        return dest
    }

    it('exports data with a category', async () => {
        await addCategory(page, 'Meditation')
        const filePath = await clickExport()

        expect(filePath).toMatch(/\.tend\.json$/)

        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        expect(content).toHaveProperty('categories')
        expect(content.categories).toHaveLength(1)
        expect(content.categories[0].title).toBe('Meditation')
    })

    it('import then export round-trip passes validation', async () => {
        const seedData = generateSeedData()
        // Nest entries into categories for import-compatible format
        const nested = {
            categories: seedData.categories.map(cat => ({
                ...cat,
                entries: seedData.entries.filter(e => e.categoryId === cat.id),
            })),
        }
        const seedJson = JSON.stringify(nested)

        // Import seed data via the file input
        await openMenu(page)

        // Open the Settings details section
        await page.evaluate(() => {
            const details = document.querySelectorAll('dialog.menu details')
            const dataDetails = details[2]
            if (dataDetails && !dataDetails.hasAttribute('open')) {
                dataDetails.querySelector('summary')?.click()
            }
        })
        await new Promise(r => setTimeout(r, 300))

        // Upload seed data via the hidden file input
        const fileInput = await page.$('dialog.menu details:nth-of-type(3) input[type="file"]')
        expect(fileInput).not.toBeNull()

        // Write seed data to a temp file for upload
        const seedFile = path.join(downloadDir, 'seed.json')
        fs.writeFileSync(seedFile, seedJson)

        await fileInput!.setInputFiles(seedFile)

        // Confirm the import dialog
        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 5000 })
        await page.click('dialog.confirm-dialog button[data-variant="primary"]')
        await page.waitForFunction(
            () => !document.querySelector('dialog.confirm-dialog[open]'),
            undefined,
            { timeout: 5000 },
        )

        // Now export
        const filePath = await clickExport()

        const exported = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        expect(exported).toHaveProperty('categories')
        expect(Array.isArray(exported.categories)).toBe(true)
        expect(exported.categories.length).toBe(seedData.categories.length)

        // Verify it passes the same validation used by import
        const { validateImportData } = await import('../../app/util/validateImportData')
        expect(validateImportData(exported)).toBe(true)
    })
})
