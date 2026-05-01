/**
 * GET /api/health — Liveness probe used by the client connectivity check.
 * Returns immediately with no DB or session work; the cheapest possible
 * "the server can answer requests" signal.
 */
export default defineEventHandler(() => ({ ok: true }))
