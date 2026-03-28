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
import { addCategory, openCategoryPage, quickClickTrigger, getCurrentMonthStr } from './_helpers'

/** Submit the goal form on the category detail page. */
async function addGoal(
    page: Page,
    { count = 3, unit = 'event', interval = 'month' } = {},
): Promise<void> {
    const countInput = await page.$('.goal-form input[type="number"]')
    expect(countInput).not.toBeNull()
    await countInput!.click({ clickCount: 3 })
    await countInput!.type(String(count))

    if (unit !== 'event') {
        await page.selectOption('.goal-form select[aria-label]', { value: unit })
    }

    const selects = await page.$$('.goal-form select')
    if (selects.length >= 2) {
        await selects[1]!.selectOption({ value: interval })
    }

    await page.click('.goal-form button[type="submit"]')
    await page.waitForSelector('.goal-item', { timeout: 5000 })
}

/** Create a category, add a monthly goal, then navigate to the month view. */
async function setupMonthlyGoal(
    page: Page,
    title: string,
    { count = 3, unit = 'event' }: { count?: number; unit?: string } = {},
): Promise<void> {
    await addCategory(page, title)
    await openCategoryPage(page)
    await addGoal(page, { count, unit, interval: 'month' })
    await navigateTo(page, `/month/${getCurrentMonthStr()}`)
}

describe('Month Goals', () => {
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

    it('does not show goals section on month view when no goals exist', async () => {
        await addCategory(page, 'NoGoals')
        await navigateTo(page, `/month/${getCurrentMonthStr()}`)

        await page.waitForSelector('.month-grid', { timeout: 5000 })
        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).toBeNull()
    })

    it('shows goals section on month view when a monthly goal exists', async () => {
        await setupMonthlyGoal(page, 'MonthlyTask', { count: 10 })

        await page.waitForSelector('.day-goals', { timeout: 5000 })
        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).not.toBeNull()
    })

    it('displays "Your Goals for this month" heading', async () => {
        await setupMonthlyGoal(page, 'HeadingTest')

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        const heading = await page.$eval('.day-goals', el => {
            const wrapper = el.closest('.wrapper') ?? el.parentElement
            const h2 = wrapper?.querySelector('h2')
            return h2?.textContent?.trim() ?? ''
        })

        expect(heading).toContain('Your Goals for')
        expect(heading).toContain('this month')
    })

    it('shows circular progress meter for monthly goals', async () => {
        await setupMonthlyGoal(page, 'CircularTest')

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        const circular = await page.$('.day-goals .animated-progress-circular')
        expect(circular).not.toBeNull()

        const text = await page.$eval(
            '.day-goals .animated-progress-circular .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        expect(text).toContain('%')
    })

    it('shows category name in the goal card', async () => {
        await setupMonthlyGoal(page, 'NameCheck')

        await page.waitForSelector('.day-goals .day-goal', { timeout: 5000 })

        const text = await page.$eval('.day-goal', el => el.textContent ?? '')
        expect(text).toContain('NameCheck')
    })

    it('does not show daily goals on the month view', async () => {
        await addCategory(page, 'DailyOnly')
        await openCategoryPage(page)

        // Add a daily goal instead of monthly
        const countInput = await page.$('.goal-form input[type="number"]')
        await countInput!.click({ clickCount: 3 })
        await countInput!.type('3')
        const selects = await page.$$('.goal-form select')
        if (selects.length >= 2) {
            await selects[1]!.selectOption({ value: 'day' })
        }
        await page.click('.goal-form button[type="submit"]')
        await page.waitForSelector('.goal-item', { timeout: 5000 })

        await navigateTo(page, `/month/${getCurrentMonthStr()}`)
        await page.waitForSelector('.month-grid', { timeout: 5000 })
        await new Promise(r => setTimeout(r, 500))
        const dayGoals = await page.$('.day-goals')
        expect(dayGoals).toBeNull()
    })

    it('progress updates after logging an entry', async () => {
        await setupMonthlyGoal(page, 'ProgressUpdate', { count: 5 })

        await page.waitForSelector('.day-goals .circular-text', { timeout: 5000 })

        // Verify initial progress is 0%
        const initialText = await page.$eval(
            '.day-goals .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        expect(parseInt(initialText)).toBe(0)

        // Go home, log an entry, come back
        await navigateTo(page, '/')
        await quickClickTrigger(page, 0)
        await navigateTo(page, `/month/${getCurrentMonthStr()}`)

        // Wait for the circular text to show > 0%
        await page.waitForFunction(
            () => {
                const el = document.querySelector('.day-goals .circular-text')
                return el && parseInt(el.textContent ?? '0') > 0
            },
            undefined,
            { timeout: 10000 },
        )

        const updatedText = await page.$eval(
            '.day-goals .circular-text',
            el => el.textContent?.trim() ?? '',
        )
        expect(parseInt(updatedText)).toBeGreaterThan(0)
    })

    it('shows crown icon when monthly goal is completed', async () => {
        await setupMonthlyGoal(page, 'CrownTest', { count: 1 })

        await page.waitForSelector('.day-goals', { timeout: 5000 })

        let crown = await page.$('.day-goal .crown')
        expect(crown).toBeNull()

        // Go home, log one entry to complete the goal
        await navigateTo(page, '/')
        await quickClickTrigger(page, 0)
        await navigateTo(page, `/month/${getCurrentMonthStr()}`)

        await page.waitForSelector('.day-goal .crown', { timeout: 5000 })
        crown = await page.$('.day-goal .crown')
        expect(crown).not.toBeNull()
    })

    it('month goals section fades in with animation', async () => {
        await setupMonthlyGoal(page, 'FadeTest')

        await page.waitForSelector('.month-goals-fade.mounted', { timeout: 5000 })

        const mounted = await page.$('.month-goals-fade.mounted')
        expect(mounted).not.toBeNull()
    })
})
