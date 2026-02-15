<template>
    <button 
        v-if="!data.hasRunningEntries(category)"
        ref="startButton"
        oncontextmenu="return false;"
        v-bind="{ style: `--categoryColor: ${category.color}`, }"
        @mousedown="onTriggerDown"
        @keydown="onTriggerDown"
        @touchstart="onTriggerDown"
        @mouseleave="abortTrigger"
    >
        {{ category.activity.emoji }}
        <span class="sr-only">{{ category.title }}</span>
    </button>
    <button 
        v-else 
        v-bind="{ style: `--categoryColor: ${category.color}`, }"
        @click="data.closeAllEntries(category.id)"
    >
        <nuxt-icon name="stop" />
        <span class="sr-only">{{ $t('stop') }}</span>
    </button>
</template>

<script setup lang="ts">
    import type { Category, Entry } from '~/types/Category'
    import { useDataStore } from '~/stores/data';

    const props = defineProps<{
        category: Category
    }>()
    const startButton = useTemplateRef('startButton')
    const data = useDataStore();
    let disableTriggers = false;

    const onTriggerDown = (event: TouchEvent | MouseEvent | KeyboardEvent) => {
        // only trigger once
        if (("repeat" in event && event.repeat) || disableTriggers) { return; }

        // when keyboard event: only trigger on Enter and Space
        if (event.type === "keydown" && event instanceof KeyboardEvent && !["Enter", "Space"].includes(event.code)) {
            return;
        }

        disableTriggers = true;

        const clickThreshold = 800; //ms
        const triggerDownTime = event.timeStamp || Date.now();

        // define matching up event
        let upEvent: "touchend" | "mouseup" | "keyup" | undefined = undefined;
        if (event.type === "touchstart") { upEvent = "touchend" }
        else if (event.type === "mousedown") { upEvent = "mouseup" }
        else if (event.type === "keydown") { upEvent = "keyup" }
        if (!upEvent) { return; }

        startButton.value?.classList.add('loading');

        event.target?.addEventListener(upEvent, (event) => {
            startButton.value?.classList.remove('loading');
            const triggerUpTime = event.timeStamp;
            addEvent(triggerUpTime - triggerDownTime > clickThreshold);
            window.setTimeout(() => {
                disableTriggers = false;
            }, 10)
        }, { once: true });
    }

    const abortTrigger = () => {
        startButton.value?.classList.remove('loading');
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
        20% { --progress: 0; }
        100%   { --progress: 1; }
    }

    button {
        position: relative;
        background-color: var(--categoryColor, --col-accent);
        color: oklch(from var(--categoryColor) round(calc(1 - l)) 0 0);
        width: 100%;
        height: 100%;
        text-shadow: 0px 0px 1rem currentColor;
        user-select: none;

        &::before {
            content: "";
            position: absolute;
            inset: 0;
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
    }
</style>