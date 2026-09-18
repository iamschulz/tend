<template>
    <div v-if="toast.goals?.length" class="toast-goal">
        <span>{{ toast.message }}</span>
        <div v-for="(goal, gi) in toast.goals" :key="gi" class="toast-goal-row">
            <span class="toast-goal-label">{{ goal.count }}{{ unitSuffix[goal.unit] }} / {{ $t(`per${goal.interval.charAt(0).toUpperCase()}${goal.interval.slice(1)}`) }}</span>
            <AnimatedProgress :goal="goal" :category-id="toast.categoryId!" />
        </div>
    </div>
    <span v-else-if="toast.icon" class="toast-icon-row">
        <!-- Decorative: the message already states the streak, so it is hidden from readers. -->
        <span class="toast-icon" aria-hidden="true">{{ toast.icon }}</span>
        <span>{{ toast.message }}</span>
    </span>
    <span v-else>{{ toast.message }}</span>
</template>

<script setup lang="ts">
    import type { Toast } from '~/composables/useToast'

    defineProps<{ toast: Toast }>()

    const unitSuffix: Record<string, string> = { event: 'x', minutes: 'm', hours: 'h', days: 'd' }
</script>

<style scoped>
    .toast-goal {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .toast-goal-row {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .toast-goal-label {
        flex-shrink: 0;
        font-size: 0.85rem;
        white-space: nowrap;
    }

    .toast-icon-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .toast-icon {
        flex-shrink: 0;
        font-size: 1.5rem;
        line-height: 1;
    }
</style>
