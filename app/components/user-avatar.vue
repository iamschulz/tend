<template>
    <div data-avatar :style="avatarStyle">
        {{ name.slice(0,1).toUpperCase() }}
        <span class="sr-only">{{ name }}</span>
    </div>
</template>

<script setup lang="ts">
    const props = defineProps<{
        name: string,
    }>();

    function hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return hash;
    }

    function oklchFromName(name: string): { l: number; c: number; h: number } {
        const hash = hashString(name);
        const h = ((hash % 360) + 360) % 360;
        const c = 0.28 + (((hash >> 8) % 8) / 100);
        const l = 0.55 + (((hash >> 16) % 15) / 100);
        return { l, c, h };
    }

    const { l, c, h } = oklchFromName(props.name);
    const avatarStyle = {
        '--bg-l': l,
        '--bg-c': c,
        '--bg-h': h,
    };
</script>

<style scoped>
    div {
        --fg-l: clamp(0, (0.55 - var(--bg-l)) * 1000, 1);
        background-color: oklch(var(--bg-l) var(--bg-c) var(--bg-h));
        color: oklch(var(--fg-l) 0 0);
    }
</style>