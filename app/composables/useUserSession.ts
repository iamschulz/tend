/**
 * Fallback stub for when nuxt-auth-utils is not loaded (standalone mode).
 * The real composable is provided by the nuxt-auth-utils module in server mode.
 */
export function useUserSession() {
  return {
    loggedIn: computed(() => false),
    user: ref(null),
    session: ref({}),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
}
