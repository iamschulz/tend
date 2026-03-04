import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
    startServer,
    stopServer,
    launchBrowser,
    closeBrowser,
    getPage,
    navigateTo,
} from './_setup'
import { addCategory, quickClickTrigger, holdTrigger } from './_helpers'

describe('Entry detail page', () => {
    let page: Page

    beforeAll(async () => {
        await startServer()
        await launchBrowser()
    })

    afterAll(async () => {
        await closeBrowser()
        stopServer()
    })

    beforeEach(async () => {
        page = await getPage('/')
    })

    afterEach(async () => {
        await page.close()
    })

    /** Create a quick entry and navigate to its detail page. Returns the entry UUID. */
    async function createAndOpenEntry(categoryName = 'TestCat'): Promise<string> {
        await addCategory(page, categoryName)
        await quickClickTrigger(page)

        // Click the entry card link to navigate to the entry detail page
        const link = await page.$('article.track a[data-card-link]')
        expect(link).not.toBeNull()
        const href = await link!.getAttribute('href')
        expect(href).toMatch(/\/entry\//)

        await link!.click()
        await page.waitForFunction(
            () => window.location.pathname.startsWith('/entry/'),
            undefined,
            { timeout: 5000 },
        )
        await page.waitForSelector('[data-card] header', { timeout: 5000 })

        return href!.replace('/entry/', '')
    }

    it('displays the category title and emoji', async () => {
        await createAndOpenEntry('Meditation')

        const title = await page.$eval('[data-card] .title', el => el.textContent?.trim())
        expect(title).toBe('Meditation')

        const emoji = await page.$eval('[data-card] .icon', el => el.textContent?.trim())
        expect(emoji).toBeTruthy()
    })

    it('shows the started datetime input', async () => {
        await createAndOpenEntry()

        const startInput = await page.$('[data-card] .controls input[type="datetime-local"]')
        expect(startInput).not.toBeNull()

        const value = await startInput!.inputValue()
        // Should be a valid datetime-local string (YYYY-MM-DDThh:mm)
        expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    })

    it('shows the stopped datetime input for a non-running entry', async () => {
        await createAndOpenEntry()

        // Quick-click creates a stopped entry (start === end), so the stopped input should be visible
        const inputs = await page.$$('[data-card] .controls input[type="datetime-local"]')
        expect(inputs.length).toBe(2)
    })

    it('shows the stop button for a running entry', async () => {
        await addCategory(page, 'RunCat')
        await holdTrigger(page)

        // Navigate to the running entry
        const link = await page.$('article.track a[data-card-link]')
        expect(link).not.toBeNull()
        await link!.click()
        await page.waitForFunction(
            () => window.location.pathname.startsWith('/entry/'),
            undefined,
            { timeout: 5000 },
        )
        await page.waitForSelector('[data-card] header', { timeout: 5000 })

        // Should show exactly one datetime input (started) and the stop button
        const inputs = await page.$$('[data-card] .controls input[type="datetime-local"]')
        expect(inputs.length).toBe(1)

        const stopBtn = await page.$('[data-card] .controls button[data-variant="primary"]')
        expect(stopBtn).not.toBeNull()
    })

    it('stop button stops the running entry and reveals ended input', async () => {
        await addCategory(page, 'StopCat')
        await holdTrigger(page)

        const link = await page.$('article.track a[data-card-link]')
        await link!.click()
        await page.waitForFunction(
            () => window.location.pathname.startsWith('/entry/'),
            undefined,
            { timeout: 5000 },
        )
        await page.waitForSelector('[data-card] .controls button[data-variant="primary"]', { timeout: 5000 })

        // Click stop
        await page.click('[data-card] .controls button[data-variant="primary"]')

        // The stopped input should now appear (2 datetime inputs)
        await page.waitForFunction(
            () => document.querySelectorAll('[data-card] .controls input[type="datetime-local"]').length === 2,
            undefined,
            { timeout: 5000 },
        )
        const inputs = await page.$$('[data-card] .controls input[type="datetime-local"]')
        expect(inputs.length).toBe(2)
    })

    it('notes textarea persists comment', async () => {
        await createAndOpenEntry('NoteCat')

        const textarea = await page.$('[data-card] textarea#comment')
        expect(textarea).not.toBeNull()

        await textarea!.fill('My test note')

        // Navigate away and back to verify persistence
        const entryPath = new URL(page.url()).pathname
        await navigateTo(page, '/')
        await navigateTo(page, entryPath)
        await page.waitForSelector('[data-card] textarea#comment', { timeout: 5000 })

        const value = await page.$eval('[data-card] textarea#comment', el => (el as HTMLTextAreaElement).value)
        expect(value).toBe('My test note')
    })

    it('delete button removes entry and navigates home', async () => {
        await createAndOpenEntry('DeleteCat')

        // Click delete
        await page.click('[data-card] header button')

        // Confirm the dialog
        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })
        await page.click('dialog.confirm-dialog button[data-variant="primary"]')

        // Should navigate back to home
        await page.waitForFunction(
            () => window.location.pathname === '/',
            undefined,
            { timeout: 5000 },
        )
        expect(page.url()).toMatch(/\/$/)
    })

    it('invalid uuid shows error notice', async () => {
        await navigateTo(page, '/entry/nonexistent-uuid')

        const error = await page.$('[data-card]')
        // No entry card should be shown
        expect(error).toBeNull()
    })

    it('page title contains category name', async () => {
        await createAndOpenEntry('TitleCat')

        const title = await page.title()
        expect(title).toContain('TitleCat')
    })

    it('changing start date persists the new value', async () => {
        await createAndOpenEntry('StartEdit')

        const startInput = await page.$('[data-card] .controls input[type="datetime-local"]')
        expect(startInput).not.toBeNull()

        // Set a specific date
        await startInput!.fill('2025-06-15T10:30')

        // Wait for reactivity
        await new Promise(r => setTimeout(r, 300))

        // Navigate away and back
        const entryPath = new URL(page.url()).pathname
        await navigateTo(page, '/')
        await navigateTo(page, entryPath)
        await page.waitForSelector('[data-card] .controls input[type="datetime-local"]', { timeout: 5000 })

        const value = await page.$eval(
            '[data-card] .controls input[type="datetime-local"]',
            el => (el as HTMLInputElement).value,
        )
        expect(value).toBe('2025-06-15T10:30')
    })
})
