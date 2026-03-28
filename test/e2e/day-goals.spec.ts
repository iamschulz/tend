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
import { addCategory, openCategoryPage, quickClickTrigger, holdTrigger } from './_helpers'

/** Submit the goal form on the category detail page. */
async function addGoal(
    page: Page,
    { count = 3, unit = 'event', interval = 'day' } = {},
): Promise<void> {
    const countInput = await page.$('.goal-form input[type="number"]')
    expect(countInput).not.toBeNull()
    await countInput!.click({ clickCount: 3 })
    await countInput!.type(String(count))

    if (unit !== 'event') {
        await page.selectOption('.goal-form select[aria-label]', { value: unit })
    }

    const selects = await page.$$('.goal-form select')
    if (selects.length >= 2 && interval !== 'week') {
        await selects[1]!.selectOption({ value: interval })
    }

    await page.click('.goal-form button[type="submit"]')
    await page.waitForSelector('.goal-item', { timeout: 5000 })
}

/** Create a category, navigate to its page, add a daily goal, then return home. */
async function setupDailyGoal(
    page: Page,
    title: string,
    { count = 3, unit = 'event' }: { count?: number; unit?: string } = {},
): Promise<void> {
    await addCategory(page, title)
    await openCategoryPage(page)
    await addGoal(page, { count, unit, interval: 'day' })
    await navigateTo(page, '/')
}

