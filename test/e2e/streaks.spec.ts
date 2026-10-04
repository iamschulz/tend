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
import { streakEmoji } from '../../app/util/streakIcon'

/**
 * Streak markers in the activity graph.
 *
 * The goal deliberately runs on Mon/Wed/Fri only: its streak days are never neighbours
 * in the week-column grid, which is exactly the case a connected-bar visual could not
 * represent. Markers are per day, so they must still appear on all three.
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

/**
 * A weekly goal met in two consecutive weeks by a single entry each.
 *
 * A week goal is met by the period, so every day of both weeks counts as met and the
 * streak covers all fourteen — including the twelve nothing was logged on.
 * @param monday - Reference Monday, the start of the first met week
 */
function buildWeeklyImport(monday: Date) {
    const categoryId = randomUUID()

    /**
     * Resolves an offset to its date.
     * @param offsetDays - Days after `monday`
     */
    const dayAt = (offsetDays: number) => {
        const d = new Date(monday)
        d.setDate(d.getDate() + offsetDays)
        return d
    }

    /**
     * Builds one completed hour-long entry on the given day.
     * @param offsetDays - Days after `monday`
     */
    const entryOn = (offsetDays: number) => {
        const d = dayAt(offsetDays)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).getTime()
        return { id: randomUUID(), start, end: start + 3_600_000, running: false, categoryId, comment: '' }
    }

    const worked = [2, 10] // Wednesday of the first week, Thursday of the second

    return {
        payload: {
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '\u{1F3ED}' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'week', unit: 'event', days: 127, reminder: false }],
                hidden: false,
                comment: '',
                entries: worked.map(entryOn),
            }],
        },
        worked: worked.map(o => dateKey(dayAt(o))).sort(),
        bothWeeks: Array.from({ length: 14 }, (_, i) => dateKey(dayAt(i))).sort(),
    }
}

/**
 * A goal that applies to every day, met on Mon/Wed/Fri/Sun only. The missed days in
 * between apply just as much, so nothing here is a streak.
 * @param monday - Reference Monday of the week the entries land in
 */
function buildEveryDayImport(monday: Date) {
    const categoryId = randomUUID()

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

    const worked = [0, 2, 4, 6] // Mon, Wed, Fri, Sun

    return {
        payload: {
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '\u{1F3ED}' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'day', unit: 'event', days: 127, reminder: false }],
                hidden: false,
                comment: '',
                entries: worked.map(entryOn),
            }],
        },
    }
}

/**
 * A daily goal met by a single entry that runs from Monday night into Tuesday morning.
 * @param monday - Reference Monday the entry starts on
 */
function buildOvernightImport(monday: Date) {
    const categoryId = randomUUID()
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 22, 0, 0).getTime()

    const tuesday = new Date(monday)
    tuesday.setDate(tuesday.getDate() + 1)

    return {
        payload: {
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '\u{1F3ED}' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'day', unit: 'event', days: 127, reminder: false }],
                hidden: false,
                comment: '',
                entries: [{
                    id: randomUUID(),
                    start,
                    end: start + 4 * 3_600_000, // 22:00 to 02:00, over midnight
                    running: false,
                    categoryId,
                    comment: '',
                }],
            }],
        },
        days: [dateKey(monday), dateKey(tuesday)],
    }
}

/**
 * Picks two consecutive months that are wholly in the past and share a calendar year, so
 * both land in the same graph however late in the year the suite runs.
 */
function pickMonthPair(): { year: number; months: [number, number] } {
    const now = new Date()
    const month = now.getMonth()
    return month >= 2
        ? { year: now.getFullYear(), months: [month - 2, month - 1] }
        : { year: now.getFullYear() - 1, months: [0, 1] }
}

/**
 * A monthly goal met in two consecutive months by a single entry each.
 * @param year - Year both months fall in
 * @param months - The two month indices
 */
