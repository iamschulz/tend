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
import { addCategory, openMenu, quickClickTrigger } from './_helpers'

/** Open the Search details section in the menu (index 2: Select Day, Categories, Search, …). */
async function ensureSearchOpen(page: Page): Promise<void> {
    await page.evaluate(() => {
        const details = document.querySelectorAll('dialog.menu details')
        const searchDetails = details[2]
        if (searchDetails && !searchDetails.hasAttribute('open')) {
            searchDetails.querySelector('summary')?.click()
        }
    })
    await new Promise(r => setTimeout(r, 200))
}

/** Fill the menu search form and press Enter, then wait for /search to load. */
async function runSearchFromMenu(page: Page, query: string): Promise<void> {
    await openMenu(page)
    await ensureSearchOpen(page)
    await page.fill('#menu-search', query)
    await page.press('#menu-search', 'Enter')
    await page.waitForFunction(
        (q: string) =>
            window.location.pathname === '/search' &&
            new URLSearchParams(window.location.search).get('q') === q,
        query,
        { timeout: 5000 },
    )
    await page.waitForFunction(
        () => !document.querySelector('[data-loading]'),
        undefined,
        { timeout: 10_000 },
    )
}

/** Type and save a comment on an entry. Assumes we're on the day view with at least one entry. */
async function setEntryComment(page: Page, comment: string): Promise<void> {
    const entryId = await page.$eval('article.track', el => el.id.replace(/^e-/, ''))
    await navigateTo(page, `/entry/${entryId}`)
    await page.waitForSelector('textarea#comment', { timeout: 5000 })
    await page.click('textarea#comment')
    await page.type('textarea#comment', comment)
    // Entry store writes on each input change; allow Pinia/idb flush.
    await new Promise(r => setTimeout(r, 1200))
    await navigateTo(page, '/')
}

/** Type and save day notes for the current day. Assumes at least one entry exists. */
async function setDayNotes(page: Page, notes: string): Promise<void> {
    await page.waitForSelector('textarea[id^="day-notes-"]', { timeout: 5000 })
    await page.click('textarea[id^="day-notes-"]')
    await page.type('textarea[id^="day-notes-"]', notes)
    await new Promise(r => setTimeout(r, 1200))
}