describe('Day Goals', () => {
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

    it('does not show day-goals section when no goals exist', async () => {
        await addCategory(page, 'NoGoals')

        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).toBeNull()
    })

    it('shows day-goals section when a daily goal exists', async () => {
        await setupDailyGoal(page, 'DailyTask', { count: 3 })

        await page.waitForSelector('.day-goals', { timeout: 5000 })
        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).not.toBeNull()
    })

    it('displays the "Your Goals for" heading with day label', async () => {
        await setupDailyGoal(page, 'HeadingTest')

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        const heading = await page.$eval('.day-goals', el => {
            const wrapper = el.closest('.wrapper') ?? el.parentElement
            const h2 = wrapper?.querySelector('h2')
            return h2?.textContent?.trim() ?? ''
        })

        expect(heading).toContain('Your Goals for')
    })

    it('shows a circular progress meter for daily goals', async () => {
        await setupDailyGoal(page, 'CircularTest')

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        // The circular progress is an SVG with class animated-progress-circular
        const circular = await page.$('.day-goals .animated-progress-circular')
        expect(circular).not.toBeNull()

        // Should contain percentage text
        const text = await page.$eval(
            '.day-goals .animated-progress-circular .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        expect(text).toContain('%')
    })

    it('shows the category name in the goal card', async () => {
        await setupDailyGoal(page, 'NameCheck')

        await page.waitForSelector('.day-goals .day-goal', { timeout: 5000 })

        const text = await page.$eval('.day-goal', el => el.textContent ?? '')
        expect(text).toContain('NameCheck')
    })

    it('links goal card to the category detail page', async () => {
        await setupDailyGoal(page, 'LinkTest')

        await page.waitForSelector('.day-goals .day-goal', { timeout: 5000 })

        const link = await page.$('.day-goal a[data-card-link]')
        expect(link).not.toBeNull()

        const href = await link!.evaluate(el => (el as HTMLAnchorElement).getAttribute('href'))
        expect(href).toContain('/category/')
    })

    it('circular progress updates after logging an entry', async () => {
        await setupDailyGoal(page, 'ProgressUpdate', { count: 3 })

        await page.waitForSelector('.day-goals .animated-progress-circular', { timeout: 5000 })

        // Get initial percentage text
        const initialText = await page.$eval(
            '.day-goals .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        const initialPct = parseInt(initialText)

        // Log an entry
        await quickClickTrigger(page, 0)

        // Wait for progress to update (animation)
        await page.waitForFunction(
            (prev: number) => {
                const el = document.querySelector('.day-goals .circular-text')
                const pct = parseInt(el?.textContent ?? '0')
                return pct > prev
            },
            initialPct,
            { timeout: 5000 },
        )

        const updatedText = await page.$eval(
            '.day-goals .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        const updatedPct = parseInt(updatedText)
        expect(updatedPct).toBeGreaterThan(initialPct)
    })

    it('shows crown icon when goal is completed', async () => {
        await setupDailyGoal(page, 'CrownTest', { count: 1 })

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        // No crown initially
        let crown = await page.$('.day-goal .crown')
        expect(crown).toBeNull()

        // Log one entry to complete the goal
        await quickClickTrigger(page, 0)

        // Wait for crown to appear
        await page.waitForSelector('.day-goal .crown', { timeout: 5000 })
        crown = await page.$('.day-goal .crown')
        expect(crown).not.toBeNull()
    })

    it('shows crown when a running entry completes a minutes goal', async () => {
        // Set up a daily goal of 1 minute
        await setupDailyGoal(page, 'RunCrown', { count: 1, unit: 'minutes' })

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        // No crown initially
        let crown = await page.$('.day-goal .crown')
        expect(crown).toBeNull()

        // Start a running timer via hold-click
        // Scroll trigger into view first since day-goals may shift layout
        await page.waitForSelector('[data-avatar] button', { timeout: 5000 })
        await page.$eval('[data-avatar] button', el => el.scrollIntoView({ block: 'center' }))
        await new Promise(r => setTimeout(r, 300))
        await holdTrigger(page, 0)
        await page.waitForSelector('[data-avatar] button.running', { timeout: 8000 })

        // Fake time forward so the running entry exceeds 1 minute,
        // by patching the entry start time backwards in the store
        await page.evaluate(() => {
            const el = document.querySelector('#__nuxt') as any // eslint-disable-line
            const store = el?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('data')
            const running = store?.entries?.find((e: any) => e.running) // eslint-disable-line
            if (running) running.start = Date.now() - 61_000 // 61 seconds ago
        })

        // Crown should appear as the ticking now ref picks up the completed goal
        await page.waitForSelector('.day-goal .crown', { timeout: 5000 })
        crown = await page.$('.day-goal .crown')
        expect(crown).not.toBeNull()
    })

    it('does not show weekly goals in day-goals section', async () => {
        await addCategory(page, 'WeeklyOnly')
        await openCategoryPage(page)
        // Add a weekly goal (not daily)
        await addGoal(page, { count: 5, unit: 'event', interval: 'week' })
        await navigateTo(page, '/')

        // day-goals should not appear since the goal is weekly, not daily
        await new Promise(r => setTimeout(r, 500))
        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).toBeNull()
    })

    it('shows multiple daily goals from different categories', async () => {
        // Add both categories first
        await addCategory(page, 'GoalA')
        await addCategory(page, 'GoalB')

        // Use the store to get category paths
        const categoryIds = await page.evaluate(() => {
            const el = document.querySelector('#__nuxt') as any // eslint-disable-line
            const store = el?.__vue_app__?.config?.globalProperties?.$pinia?._s?.get('data')
            return store?.categories?.map((c: any) => c.id) ?? [] // eslint-disable-line
        })

        expect(categoryIds.length).toBe(2)

        // Add daily goal to first category
        await navigateTo(page, `/category/${categoryIds[0]}`)
        await page.waitForSelector('.goal-form', { timeout: 5000 })
        await addGoal(page, { count: 2, unit: 'event', interval: 'day' })

        // Add daily goal to second category
        await navigateTo(page, `/category/${categoryIds[1]}`)
        await page.waitForSelector('.goal-form', { timeout: 5000 })
        await addGoal(page, { count: 4, unit: 'event', interval: 'day' })

        // Go home and check
        await navigateTo(page, '/')
        await page.waitForSelector('.day-goals', { timeout: 5000 })

        const goalCards = await page.$$('.day-goal')
        expect(goalCards.length).toBe(2)

        const texts = await Promise.all(
            goalCards.map(card => card.evaluate(el => el.textContent ?? '')),
        )
        expect(texts.some(t => t.includes('GoalA'))).toBe(true)
        expect(texts.some(t => t.includes('GoalB'))).toBe(true)
    })

    it('day-goals section fades in with animation', async () => {
        await setupDailyGoal(page, 'FadeTest')

        // The wrapper has .day-goals-fade class and gets .mounted added via rAF
        await page.waitForSelector('.day-goals-fade.mounted', { timeout: 5000 })

        const mounted = await page.$('.day-goals-fade.mounted')
        expect(mounted).not.toBeNull()
    })
})
