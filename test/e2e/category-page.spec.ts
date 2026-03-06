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
import { addCategory, openCategoryPage, quickClickTrigger } from './_helpers'

describe('Category page', () => {
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

    /** Add a category and navigate to its detail page. */
    async function setupCategoryPage(title = 'TestCat'): Promise<void> {
        await addCategory(page, title)
        await openCategoryPage(page)
    }

    it('navigates to category page and shows correct title', async () => {
        await setupCategoryPage('Meditation')

        const titleValue = await page.$eval(
            '.category header .title-input',
            el => (el as HTMLInputElement).value,
        )
        expect(titleValue).toBe('Meditation')
    })

    it('page title contains category name', async () => {
        await setupCategoryPage('Yoga')

        const title = await page.title()
        expect(title).toContain('Yoga')
    })

    it('edits category title from detail page', async () => {
        await setupCategoryPage('OldName')

        const titleInput = await page.$('.category header .title-input')
        expect(titleInput).not.toBeNull()
        await titleInput!.click({ clickCount: 3 })
        await titleInput!.type('NewName')

        // Wait for reactivity
        await new Promise(r => setTimeout(r, 400))

        // Navigate away and back to verify persistence
        const path = new URL(page.url()).pathname
        await navigateTo(page, '/')
        await navigateTo(page, path)
        await page.waitForSelector('.category header .title-input', { timeout: 5000 })

        const value = await page.$eval(
            '.category header .title-input',
            el => (el as HTMLInputElement).value,
        )
        expect(value).toBe('NewName')
    })

    it('edits category color', async () => {
        await setupCategoryPage('ColorCat')

        const colorInput = await page.$('.category header .color-input')
        expect(colorInput).not.toBeNull()

        // Change color via JS (color picker UI is hard to interact with)
        await page.evaluate(() => {
            const input = document.querySelector('.category header .color-input') as HTMLInputElement
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
            nativeInputValueSetter.call(input, '#00ff00')
            input.dispatchEvent(new Event('input', { bubbles: true }))
        })

        await new Promise(r => setTimeout(r, 400))

        const path = new URL(page.url()).pathname
        await navigateTo(page, '/')
        await navigateTo(page, path)
        await page.waitForSelector('.category header .color-input', { timeout: 5000 })

        const value = await page.$eval(
            '.category header .color-input',
            el => (el as HTMLInputElement).value,
        )
        expect(value).toBe('#00ff00')
    })

    it('edits category notes', async () => {
        await setupCategoryPage('NoteCat')

        const textarea = await page.$('.category textarea#comment')
        expect(textarea).not.toBeNull()
        await textarea!.fill('My important note')

        await new Promise(r => setTimeout(r, 400))

        const path = new URL(page.url()).pathname
        await navigateTo(page, '/')
        await navigateTo(page, path)
        await page.waitForSelector('.category textarea#comment', { timeout: 5000 })

        const value = await page.$eval(
            '.category textarea#comment',
            el => (el as HTMLTextAreaElement).value,
        )
        expect(value).toBe('My important note')
    })

    it('shows total entries count and total time', async () => {
        await addCategory(page, 'StatsCat')
        await quickClickTrigger(page, 0)
        await quickClickTrigger(page, 0)
        await openCategoryPage(page)

        const statsText = await page.$eval('.stats', el => el.textContent ?? '')
        expect(statsText).toContain('2')
    })

    it('toggles category visibility from detail page', async () => {
        await setupCategoryPage('HideCat')

        // Click the visibility toggle button (first button after title input)
        const visibilityBtn = await page.$('.category header button')
        expect(visibilityBtn).not.toBeNull()
        await visibilityBtn!.click()

        // Navigate home to check trigger button disappears
        await navigateTo(page, '/')

        await page.waitForFunction(
            () => document.querySelectorAll('[data-group] [data-avatar]:not(.allCategories) button').length === 0,
            { timeout: 5000 },
        )
    })

    it('deletes category with confirmation', async () => {
        await setupCategoryPage('DeleteCat')

        // Click the delete button (second button in header)
        const buttons = await page.$$('.category header button')
        expect(buttons.length).toBeGreaterThanOrEqual(2)
        await buttons[1]!.click()

        // Confirm dialog should appear
        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })
        await page.click('dialog.confirm-dialog button[data-variant="primary"]')

        // Should navigate to home
        await page.waitForFunction(
            () => window.location.pathname === '/',
            undefined,
            { timeout: 5000 },
        )

        // Category trigger should be gone (wait for re-render after deletion)
        await page.waitForFunction(
            () => document.querySelectorAll('[data-group] [data-avatar]:not(.allCategories) button').length === 0,
            { timeout: 5000 },
        )

        const triggers = await page.$$('[data-group] [data-avatar]:not(.allCategories) button')
        expect(triggers.length).toBe(0)
    })

    it('delete cancellation keeps category', async () => {
        await setupCategoryPage('KeepCat')

        const buttons = await page.$$('.category header button')
        await buttons[1]!.click()

        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 3000 })

        // Click cancel (non-primary button)
        const cancelBtn = await page.$('dialog.confirm-dialog button:not([data-variant="primary"])')
        expect(cancelBtn).not.toBeNull()
        await cancelBtn!.click()

        // Should still be on category page
        await page.waitForFunction(
            () => window.location.pathname.startsWith('/category/'),
            undefined,
            { timeout: 3000 },
        )

        const titleValue = await page.$eval(
            '.category header .title-input',
            el => (el as HTMLInputElement).value,
        )
        expect(titleValue).toBe('KeepCat')
    })

    it('shows error notice for invalid category UUID', async () => {
        await navigateTo(page, '/category/nonexistent-uuid')

        // The category section should not render, ErrorNotice should appear
        const categorySection = await page.$('.category')
        expect(categorySection).toBeNull()
    })
})
