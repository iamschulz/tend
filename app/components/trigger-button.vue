<template>
    <button
        oncontextmenu="return false;"
        :style="`--categoryColor: ${category.color}`"
        :class="{ running: isRunning, pressing, releasing, loading }"
        data-shadow="2-hover"
        @mousedown="onTriggerDown"
        @keydown="onTriggerDown"
        @touchstart="onTriggerDown"
        @mouseleave="abortTrigger"
        @click="onStop"
        @animationend="onAnimationEnd"
    >
        {{ category.activity.emoji }}
        <span class="sr-only">{{ isRunning ? `${$t('stop')} ` : '' }}{{ category.title }}</span>
    </button>
</template>

<script setup lang="ts">
    import type { Category, Entry } from '~/types/Category'
    import { useDataStore } from '~/stores/data';

    const props = defineProps<{
        category: Category
    }>()
    const data = useDataStore();
    let disableTriggers = false;

    const isRunning = computed(() => data.hasRunningEntries(props.category));
    const pressing = ref(false);
    const releasing = ref(false);
    const loading = ref(false);

    const onAnimationEnd = (e: AnimationEvent) => {
        if (!e.pseudoElement) {
            releasing.value = false;
        }
    }

    const onStop = () => {
        if (!isRunning.value || disableTriggers) { return; }
        releasing.value = true;
        data.closeAllEntries(props.category.id);
    }

    const onTriggerDown = (event: TouchEvent | MouseEvent | KeyboardEvent) => {
        if (isRunning.value) { return; }

        // only trigger once
        if (("repeat" in event && event.repeat) || disableTriggers) { return; }

        // when keyboard event: only trigger on Enter and Space
        if (event.type === "keydown" && event instanceof KeyboardEvent && !["Enter", "Space"].includes(event.code)) {
            return;
        }

        // prevent touch devices from also firing mousedown
        if (event.type === "touchstart") { event.preventDefault(); }

        disableTriggers = true;

        const clickThreshold = 800; //ms
        const triggerDownTime = event.timeStamp || Date.now();

        // define matching up event
        let upEvent: "touchend" | "mouseup" | "keyup" | undefined = undefined;
        if (event.type === "touchstart") { upEvent = "touchend" }
        else if (event.type === "mousedown") { upEvent = "mouseup" }
        else if (event.type === "keydown") { upEvent = "keyup" }
        if (!upEvent) { return; }

        releasing.value = false;
        pressing.value = true;
        loading.value = true;

        event.target?.addEventListener(upEvent, (event) => {
            pressing.value = false;
            releasing.value = true;
            loading.value = false;
            const triggerUpTime = event.timeStamp;
            addEvent(triggerUpTime - triggerDownTime > clickThreshold);
            window.setTimeout(() => {
                disableTriggers = false;
            }, 10)
        }, { once: true });
    }

    const abortTrigger = () => {
        loading.value = false;
        pressing.value = false;
        window.setTimeout(() => {
            disableTriggers = false;
        }, 10)
        // todo: remove event listeners
    }

    const addEvent = (running: boolean) => {
        data.closeAllEntries(props.category.id);
        const now = Date.now();
        const newEntry: Entry = {
            id: crypto.randomUUID(),
            start: now,
            end: running ? null : now,
            running: running,
            categoryId: props.category.id,
        }
        data.addEntry(newEntry);
    }
</script>

<style scoped>
    @property --progress {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    @keyframes progress-fill {
        0% { --progress: 0; }
        20% { --progress: 0; }
        100%   { --progress: 1; }
    }

    @keyframes progress-pulse {
        0% { --progress: 0.2; }
        20% { --progress: 0.2; }
        80%   { --progress: 0.8; }
        100%   { --progress: 0.8; }
    }

    @keyframes running {
        0% { 
            --progress: 0.75;
            transform: rotate(0);
        }
        100%   { 
            --progress: 0.75;
            transform: rotate(360deg);
        }
    }

    @keyframes bounce-release {
        0%   { scale: 0.85; }
        60%  { scale: 1.08; }
        100% { scale: 1; }
    }

    button {
        position: relative;
        background-color: var(--categoryColor, --col-accent);
        color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
        width: 100%;
        height: 100%;
        text-shadow: 0px 0px 1rem currentColor;
        user-select: none;
        border-radius: 99999px;
        --t-scale: 0.15s;

        &.pressing {
            scale: 0.85;
        }

        &.releasing {
            animation: bounce-release 0.4s var(--animation-bounce);
        }

        &::before {
            content: "";
            position: absolute;
            inset: 3px;
            border: 4px solid currentColor;
            border-radius: 9999px;
            opacity: 0.7;
            mask-image: conic-gradient(
                from 0deg,
                black 0deg calc(360deg * var(--progress)),
                transparent calc(360deg * var(--progress)) 360deg
            );
        }

        &.loading::before {
            animation: progress-fill 0.8s ease-out forwards;
        }

        &.running::before {
            animation: running 1.5s linear forwards infinite, progress-pulse 5s ease-in-out alternate infinite;
        }
    }
</style>