import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from '~~/server/utils/rateLimiter'

describe('createRateLimiter', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('allows attempts under the limit', () => {
        const limiter = createRateLimiter(3, 60_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(false)
    })

    it('blocks after reaching the limit', () => {
        const limiter = createRateLimiter(3, 60_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(true)
    })

    it('resets after the time window expires', () => {
        const limiter = createRateLimiter(2, 10_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(true)

        vi.advanceTimersByTime(10_001)
        expect(limiter.isLimited('ip1')).toBe(false)
    })

    it('starts a fresh window after expiry', () => {
        const limiter = createRateLimiter(2, 10_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')

        vi.advanceTimersByTime(10_001)
        // First failure in the new window
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(false)
    })

    it('tracks keys independently', () => {
        const limiter = createRateLimiter(2, 60_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(true)
        expect(limiter.isLimited('ip2')).toBe(false)
    })

    it('clears attempts for a key', () => {
        const limiter = createRateLimiter(2, 60_000)
        limiter.recordFailure('ip1')
        limiter.recordFailure('ip1')
        expect(limiter.isLimited('ip1')).toBe(true)

        limiter.clear('ip1')
        expect(limiter.isLimited('ip1')).toBe(false)
    })

    it('returns false for unknown keys', () => {
        const limiter = createRateLimiter(3, 60_000)
        expect(limiter.isLimited('never-seen')).toBe(false)
    })
})
