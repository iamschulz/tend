import { describe, it, expect, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useGridNavigation, type GridNavCell } from '~/composables/useGridNavigation'

/**
 * Helper: builds a simple grid of cells.
 *   (0,0) (0,1) (0,2)
 *   (1,0) (1,1) (1,2)
 *   (2,0) (2,1) (2,2)
 * Keys are "r{row}c{col}".
 */
const make3x3 = (): GridNavCell[] => {
    const cells: GridNavCell[] = []
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            cells.push({ key: `r${r}c${c}`, row: r, col: c })
        }
    }
    return cells
}

/** Creates a minimal KeyboardEvent-like object and calls the handler. */
async function press(handler: (e: KeyboardEvent) => void, key: string) {
    const prevented = { called: false }
    const event = { key, preventDefault: vi.fn(() => { prevented.called = true }) } as unknown as KeyboardEvent
    handler(event)
    await nextTick()
    return event
}

describe('useGridNavigation', () => {
    const gridEl = ref(null) as ReturnType<typeof ref<HTMLElement | null>>

    it('initialises focusedKey to the given value', () => {
        const { focusedKey } = useGridNavigation(gridEl, make3x3, 'r1c1')
        expect(focusedKey.value).toBe('r1c1')
    })

    describe('arrow navigation', () => {
        it('ArrowRight moves to next column in same row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c0')
            await press(onGridKeydown, 'ArrowRight')
            expect(focusedKey.value).toBe('r0c1')
        })

        it('ArrowLeft moves to previous column in same row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c2')
            await press(onGridKeydown, 'ArrowLeft')
            expect(focusedKey.value).toBe('r0c1')
        })

        it('ArrowDown moves to next row in same column', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c1')
            await press(onGridKeydown, 'ArrowDown')
            expect(focusedKey.value).toBe('r1c1')
        })

        it('ArrowUp moves to previous row in same column', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r2c1')
            await press(onGridKeydown, 'ArrowUp')
            expect(focusedKey.value).toBe('r1c1')
        })
    })

    describe('boundary clamping', () => {
        it('does not move past the right edge', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c2')
            const e = await press(onGridKeydown, 'ArrowRight')
            expect(focusedKey.value).toBe('r0c2')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })

        it('does not move past the left edge', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c0')
            const e = await press(onGridKeydown, 'ArrowLeft')
            expect(focusedKey.value).toBe('r0c0')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })

        it('does not move past the top edge', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c1')
            const e = await press(onGridKeydown, 'ArrowUp')
            expect(focusedKey.value).toBe('r0c1')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })

        it('does not move past the bottom edge', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r2c1')
            const e = await press(onGridKeydown, 'ArrowDown')
            expect(focusedKey.value).toBe('r2c1')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })
    })

    describe('Home / End', () => {
        it('Home moves to the first column in the row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r1c2')
            await press(onGridKeydown, 'Home')
            expect(focusedKey.value).toBe('r1c0')
        })

        it('End moves to the last column in the row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r1c0')
            await press(onGridKeydown, 'End')
            expect(focusedKey.value).toBe('r1c2')
        })
    })

    describe('ragged grid (sparse cells)', () => {
        // Simulates a month grid where the first row has only a few days
        //   row 0:  _   _   _  (0,3) (0,4) (0,5) (0,6)
        //   row 1: (1,0) ... (1,6)
        const makeRagged = (): GridNavCell[] => {
            const cells: GridNavCell[] = []
            // first week: only Thu-Sun (cols 3-6)
            for (let c = 3; c <= 6; c++) cells.push({ key: `r0c${c}`, row: 0, col: c })
            // second week: full Mon-Sun (cols 0-6)
            for (let c = 0; c <= 6; c++) cells.push({ key: `r1c${c}`, row: 1, col: c })
            return cells
        }

        it('ArrowLeft stops at the first available cell in a ragged row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeRagged, 'r0c3')
            const e = await press(onGridKeydown, 'ArrowLeft')
            expect(focusedKey.value).toBe('r0c3')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })

        it('ArrowDown finds the matching column in a different row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeRagged, 'r0c4')
            await press(onGridKeydown, 'ArrowDown')
            expect(focusedKey.value).toBe('r1c4')
        })

        it('ArrowUp skips rows that lack the target column', async () => {
            // col 0 only exists in row 1 — ArrowUp should not move
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeRagged, 'r1c0')
            const e = await press(onGridKeydown, 'ArrowUp')
            expect(focusedKey.value).toBe('r1c0')
            expect(e.preventDefault).not.toHaveBeenCalled()
        })

        it('Home jumps to the first cell in a ragged row', async () => {
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeRagged, 'r0c6')
            await press(onGridKeydown, 'Home')
            expect(focusedKey.value).toBe('r0c3')
        })
    })

    describe('dynamic grid (responsive columns)', () => {
        let cols = 4

        // Simulates 12 month cells laid out with a dynamic column count
        const makeDynamic = (): GridNavCell[] =>
            Array.from({ length: 12 }, (_, i) => ({
                key: `m${i}`,
                row: Math.floor(i / cols),
                col: i % cols,
            }))

        it('ArrowDown jumps by the current column count', async () => {
            cols = 4
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeDynamic, 'm1')
            await press(onGridKeydown, 'ArrowDown')
            expect(focusedKey.value).toBe('m5') // row 0 col 1 -> row 1 col 1
        })

        it('adapts when column count changes', async () => {
            cols = 3
            const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, makeDynamic, 'm1')
            await press(onGridKeydown, 'ArrowDown')
            expect(focusedKey.value).toBe('m4') // row 0 col 1 -> row 1 col 1
        })
    })

    it('calls preventDefault on valid navigation', async () => {
        const { onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r0c0')
        const e = await press(onGridKeydown, 'ArrowRight')
        expect(e.preventDefault).toHaveBeenCalled()
    })

    it('ignores unrelated keys', async () => {
        const { focusedKey, onGridKeydown } = useGridNavigation(gridEl, make3x3, 'r1c1')
        const e = await press(onGridKeydown, 'Enter')
        expect(focusedKey.value).toBe('r1c1')
        expect(e.preventDefault).not.toHaveBeenCalled()
    })
})
