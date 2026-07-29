import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { randomUUID } from 'node:crypto'
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest'
import type { Page } from 'playwright'
import {
    startServer,
    stopServer,
    launchBrowser,
    closeBrowser,
    getPage,
} from './_setup'
import { openMenu, openCategoryPage, waitForIdbKeyContains } from './_helpers'

/**
 * Streak markers in the activity graph.
 *
 * The goal deliberately runs on Mon/Wed/Fri only: its streak days are never neighbours
 * in the week-column grid, which is exactly the case a connected-bar visual could not
 * represent. Flames are per day, so they must still appear on all three.
 */

const MON_WED_FRI = (1 << 0) | (1 << 2) | (1 << 4)

/**
 * Day offsets from the reference Monday. Two separate streaks so the tests can tell
 * "highlight the hovered streak" apart from "highlight every streak", plus one met day
 * that stays alone because the applicable day after it is missed.
 *
 * Streaks A and B are two weeks apart, so the missed Mon/Wed/Fri in between break the
 * run rather than joining them.
 */
const STREAK_A = [0, 2, 4] // Mon, Wed, Fri  -> streak of 3
const STREAK_B = [14, 16] // Mon, Wed two weeks later -> streak of 2
const LONE_OFFSET = -7 // previous Monday, met but never part of a streak

/** Formats a date as the `YYYY-MM-DD` key the graph uses for `data-date`. */
function dateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Picks a Monday far enough in the past that the whole week is history, and where the
 * previous Monday through this Friday all share one year — every seeded day then lands
 * in the same year's graph no matter when the suite runs.
 */
function pickStreakWeek(): { monday: Date; year: number } {
    const d = new Date()
    d.setHours(12, 0, 0, 0)
    d.setDate(d.getDate() - 21)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // back to Monday

    /**
     * Whether every seeded day of this week sits in one calendar year.
     * @param monday - Monday of the candidate week
     */
    const oneYear = (monday: Date) => {
        const offsets = [LONE_OFFSET, ...STREAK_A, ...STREAK_B]
        const years = offsets.map((o) => {
            const x = new Date(monday)
            x.setDate(x.getDate() + o)
            return x.getFullYear()
        })
        return years.every(y => y === years[0])
    }

    while (!oneYear(d)) d.setDate(d.getDate() - 7)

    return { monday: new Date(d), year: d.getFullYear() }
}

/**
 * Builds an import payload for a Mon/Wed/Fri goal met on the days listed above.
 * @param monday - Reference Monday that all offsets are relative to
 */
function buildImport(monday: Date) {
    const categoryId = randomUUID()

    /**
     * Resolves an offset to its date key.
     * @param offsetDays - Days after `monday`
     */
    const keyAt = (offsetDays: number) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + offsetDays)
        return dateKey(d)
    }

    /**
     * Builds one completed hour-long entry on the given day.
     * @param offsetDays - Days after `monday`
     */
    const entryOn = (offsetDays: number) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + offsetDays)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).getTime()
        return { id: randomUUID(), start, end: start + 3_600_000, running: false, categoryId, comment: '' }
    }

    return {
        payload: {
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '🏭' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'day', unit: 'event', days: MON_WED_FRI, reminder: false }],
                hidden: false,
                comment: '',
                entries: [...STREAK_A, ...STREAK_B, LONE_OFFSET].map(entryOn),
            }],
        },
        streakA: STREAK_A.map(keyAt).sort(),
        streakB: STREAK_B.map(keyAt).sort(),
        loneDate: keyAt(LONE_OFFSET),
    }
}

