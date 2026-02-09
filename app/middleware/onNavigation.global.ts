export default defineNuxtRouteMiddleware(() => {
    const ui = useUiStore();
    ui.toggleMenu(false);
})