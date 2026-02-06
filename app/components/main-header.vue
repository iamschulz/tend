<template>
    <header>
        <div class="header-inner">
            <button id="menuButton" data-shadow="2-hover">
                <span class="sr-only">Menu</span>
            </button>
            <h1>Today</h1>
        </div>
    </header>
</template>

<style>
    :is(header) {
        .header-inner {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
        }

        h1 {
            margin: 0;
            font-size: 2rem;
        }
    }
</style>
