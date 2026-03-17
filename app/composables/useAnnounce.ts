const announcers = new Map<string, { text: Ref<string>, isActive: () => boolean }>()
const queue: string[] = []
let processing = false

/** Processes the announcement queue, reading one item at a time. */
const processQueue = () => {
  const text = queue.shift()
  if (!text) { processing = false; return }

  let target: Ref<string> | null = null
  for (const [, entry] of announcers) {
    if (entry.isActive()) target = entry.text
  }
  if (!target) { processQueue(); return }

  // Clear first so repeated identical messages are still announced
  target.value = ''
  nextTick(() => {
    target!.value = text
    // Estimate reading time: ~130ms per word, 500ms minimum
    const delay = Math.max(500, text.split(' ').length * 130)
    setTimeout(processQueue, delay)
  })
}

/** Provides aria-live announcement helpers for screen readers. */
export default function useAnnounce() {
  /**
   * Queues text to be sent to the active aria-live announcer, FIFO.
   * @param text - The text to announce
   */
  const announce = (text: string) => {
    console.log('announce', text);
    queue.push(text)
    if (!processing) {
      processing = true
      processQueue()
    }
  }

  /**
   * Registers an aria-live region that can receive announcements.
   * @param id - Unique identifier for the announcer
   * @param isActive - Callback that returns whether this announcer is currently active
   */
  const registerAnnouncer = (id: string, isActive: () => boolean): Ref<string> => {
    const text = ref('')
    announcers.set(id, { text, isActive })

    if (getCurrentInstance()) {
      onUnmounted(() => {
        announcers.delete(id)
      })
    }

    return text
  }

  /**
   * Announce when an item is added to a list.
   * @param list - Reactive list to watch
   * @param getText - Callback to produce announcement text from the added item
   */
  const watchForAdd = <T>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length > oldList.length) {
        announce(getText(newList[0]!))
      }
    })
  }

  /**
   * Announce when an item is removed from a list.
   * @param list - Reactive list to watch
   * @param getText - Callback to produce announcement text from the removed item
   */
  const watchForDelete = <T extends { id: string }>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length < oldList.length) {
        const newIds = new Set(newList.map((e) => e.id))
        const removed = oldList.find((e) => !newIds.has(e.id))
        if (removed) announce(getText(removed))
      }
    })
  }

  /**
   * Announce when a running entry stops.
   * @param list - Reactive list to watch
   * @param getText - Callback to produce announcement text from the stopped item
   */
  const watchForStop = <T extends { running: boolean }>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length !== oldList.length) return
      const stopped = newList.find((entry, i) => !entry.running && oldList[i]?.running)
      if (stopped) announce(getText(stopped))
    })
  }

  return { announce, registerAnnouncer, watchForAdd, watchForDelete, watchForStop }
}
