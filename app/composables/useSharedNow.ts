import { ref, onMounted, onUnmounted, type Ref } from 'vue'

const now = ref<number>(Date.now())
let subscribers = 0
let interval: ReturnType<typeof setInterval> | null = null

function start() {
    if (interval) return
    interval = setInterval(() => {
        now.value = Date.now()
    }, 1000)
}

function stop() {
    if (interval) {
        clearInterval(interval)
        interval = null
    }
}

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
