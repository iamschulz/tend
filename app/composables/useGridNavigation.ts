import { ref, nextTick, type Ref } from 'vue';

export type GridNavCell = { key: string; row: number; col: number };

/**
 * Roving-tabindex keyboard navigation for 2D grids (WAI-ARIA grid pattern).
 * Supports ArrowRight/Left/Down/Up, Home, and End.
 *
 * Each consumer maps its data into a flat list of {@link GridNavCell} items.
 * Cells are located in the DOM via `[data-date="${key}"]` inside the grid element.
 *
 * @param gridEl - Ref to the grid container element used for DOM focus queries.
 * @param getCells - Returns the current grid cells. Called on every keydown so it can
 *   reflect dynamic layouts (e.g. responsive CSS grid column counts).
 * @param initialFocus - The key of the cell that receives `tabindex="0"` on mount.
 * @returns `focusedKey` — reactive key for tabindex binding, and
 *   `onGridKeydown` — keydown handler to attach to the grid element.
 */
export function useGridNavigation(
    gridEl: Ref<HTMLElement | SVGElement | null>,
    getCells: () => GridNavCell[],
    initialFocus: string,
) {
    const focusedKey = ref(initialFocus);

    /** 
     * Handles arrow-key, Home, and End navigation within the grid. 
     *
     * @param e - The keyboard event.
    */
    const onGridKeydown = (e: KeyboardEvent) => {
        const cells = getCells();
        const cur = cells.find(c => c.key === focusedKey.value);
        if (!cur) return;

        const sameRow = cells.filter(c => c.row === cur.row);
        const sameCol = cells.filter(c => c.col === cur.col);

        let nextKey: string | undefined;

        switch (e.key) {
            case 'ArrowRight':
                nextKey = sameRow.filter(c => c.col > cur.col).sort((a, b) => a.col - b.col)[0]?.key;
                break;
            case 'ArrowLeft':
                nextKey = sameRow.filter(c => c.col < cur.col).sort((a, b) => b.col - a.col)[0]?.key;
                break;
            case 'ArrowDown':
                nextKey = sameCol.filter(c => c.row > cur.row).sort((a, b) => a.row - b.row)[0]?.key;
                break;
            case 'ArrowUp':
                nextKey = sameCol.filter(c => c.row < cur.row).sort((a, b) => b.row - a.row)[0]?.key;
                break;
            case 'Home':
                nextKey = sameRow.sort((a, b) => a.col - b.col)[0]?.key;
                break;
            case 'End':
                nextKey = sameRow.sort((a, b) => b.col - a.col)[0]?.key;
                break;
            default:
                return;
        }

        if (nextKey) {
            e.preventDefault();
            focusedKey.value = nextKey;
            nextTick(() => {
                gridEl.value?.querySelector<HTMLElement>(`[data-date="${nextKey}"]`)?.focus();
            });
        }
    };

    return { focusedKey, onGridKeydown };
}
