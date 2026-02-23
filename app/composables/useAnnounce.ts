const announcers = new Map<string, { text: Ref<string>, isActive: () => boolean }>()

export default function useAnnounce() {
  const announce = (text: string) => {
    // Find the active announcer: last registered whose isActive() returns true.
    // Dialog announcers register after root, so they naturally take priority.
    let target: Ref<string> | null = null
    for (const [, entry] of announcers) {
      if (entry.isActive()) target = entry.text
    }
    if (!target) return

    // Clear first so repeated identical messages are still announced
    target.value = ''
    nextTick(() => {
      if (target) target.value = text
    })
  }

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

  /** Announce when an item is added to a list. */
  const watchForAdd = <T>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length > oldList.length) {
        announce(getText(newList[0]!))
      }
    })
  }

  /** Announce when an item is removed from a list. */
  const watchForDelete = <T extends { id: string }>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length < oldList.length) {
        const newIds = new Set(newList.map((e) => e.id))
        const removed = oldList.find((e) => !newIds.has(e.id))
        if (removed) announce(getText(removed))
      }
    })
  }

  /** Announce when a running entry stops. */
  const watchForStop = <T extends { running: boolean }>(list: Ref<T[]>, getText: (item: T) => string) => {
    watch(list, (newList, oldList) => {
      if (newList.length !== oldList.length) return
      const stopped = newList.find((entry, i) => !entry.running && oldList[i]?.running)
      if (stopped) announce(getText(stopped))
    })
  }

  return { announce, registerAnnouncer, watchForAdd, watchForDelete, watchForStop }
}
