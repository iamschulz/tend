import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const now = ref<number>(Date.now())
let subscribers = 0
let interval: ReturnType<typeof setInterval> | null = null

/** Starts the shared 1-second interval timer. */
function start() {
    if (interval) return
    interval = setInterval(() => {
        now.value = Date.now()
    }, 1000)
}

/** Stops the shared interval timer. */
function stop() {
    if (interval) {
        clearInterval(interval)
        interval = null
    }
}

/** Returns a shared reactive ref of the current timestamp, updated every second while any subscriber is mounted. */
export function useSharedNow(): Ref<number> {
    onMounted(() => {
        subscribers++
        now.value = Date.now()
        if (subscribers === 1) start()
    })

    onUnmounted(() => {
        subscribers--
        if (subscribers === 0) stop()
    })

    return now
}
