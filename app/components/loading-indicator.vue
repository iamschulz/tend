<template>
    <div class="loading-indicator"/>
</template>

<style scoped>
    @property --progress {
        syntax: "<number>";
        inherits: false;
        initial-value: 0;
    }

    @keyframes progress-fill {
        20% { --progress: 0.2; }
        100%   { --progress: 0.8; }
    }

    @keyframes rotate {
        0% { transform: rotate(0deg) }
        100%   { transform: rotate(360deg) }
    }

    .loading-indicator {
        display: block;
        width: 2rem;
        height: 2rem;
        border: 4px solid currentColor;
        border-radius: 9999px;
        mask-image: conic-gradient(from 0deg, black 0deg calc(360deg * var(--progress)), transparent calc(360deg * var(--progress)) 360deg);
        animation: progress-fill 2s linear alternate infinite, rotate 0.8s linear infinite;;
    }
</style>