describe('Search', () => {
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

    it('menu exposes a search section with an input and submit button', async () => {
        await openMenu(page)
        await ensureSearchOpen(page)
        const input = await page.$('#menu-search')
        expect(input).not.toBeNull()
        const submit = await page.$('dialog.menu form button[type="submit"]')
        expect(submit).not.toBeNull()
    })

    it('submitting navigates to /search with q/events/days query params', async () => {
        await addCategory(page, 'Meditation')
        await runSearchFromMenu(page, 'Med')

        const url = new URL(page.url())
        expect(url.pathname).toBe('/search')
        expect(url.searchParams.get('q')).toBe('Med')
        expect(url.searchParams.get('events')).toBe('1')
        expect(url.searchParams.get('days')).toBe('1')
    })

    it('empty query does not submit', async () => {
        await openMenu(page)
        await ensureSearchOpen(page)
        await page.click('#menu-search')
        await page.press('#menu-search', 'Enter')
        // Give the router time to act (it shouldn't)
        await new Promise(r => setTimeout(r, 300))
        expect(new URL(page.url()).pathname).not.toBe('/search')
    })

    it('finds entries by category title (case-insensitive)', async () => {
        await addCategory(page, 'Meditation')
        await quickClickTrigger(page, 0)

        await runSearchFromMenu(page, 'medit')

        await page.waitForSelector('section.search-results article.track', { timeout: 5000 })
        const count = (await page.$$('section.search-results article.track')).length
        expect(count).toBe(1)
        const text = await page.textContent('section.search-results article.track')
        expect(text).toContain('Meditation')
    })

    it('finds entries by entry comment', async () => {
        await addCategory(page, 'Reading')
        await quickClickTrigger(page, 0)
        await setEntryComment(page, 'finished chapter seven')

        await runSearchFromMenu(page, 'chapter')

        await page.waitForSelector('section.search-results article.track', { timeout: 5000 })
        const count = (await page.$$('section.search-results article.track')).length
        expect(count).toBe(1)
    })

    it('finds days by day notes', async () => {
        await addCategory(page, 'Running')
        await quickClickTrigger(page, 0)
        await setDayNotes(page, 'felt great today')

        await runSearchFromMenu(page, 'felt great')

        await page.waitForSelector('section.search-results article.day-card', { timeout: 5000 })
        const count = (await page.$$('section.search-results article.day-card')).length
        expect(count).toBe(1)
    })

    it('no-results message appears when nothing matches', async () => {
        await addCategory(page, 'Meditation')
        await quickClickTrigger(page, 0)

        await runSearchFromMenu(page, 'zzzzznomatch')

        const entries = await page.$$('section.search-results article')
        expect(entries.length).toBe(0)
        const text = await page.textContent('section.search-results')
        expect(text).toContain('No results')
    })

    it('pre-fills the form on /search from URL query params', async () => {
        await addCategory(page, 'Yoga')
        await runSearchFromMenu(page, 'yoga')

        const value = await page.$eval('#page-search', el => (el as HTMLInputElement).value)
        expect(value).toBe('yoga')

        // Both Events and Days checkboxes default to checked (query defaults)
        const checkboxes = await page.$$eval(
            'section.search-results form input[type="checkbox"]',
            els => els.map(el => (el as HTMLInputElement).checked),
        )
        expect(checkboxes).toEqual([true, true])
    })

    it('toggling the Days checkbox refreshes the search immediately', async () => {
        await addCategory(page, 'Walking')
        await quickClickTrigger(page, 0)
        await setDayNotes(page, 'peaceful walk')

        await runSearchFromMenu(page, 'peaceful')

        // Day result visible
        await page.waitForSelector('section.search-results article.day-card', { timeout: 5000 })
        expect((await page.$$('section.search-results article.day-card')).length).toBe(1)

        // Uncheck Days (second checkbox in the page form)
        const dayCheckboxes = await page.$$('section.search-results form input[type="checkbox"]')
        await dayCheckboxes[1]!.click()

        await page.waitForFunction(
            () => new URLSearchParams(window.location.search).get('days') === '0',
            undefined,
            { timeout: 5000 },
        )

        // Day card no longer shown
        const cards = await page.$$('section.search-results article.day-card')
        expect(cards.length).toBe(0)
    })

    it('toggling the Events checkbox excludes entry results', async () => {
        await addCategory(page, 'Stretching')
        await quickClickTrigger(page, 0)

        await runSearchFromMenu(page, 'stretch')

        // Entry result visible
        await page.waitForSelector('section.search-results article.track', { timeout: 5000 })
        expect((await page.$$('section.search-results article.track')).length).toBe(1)

        // Uncheck Events (first checkbox in the page form)
        const checkboxes = await page.$$('section.search-results form input[type="checkbox"]')
        await checkboxes[0]!.click()

        await page.waitForFunction(
            () => new URLSearchParams(window.location.search).get('events') === '0',
            undefined,
            { timeout: 5000 },
        )

        expect((await page.$$('section.search-results article.track')).length).toBe(0)
    })

    it('clicking an entry result navigates to /entry/:id', async () => {
        await addCategory(page, 'Journaling')
        await quickClickTrigger(page, 0)
        const entryId = await page.$eval('article.track', el => el.id.replace(/^e-/, ''))

        await runSearchFromMenu(page, 'Journal')

        await page.waitForSelector('section.search-results article.track a[data-card-link]', { timeout: 5000 })
        await page.click('section.search-results article.track a[data-card-link]')
        await page.waitForFunction(
            (id: string) => window.location.pathname === `/entry/${id}`,
            entryId,
            { timeout: 5000 },
        )
    })

    it('clicking a day result navigates to /day/:date', async () => {
        await addCategory(page, 'Yoga')
        await quickClickTrigger(page, 0)
        await setDayNotes(page, 'relaxed session')

        await runSearchFromMenu(page, 'relaxed')

        await page.waitForSelector('section.search-results article.day-card a[data-card-link]', { timeout: 5000 })
        await page.click('section.search-results article.day-card a[data-card-link]')
        await page.waitForFunction(
            () => /^\/day\/\d{4}-\d{2}-\d{2}$/.test(window.location.pathname),
            undefined,
            { timeout: 5000 },
        )
    })

    it('pagination nav is hidden when there are fewer than 50 results', async () => {
        await addCategory(page, 'Drinking water')
        await quickClickTrigger(page, 0)

        await runSearchFromMenu(page, 'water')

        await page.waitForSelector('section.search-results article.track', { timeout: 5000 })
        const nav = await page.$('section.search-results nav.pagination')
        expect(nav).toBeNull()
    })

    it('day notes are truncated with an ellipsis beyond the limit', async () => {
        await addCategory(page, 'Sketching')
        await quickClickTrigger(page, 0)
        const longNotes = 'MATCH ' + 'word '.repeat(40) // well over 50 chars
        await setDayNotes(page, longNotes)

        await runSearchFromMenu(page, 'MATCH')

        await page.waitForSelector('section.search-results article.day-card', { timeout: 5000 })
        const text = await page.textContent('section.search-results article.day-card')
        expect(text).toMatch(/…$|…\s*$/)
    })

    it('empty-query state is shown when navigating to /search directly without q', async () => {
        await navigateTo(page, '/search')
        await page.waitForFunction(
            () => !document.querySelector('[data-loading]'),
            undefined,
            { timeout: 10_000 },
        )
        const text = await page.textContent('section.search-results')
        expect(text?.toLowerCase()).toContain('search term')
    })
})
