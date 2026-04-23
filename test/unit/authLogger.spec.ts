import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logAuthEvent, sanitize } from '~~/server/utils/authLogger'

describe('sanitize', () => {
    it('returns clean strings unchanged', () => {
        expect(sanitize('hello world')).toBe('hello world')
    })

    it('returns empty string unchanged', () => {
        expect(sanitize('')).toBe('')
    })

    it('preserves printable ASCII', () => {
        const printable = 'abc123!@#$%^&*() ABC'
        expect(sanitize(printable)).toBe(printable)
    })

    it('preserves unicode characters', () => {
        expect(sanitize('user@例え.jp')).toBe('user@例え.jp')
    })

    it('replaces newline with underscore', () => {
        expect(sanitize('line1\nline2')).toBe('line1_line2')
    })

    it('replaces carriage return with underscore', () => {
        expect(sanitize('line1\rline2')).toBe('line1_line2')
    })

    it('replaces CRLF with underscores', () => {
        expect(sanitize('line1\r\nline2')).toBe('line1__line2')
    })

    it('replaces tab with underscore', () => {
        expect(sanitize('col1\tcol2')).toBe('col1_col2')
    })

    it('replaces null byte with underscore', () => {
        expect(sanitize('before\0after')).toBe('before_after')
    })

    it('replaces DEL character (0x7F) with underscore', () => {
        expect(sanitize('before\x7Fafter')).toBe('before_after')
    })

    it('replaces all control characters in range 0x00-0x1F', () => {
        // Build a string with every control char
        let input = ''
        for (let i = 0; i <= 0x1F; i++) {
            input += String.fromCharCode(i)
        }
        const result = sanitize(input)
        expect(result).toBe('_'.repeat(32))
    })

    it('handles a realistic log injection attempt', () => {
        const malicious = 'attacker\n[tend-auth] authentication-success ip=1.2.3.4 user=admin path=/api/auth/login'
        const result = sanitize(malicious)
        expect(result).not.toContain('\n')
        expect(result).toBe('attacker_[tend-auth] authentication-success ip=1.2.3.4 user=admin path=/api/auth/login')
    })
})

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

    it('sanitizes newlines in username to prevent log injection', () => {
        logAuthEvent('authentication-failure', '1.2.3.4', 'attacker\n[tend-auth] authentication-success ip=1.2.3.4 user=admin', '/api/auth/login')
        const output = spy.mock.calls[0][0] as string
        expect(output).not.toContain('\n')
        expect(output.split('\n')).toHaveLength(1)
    })

    it('sanitizes control characters in IP address', () => {
        logAuthEvent('authentication-failure', '1.2.3.4\r\nX-Injected: true', 'user', '/api/auth/login')
        const output = spy.mock.calls[0][0] as string
        expect(output).not.toContain('\r')
        expect(output).not.toContain('\n')
    })

    it('sanitizes tabs and null bytes in all parameters', () => {
        logAuthEvent('authentication-failure', '1.2.3.4\0', 'user\there', '/path\0')
        const output = spy.mock.calls[0][0] as string
        expect(output).not.toContain('\0')
        expect(output).not.toContain('\t')
    })

    it('does not match success events against the fail2ban filter regex', () => {
        logAuthEvent('authentication-success', '1.2.3.4', 'test@example.com', '/api/auth/login')

        const output = spy.mock.calls[0][0] as string
        const failregex = /\[tend-auth\] (?:authentication-failure|registration-rejected|rate-limited) ip=(\S+)/
        expect(output.match(failregex)).toBeNull()
    })
})
