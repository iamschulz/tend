/**
 * Fallback stub for when nuxt-auth-utils is not loaded (standalone mode).
 * The real composable is provided by the nuxt-auth-utils module in server mode.
 */
export function useUserSession() {
  return {
    loggedIn: computed(() => false),
    user: ref(null),
    session: ref({}),
    /** Fetches the current session from the server. */
    fetch: () => Promise.resolve(),
    /** Clears the current session. */
    clear: () => Promise.resolve(),
  }
}
