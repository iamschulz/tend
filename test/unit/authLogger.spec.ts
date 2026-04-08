import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logAuthEvent } from '~~/server/utils/authLogger'

describe('logAuthEvent', () => {
    let spy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
        spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        spy.mockRestore()
    })

    it('logs authentication failure with correct format', () => {
        logAuthEvent('authentication-failure', '192.168.1.1', 'alice@example.com', '/api/auth/login')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] authentication-failure ip=192.168.1.1 user=alice@example.com path=/api/auth/login',
        )
    })

    it('logs authentication success', () => {
        logAuthEvent('authentication-success', '10.0.0.1', 'bob@example.com', '/api/auth/login')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] authentication-success ip=10.0.0.1 user=bob@example.com path=/api/auth/login',
        )
    })

    it('logs registration rejected', () => {
        logAuthEvent('registration-rejected', '172.16.0.5', 'eve@example.com', '/api/auth/register')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] registration-rejected ip=172.16.0.5 user=eve@example.com path=/api/auth/register',
        )
    })

    it('logs registration success', () => {
        logAuthEvent('registration-success', '10.0.0.2', 'carol@example.com', '/api/auth/register')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] registration-success ip=10.0.0.2 user=carol@example.com path=/api/auth/register',
        )
    })

    it('logs rate-limited events', () => {
        logAuthEvent('rate-limited', '203.0.113.50', 'unknown', '/api/auth/login')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] rate-limited ip=203.0.113.50 user=unknown path=/api/auth/login',
        )
    })

    it('logs change-password path', () => {
        logAuthEvent('authentication-failure', '10.0.0.3', 'dan@example.com', '/api/auth/change-password')
        expect(console.log).toHaveBeenCalledWith(
            '[tend-auth] authentication-failure ip=10.0.0.3 user=dan@example.com path=/api/auth/change-password',
        )
    })

    it('produces output matching the fail2ban filter regex', () => {
        logAuthEvent('authentication-failure', '1.2.3.4', 'test@example.com', '/api/auth/login')

        const output = spy.mock.calls[0][0] as string
        // The recommended fail2ban failregex pattern
        const failregex = /\[tend-auth\] (?:authentication-failure|registration-rejected|rate-limited) ip=(\S+)/
        const match = output.match(failregex)
        expect(match).not.toBeNull()
        expect(match![1]).toBe('1.2.3.4')
    })

    it('does not match success events against the fail2ban filter regex', () => {
        logAuthEvent('authentication-success', '1.2.3.4', 'test@example.com', '/api/auth/login')

        const output = spy.mock.calls[0][0] as string
        const failregex = /\[tend-auth\] (?:authentication-failure|registration-rejected|rate-limited) ip=(\S+)/
        expect(output.match(failregex)).toBeNull()
    })
})
