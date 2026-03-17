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
import { addCategory, openCategoryPage, quickClickTrigger, holdTrigger, waitForToast, getToasts, waitForNoToasts, waitForAnnouncement } from './_helpers'

describe('Toast notifications', () => {
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

    /** Add a category, navigate to its page, add a goal, then go home. */
    async function setupCategoryWithGoal(
        title: string,
        goalOptions: { count?: number; unit?: string; interval?: string } = {},
    ): Promise<void> {
        const { count = 1, unit = 'event', interval = 'day' } = goalOptions
        await addCategory(page, title)
        await openCategoryPage(page)

        // Fill in goal form
        const countInput = await page.$('.goal-form input[type="number"]')
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

        // Navigate back home
        await navigateTo(page, '/')
    }

    describe('goal toast on entry creation', () => {
        it('shows a toast with goal progress when creating an entry', async () => {
            await setupCategoryWithGoal('ToastCat', { count: 3 })

            await quickClickTrigger(page, 0)

            const toastText = await waitForToast(page)
            expect(toastText).toContain('ToastCat')
        })

        it('toast contains goal label with count and unit', async () => {
            await setupCategoryWithGoal('LabelCat', { count: 5, unit: 'event', interval: 'day' })

            await quickClickTrigger(page, 0)

            const toastText = await waitForToast(page)
            // Should show "5x" for 5 events
            expect(toastText).toContain('5x')
        })

        it('toast contains a progress bar', async () => {
            await setupCategoryWithGoal('ProgressCat', { count: 3 })

            await quickClickTrigger(page, 0)

            await page.waitForSelector('.toast[popover]', { timeout: 5000 })
            const progress = await page.$('.toast[popover] progress')
            expect(progress).not.toBeNull()
        })

        it('no goal toast when category has no goals', async () => {
            await addCategory(page, 'NoGoalCat')

            const triggerBtn = await page.$('[data-avatar] button')
            await triggerBtn!.click()
            await page.waitForSelector('article.track', { timeout: 5000 })

            // Small wait to see if any toast appears
            await new Promise(r => setTimeout(r, 500))

            await getToasts(page)
            // Filter for goal-related toasts (with progress bars)
            const goalToasts = await page.$$('.toast[popover] progress')
            expect(goalToasts.length).toBe(0)
        })
    })

    describe('goal completion toast', () => {
        it('shows completion toast when goal is reached', async () => {
            await setupCategoryWithGoal('CompleteCat', { count: 1, unit: 'event', interval: 'day' })

            await quickClickTrigger(page, 0)

            // Wait for the completion toast "goal reached!"
            await page.waitForFunction(
                () => {
                    const toasts = document.querySelectorAll('.toast[popover]')
                    return Array.from(toasts).some(t => t.textContent?.includes('goal reached'))
                },
                { timeout: 5000 },
            )

            const toasts = await getToasts(page)
            const completionToast = toasts.find(t => t.includes('goal reached'))
            expect(completionToast).toBeDefined()
            expect(completionToast).toContain('CompleteCat')
        })

        it('no completion toast when goal is not yet reached', async () => {
            await setupCategoryWithGoal('IncompleteCat', { count: 10 })

            await quickClickTrigger(page, 0)

            // Wait briefly for any toasts to appear
            await new Promise(r => setTimeout(r, 1000))

            const toasts = await getToasts(page)
            const completionToast = toasts.find(t => t.includes('goal reached'))
            expect(completionToast).toBeUndefined()
        })
    })

    describe('toast UI behavior', () => {
        it('toast has role="status" for accessibility', async () => {
            await setupCategoryWithGoal('A11yCat', { count: 3 })

            await quickClickTrigger(page, 0)

            await page.waitForSelector('.toast[popover]', { timeout: 5000 })
            const role = await page.$eval('.toast[popover]', el => el.getAttribute('role'))
            expect(role).toBe('status')
        })

        it('toast close button dismisses the toast', async () => {
            await setupCategoryWithGoal('CloseCat', { count: 3 })

            await quickClickTrigger(page, 0)

            await page.waitForSelector('.toast[popover]', { timeout: 5000 })

            // Click the close button
            await page.click('.toast[popover] .closeButton')

            // Toast should disappear
            await page.waitForFunction(
                () => document.querySelectorAll('.toast[popover]').length === 0,
                { timeout: 5000 },
            )

            const toasts = await page.$$('.toast[popover]')
            expect(toasts.length).toBe(0)
        })

        it('toast auto-dismisses after duration', async () => {
            await setupCategoryWithGoal('AutoCat', { count: 3 })

            await quickClickTrigger(page, 0)

            await page.waitForSelector('.toast[popover]', { timeout: 5000 })

            // Default toast duration is 3000ms; wait for it to auto-dismiss
            await waitForNoToasts(page, 6000)

            const toasts = await page.$$('.toast[popover]')
            expect(toasts.length).toBe(0)
        })

        it('multiple toasts stack vertically', async () => {
            // One category with a high-count goal — each click creates a toast
            await setupCategoryWithGoal('StackCat', { count: 10 })

            // Click the trigger button twice quickly to create two toasts
            const trigger = await page.$('[data-group] [data-avatar]:not(.allCategories) button')
            expect(trigger).not.toBeNull()
            await trigger!.click()
            await page.waitForSelector('.toast[popover]', { timeout: 5000 })

            // Wait briefly for the first entry to register, then click again
            await new Promise(r => setTimeout(r, 300))
            await trigger!.click()

            // Wait for two toasts
            await page.waitForFunction(
                () => document.querySelectorAll('.toast[popover]').length >= 2,
                { timeout: 5000 },
            )

            const toasts = await page.$$('.toast[popover]')
            expect(toasts.length).toBeGreaterThanOrEqual(2)

            // Verify they have different toast-index values (stacking)
            const index0 = await toasts[0]!.evaluate(el => getComputedStyle(el).getPropertyValue('--toast-index'))
            const index1 = await toasts[1]!.evaluate(el => getComputedStyle(el).getPropertyValue('--toast-index'))
            expect(index0).not.toBe(index1)
        })
    })

    describe('toast announcement', () => {
        it('announces toast content via aria-live region when goal is reached', async () => {
            await setupCategoryWithGoal('AnnounceCat', { count: 1 })

            await quickClickTrigger(page, 0)

            await waitForToast(page)
            await waitForAnnouncement(page, 'AnnounceCat')
        })
    })

    describe('goal toast with running entries', () => {
        it('shows goal toast when starting a timer for category with goals', async () => {
            await setupCategoryWithGoal('TimerCat', { count: 2, unit: 'hours', interval: 'day' })

            // Wait for the trigger group to fully render after client-side navigation
            await page.waitForSelector('[data-group] [data-avatar]:not(.allCategories) button', { timeout: 5000 })
            await new Promise(r => setTimeout(r, 500))

            // Use the same hold-trigger pattern that works in entries.spec.ts
            await holdTrigger(page, 0)

            // Wait for entry to appear confirming the hold worked
            await page.waitForSelector('article.track', { timeout: 8000 })

            // The toast confirms the entry was created with active goals
            const toastText = await waitForToast(page, 5000)
            expect(toastText).toContain('TimerCat')
        })
    })
})