function buildMonthlyImport(year: number, months: [number, number]) {
    const categoryId = randomUUID()

    /**
     * Builds one completed hour-long entry in the middle of the given month.
     * @param month - Month index
     */
    const entryIn = (month: number) => {
        const start = new Date(year, month, 15, 10, 0, 0).getTime()
        return { id: randomUUID(), start, end: start + 3_600_000, running: false, categoryId, comment: '' }
    }

    /**
     * Every date key in the given month.
     * @param month - Month index
     */
    const datesIn = (month: number) =>
        Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) =>
            dateKey(new Date(year, month, i + 1)),
        ).sort()

    return {
        payload: {
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '\u{1F3ED}' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'month', unit: 'event', days: 127, reminder: false }],
                hidden: false,
                comment: '',
                entries: months.map(entryIn),
            }],
        },
        worked: months.map(m => dateKey(new Date(year, m, 15))),
        datesIn,
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

    /**
     * Maps every rendered streak marker back to the date of the cell it sits on, by
     * matching centre points — so it stays correct if the marker size changes.
     */
    async function iconsByDate(): Promise<Record<string, string>> {
        return page.evaluate(() => {
            const centreToDate = new Map<string, string>()
            for (const link of document.querySelectorAll('[data-date]')) {
                const rect = link.querySelector('rect')
                if (!rect) continue
                const cx = Number(rect.getAttribute('x')) + Number(rect.getAttribute('width')) / 2
                const cy = Number(rect.getAttribute('y')) + Number(rect.getAttribute('height')) / 2
                centreToDate.set(`${cx},${cy}`, link.getAttribute('data-date') ?? '')
            }

            const out: Record<string, string> = {}
            for (const marker of document.querySelectorAll('text.streak-icon')) {
                const cx = Number(marker.getAttribute('x'))
                const cy = Number(marker.getAttribute('y'))
                const date = centreToDate.get(`${cx},${cy}`) ?? 'unmapped'
                out[date] = marker.textContent ?? ''
            }
            return out
        })
    }

    /** Dates that carry a streak icon. */
    async function iconDates(): Promise<string[]> {
        return Object.keys(await iconsByDate()).sort()
    }

    /**
     * Dates enclosed by a streak outline. The outline is one shape per week column, so
     * membership is geometric: a cell counts when its centre sits inside one of them.
     * @param activeOnly - Only count the emphasised outline of the hovered streak
     */
    async function outlinedDates(activeOnly = false): Promise<string[]> {
        return page.evaluate((onlyActive) => {
            const selector = onlyActive ? 'rect.run-outline.run-active' : 'rect.run-outline'
            const boxes = [...document.querySelectorAll(selector)].map(o => ({
                x: Number(o.getAttribute('x')),
                y: Number(o.getAttribute('y')),
                w: Number(o.getAttribute('width')),
                h: Number(o.getAttribute('height')),
            }))

            return [...document.querySelectorAll('[data-date] rect.cell')]
                .filter((r) => {
                    const cx = Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2
                    const cy = Number(r.getAttribute('y')) + Number(r.getAttribute('height')) / 2
                    return boxes.some(b => cx > b.x && cx < b.x + b.w && cy > b.y && cy < b.y + b.h)
                })
                .map(r => r.closest('[data-date]')?.getAttribute('data-date') ?? '')
                .sort()
        }, activeOnly)
    }

    /** Dates whose cell is painted in the category colour, rather than left empty. */
    async function colouredDates(): Promise<string[]> {
        return page.evaluate(() =>
            [...document.querySelectorAll('[data-date] rect.cell')]
                .filter(r => !r.classList.contains('level-0'))
                .map(r => r.closest('[data-date]')?.getAttribute('data-date') ?? '')
                .sort(),
        )
    }

    /**
     * Number of separate outline shapes currently drawn.
     * @param activeOnly - Only count the emphasised outline of the hovered streak
     */
    async function outlineCount(activeOnly = false): Promise<number> {
        return page.locator(activeOnly ? 'rect.run-outline.run-active' : 'rect.run-outline').count()
    }

    /**
     * Every date from the first to the last day of a run, inclusive — what a continuous
     * outline covers, as opposed to only the days that carry a marker.
     */
    function spanOf(run: string[]): string[] {
        const out: string[] = []
        const d = new Date(`${run[0]}T12:00:00`)
        const last = new Date(`${run.at(-1)}T12:00:00`)
        while (d <= last) {
            out.push(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            )
            d.setDate(d.getDate() + 1)
        }
        return out.sort()
    }

    it('marks every day of a gapped streak, and no other day', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        const marked = await iconDates()
        expect(marked).toEqual([...streakA, ...streakB].sort())
        expect(marked).not.toContain(loneDate)
    })

    it('marks every streak day with the same sprout, however long the run', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        const icons = await iconsByDate()

        expect(streakA.map(d => icons[d])).toEqual(streakA.map(() => streakEmoji))
        expect(streakB.map(d => icons[d])).toEqual(streakB.map(() => streakEmoji))
    })

    it('colours and sprouts only the days worked on, not every day a streak covers', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, worked, bothWeeks } = buildWeeklyImport(monday)

        await importData(payload)
        await openGraph(year)

        // The weekly goal is met on all fourteen days, but a day with nothing logged on it
        // gets neither the category colour nor a sprout.
        expect(await colouredDates()).toEqual(worked)
        expect(await iconDates()).toEqual(worked)

        // The streak still runs across both weeks — the outline is what shows it, one
        // shape per week column, drawn without anything having to be hovered.
        expect(await outlineCount()).toBe(2)
        expect(await outlinedDates()).toEqual(bothWeeks)
    })

    it('emphasises only the hovered week of a streak that spans several', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, worked, bothWeeks } = buildWeeklyImport(monday)
        const [firstWeek, secondWeek] = [bothWeeks.slice(0, 7), bothWeeks.slice(7)]

        await importData(payload)
        await openGraph(year)

        // One streak, two weeks: hovering a day emphasises the week it sits in, not the
        // whole run — for a weekly goal that week is the period the day belongs to.
        await page.locator(`[data-date="${worked[0]}"] rect`).hover()
        expect(await outlineCount(true)).toBe(1)
        expect(await outlinedDates(true)).toEqual(firstWeek)

        await page.locator(`[data-date="${worked[1]}"] rect`).hover()
        expect(await outlineCount(true)).toBe(1)
        expect(await outlinedDates(true)).toEqual(secondWeek)
    })

    it('draws no outline for days a goal applies to but that never ran together', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload } = buildEveryDayImport(monday)

        await importData(payload)
        await openGraph(year)

        // Mon/Wed/Fri/Sun with a goal that applies every day: Tue, Thu and Sat are missed
        // days, so each met day stands alone and none of them is a streak.
        expect(await outlineCount()).toBe(0)
        expect(await iconDates()).toEqual([])
    })

    it('draws no outline for a weekly goal met in a single week', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload } = buildEveryDayImport(monday)
        payload.categories[0]!.goals[0]!.interval = 'week'

        await importData(payload)
        await openGraph(year)

        // The week is met, so all seven of its days are marked — but a weekly goal's
        // streak advances by the week, and one week is a single period. The streak count
        // next to the goal says 1 for the same reason, and shows no sprout either.
        expect(await outlineCount()).toBe(0)
        expect(await iconDates()).toEqual([])
    })

    it('shows an entry that runs past midnight on both days it covers', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, days } = buildOvernightImport(monday)

        await importData(payload)
        await openGraph(year)

        // One entry, two days: the daily goal counts it in both days' periods, so both are
        // coloured, both carry a sprout, and together they are a two-day streak.
        expect(await colouredDates()).toEqual(days)
        expect(await iconDates()).toEqual(days)
        expect(await outlineCount()).toBe(1)
        expect(await outlinedDates()).toEqual(days)
    })

    it('keeps the emphasis lit while the pointer crosses the gap between two days', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, worked, bothWeeks } = buildWeeklyImport(monday)
        const firstWeek = bothWeeks.slice(0, 7)

        await importData(payload)
        await openGraph(year)

        await page.locator(`[data-date="${worked[0]}"] rect`).hover()
        expect(await outlinedDates(true)).toEqual(firstWeek)

        // The cells are three pixels apart in the grid's own units. Land the pointer in
        // that gap: it is inside the streak but on no cell, and used to blank the emphasis.
        const from = (await page.locator(`[data-date="${firstWeek[2]}"] rect`).boundingBox())!
        const to = (await page.locator(`[data-date="${firstWeek[3]}"] rect`).boundingBox())!
        await page.mouse.move(from.x + from.width / 2, (from.y + from.height + to.y) / 2)

        expect(await outlinedDates(true)).toEqual(firstWeek)

        // Landing on a day of no streak still puts it out.
        await page.locator(`[data-date="${bothWeeks[0]}"] rect`).hover()
        await page.locator('[data-date] rect').first().hover()
        expect(await outlineCount(true)).toBe(0)
    })

    it('emphasises the whole hovered month of a monthly goal, across its weeks', async () => {
        const { year, months } = pickMonthPair()
        const { payload, worked, datesIn } = buildMonthlyImport(year, months)

        await importData(payload)
        await openGraph(year)

        // A month is four to six week columns, so it is drawn as that many outlines — but
        // the period is the month, so hovering any of its days emphasises all of them.
        await page.locator(`[data-date="${worked[0]}"] rect`).hover()
        expect(await outlineCount(true)).toBeGreaterThan(3)
        expect(await outlinedDates(true)).toEqual(datesIn(months[0]))

        await page.locator(`[data-date="${worked[1]}"] rect`).hover()
        expect(await outlinedDates(true)).toEqual(datesIn(months[1]))
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

    it('outlines every streak without hovering, and no day outside one', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        // Both streaks sit inside one week each, so both are one shape, drawn straight away.
        expect(await outlineCount()).toBe(2)

        const outlined = await outlinedDates()
        expect(outlined).toEqual([...spanOf(streakA), ...spanOf(streakB)].sort())
        expect(outlined).not.toContain(loneDate)

        // Drawn is not the same as visible: an outline whose stroke resolves to `none` —
        // what an undefined custom property leaves behind — still counts as an element.
        const strokes = await page.$$eval('rect.run-outline', els =>
            els.map(el => getComputedStyle(el).stroke),
        )
        expect(strokes).toHaveLength(2)
        for (const stroke of strokes) {
            // Any colour function will do — color-mix resolves to oklab here — as long as
            // it is a colour at all and not see-through.
            expect(stroke).toMatch(/^(rgba?|oklab|oklch|color)\(/)
            expect(stroke).not.toMatch(/(,\s*0|\/\s*0)\)$/)
        }
    })

    it('emphasises only the hovered day of a daily goal', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB, loneDate } = buildImport(monday)

        await importData(payload)
        await openGraph(year)

        expect(await outlineCount(true)).toBe(0)

        // A daily goal's period is the day, so the emphasis is that one cell — even though
        // the outline it sits in runs from Monday to Friday.
        // Hover the rect, not the wrapping link: an SVG anchor's box is not its child's box.
        await page.locator(`[data-date="${streakA[1]}"] rect`).hover()
        expect(await outlinedDates(true)).toEqual([streakA[1]])

        await page.locator(`[data-date="${streakB[0]}"] rect`).hover()
        expect(await outlinedDates(true)).toEqual([streakB[0]])

        await page.locator(`[data-date="${loneDate}"] rect`).hover()
        expect(await outlineCount(true)).toBe(0)

        await page.mouse.move(0, 0)
        expect(await outlineCount(true)).toBe(0)

        // Emphasis comes and goes; the outlines themselves stay put throughout.
        expect(await outlineCount()).toBe(2)
        expect(await outlinedDates()).toEqual([...spanOf(streakA), ...spanOf(streakB)].sort())
    })

    it('shows no streak markers in entries mode', async () => {
        const { monday, year } = pickStreakWeek()
        const { payload, streakA, streakB } = buildImport(monday)

        await importData(payload)
        await openGraph(year)
        expect((await iconDates()).length).toBe(streakA.length + streakB.length)

        // Toggle back to entries.
        await page.click('.mode-toggle input[data-toggle]')
        await page.waitForFunction(
            () => (document.querySelector('.mode-toggle input[data-toggle]') as HTMLInputElement)?.checked === false,
            undefined,
            { timeout: 5000 },
        )

        expect(await iconDates()).toEqual([])
        await page.locator('[data-date] rect').first().hover()
        expect(await outlineCount()).toBe(0)
    })

    it('shows the best streak on the goal, and no current streak once it is broken', async () => {
        const { monday } = pickStreakWeek()
        const { payload } = buildImport(monday)

        await importData(payload)
        await openCategoryPage(page)
        await page.waitForSelector('.goal-item', { timeout: 10_000 })

        const streak = await page.textContent('.goal-item .goal-streak')
        expect(streak).toContain('Best streak: 3')
        expect(streak).toContain('0')

        // A broken streak has no marker to show.
        expect(await page.locator('.goal-item .goal-streak-icon').count()).toBe(0)
    })

    it('shows the sprout of a running streak on the goal', async () => {
        // A goal met yesterday and today: a live streak of 2, long enough to mark.
        const categoryId = randomUUID()
        const entryOn = (daysAgo: number) => {
            const d = new Date()
            d.setDate(d.getDate() - daysAgo)
            const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 10, 0, 0).getTime()
            return { id: randomUUID(), start, end: start + 3_600_000, running: false, categoryId, comment: '' }
        }

        await importData({
            categories: [{
                id: categoryId,
                title: 'StreakCat',
                activity: { title: 'work', icon: 'factory', emoji: '🏭' },
                color: '#3a7bd5',
                goals: [{ count: 1, interval: 'day', unit: 'event', days: 127, reminder: false }],
                hidden: false,
                comment: '',
                entries: [entryOn(0), entryOn(1)],
            }],
        })
        await openCategoryPage(page)
        await page.waitForSelector('.goal-item', { timeout: 10_000 })

        expect(await page.textContent('.goal-item .goal-streak')).toContain('2')

        const icon = page.locator('.goal-item .goal-streak-icon')
        await expect.poll(() => icon.count()).toBe(1)
        expect(await icon.textContent()).toBe(streakEmoji)
    })
})