describe('Streaks', () => {
    let page: Page
    let tmpDir: string

    beforeAll(async () => {
        await startServer()
        await launchBrowser()
    })

    afterAll(async () => {
        await closeBrowser()
        stopServer()
    })

    beforeEach(async () => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tend-streaks-'))
        page = await getPage('/')
    })

    afterEach(async () => {
        await page.close()
        fs.rmSync(tmpDir, { recursive: true, force: true })
    })

    /**
     * Seeds data through the real import flow, the same way data.spec.ts does.
     * @param data - Import payload
     */
    async function importData(data: unknown): Promise<void> {
        await openMenu(page)
        await page.evaluate(() => {
            const details = document.querySelectorAll('dialog.menu details')
            const dataDetails = details[3]
            if (dataDetails && !dataDetails.hasAttribute('open')) {
                dataDetails.querySelector('summary')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
            }
        })
        await new Promise(r => setTimeout(r, 300))

        const selector = 'dialog.menu details:nth-of-type(4) input[type="file"]'
        await page.waitForSelector(selector, { state: 'attached', timeout: 5000 })
        const fileInput = await page.$(selector)
        expect(fileInput).not.toBeNull()

        const file = path.join(tmpDir, 'streaks.json')
        fs.writeFileSync(file, JSON.stringify(data))
        await fileInput!.setInputFiles(file)

        await page.waitForSelector('dialog.confirm-dialog[open]', { timeout: 8000 })
        await page.click('dialog.confirm-dialog button[data-variant="primary"]', { timeout: 8000 })
        await page.waitForFunction(
            () => !document.querySelector('dialog.confirm-dialog[open]'),
            undefined,
            { timeout: 8000 },
        )

        // The store persists on a debounce; waiting for the write both flushes it and
        // proves the import actually landed before any assertion runs.
        await waitForIdbKeyContains(page, 'tend-categories', 'StreakCat')
    }

    /**
     * Opens the category page, expands the given year's graph and switches to goals mode.
     * Navigation goes through the menu so the imported store state survives — a full
     * page load would race the debounced IndexedDB write.
     * @param year - Year whose graph should be opened
     */
    async function openGraph(year: number): Promise<void> {
        await openCategoryPage(page)
        await page.waitForSelector('.goal-item', { timeout: 10_000 })

        // The statistics section is a sibling of `.category`, so match the year summary
        // by its exact text — no menu summary is just a year.
        await page.locator('details summary')
            .filter({ hasText: new RegExp(`^${year}$`) })
            .click({ timeout: 10_000 })
        await page.waitForSelector('.activity-graph', { timeout: 10_000 })

        await page.waitForSelector('.mode-toggle input[data-toggle]', { timeout: 10_000 })
        await page.click('.mode-toggle input[data-toggle]', { timeout: 10_000 })
        await page.waitForFunction(
            () => (document.querySelector('.mode-toggle input[data-toggle]') as HTMLInputElement)?.checked === true,
            undefined,
            { timeout: 5000 },
        )
        await page.locator('.activity-graph').scrollIntoViewIfNeeded()
    }

    /** Maps every rendered flame back to the date of the cell it sits on. */
    async function flameDates(): Promise<string[]> {
        return page.evaluate(() => {
            const cellCentres = new Map<string, string>()
            for (const link of document.querySelectorAll('[data-date]')) {
                const rect = link.querySelector('rect')
                if (!rect) continue
                const cx = Number(rect.getAttribute('x')) + 6
                const cy = Number(rect.getAttribute('y')) + 6
                cellCentres.set(`${cx},${cy}`, link.getAttribute('data-date') ?? '')
            }
            return [...document.querySelectorAll('text.streak-flame')]
                .map(t => cellCentres.get(`${Number(t.getAttribute('x'))},${Number(t.getAttribute('y'))}`) ?? 'unmapped')
                .sort()
        })
    }

    /** Dates of every cell currently drawn with an outline. */
    async function outlinedDates(): Promise<string[]> {
        return page.evaluate(() =>
            [...document.querySelectorAll('[data-date] rect.cell')]
                .filter(r => getComputedStyle(r).stroke !== 'none')
                .map(r => r.closest('[data-date]')?.getAttribute('data-date') ?? '')
                .sort(),
        )
    }

    it('marks every day of a gapped streak with a flame, and no other day', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        const flames = await flameDates()
        expect(flames).toEqual([...streakA, ...streakB].sort())
        expect(flames).not.toContain(loneDate)
    })

    it('reports the streak length in the cell label, but not on a lone met day', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        expect(await page.getAttribute(`[data-date="${streakA[1]}"]`, 'aria-label')).toContain('3-day streak')
        expect(await page.getAttribute(`[data-date="${streakB[0]}"]`, 'aria-label')).toContain('2-day streak')
        expect(await page.getAttribute(`[data-date="${loneDate}"]`, 'aria-label')).not.toContain('streak')
    })

    it('outlines only the hovered streak, leaving other streaks untouched', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        expect(await outlinedDates()).toEqual([])

        // Hover the rect, not the wrapping link: an SVG anchor's box is not its child's box.
        await page.locator(`[data-date="${streakA[1]}"] rect`).hover()
        expect(await outlinedDates()).toEqual(streakA)

        await page.locator(`[data-date="${streakB[0]}"] rect`).hover()
        expect(await outlinedDates()).toEqual(streakB)

        await page.locator(`[data-date="${loneDate}"] rect`).hover()
        expect(await outlinedDates()).toEqual([])

        await page.mouse.move(0, 0)
        expect(await outlinedDates()).toEqual([])
    })

    it('shows no streak markers in entries mode', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB } = buildImport(monday)

        await importData(payload)
        await openGraph(year)
        expect((await flameDates()).length).toBe(streakA.length + streakB.length)

        // Toggle back to entries.
        await page.click('.mode-toggle input[data-toggle]')
        await page.waitForFunction(
            () => (document.querySelector('.mode-toggle input[data-toggle]') as HTMLInputElement)?.checked === false,
            undefined,
            { timeout: 5000 },
        )

        expect(await flameDates()).toEqual([])
        await page.locator('[data-date] rect').first().hover()
        expect(await outlinedDates()).toEqual([])
    })

    it('shows the best streak on the goal, and no current streak once it is broken', async () => {
        const { monday } = pickStreakWeek()
        const { payload } = buildImport(monday)

        await importData(payload)
        await openCategoryPage(page)
        await page.waitForSelector('.goal-item', { timeout: 10_000 })

        const streak = await page.textContent('.goal-item .goal-streak')
        expect(streak).toContain('Best streak: 3')
        expect(streak).toContain('🔥 0')
    })
})
