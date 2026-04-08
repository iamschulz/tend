import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPasswordHash, isBcryptHash } from '~~/server/utils/passwordHash'

describe('passwordHash', () => {
    describe('hashPassword', () => {
        it('returns a bcrypt hash', async () => {
            const hash = await hashPassword('testpassword')
            expect(hash).toMatch(/^\$2[aby]\$/)
        })

        it('produces different hashes for the same input (salted)', async () => {
            const hash1 = await hashPassword('same')
            const hash2 = await hashPassword('same')
            expect(hash1).not.toBe(hash2)
        })

        it('produces a hash that verifies correctly', async () => {
            const hash = await hashPassword('mypassword')
            expect(await verifyPasswordHash('mypassword', hash)).toBe(true)
        })

        it('produces a hash that rejects wrong passwords', async () => {
            const hash = await hashPassword('correct')
            expect(await verifyPasswordHash('wrong', hash)).toBe(false)
        })
    })

    describe('verifyPasswordHash', () => {
        it('returns true for matching password', async () => {
            const hash = await hashPassword('hello')
            expect(await verifyPasswordHash('hello', hash)).toBe(true)
        })

        it('returns false for non-matching password', async () => {
            const hash = await hashPassword('original')
            expect(await verifyPasswordHash('different', hash)).toBe(false)
        })
    })

    describe('isBcryptHash', () => {
        it('returns true for bcrypt hashes', () => {
            expect(isBcryptHash('$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01')).toBe(true)
            expect(isBcryptHash('$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01')).toBe(true)
        })

        it('returns false for plaintext', () => {
            expect(isBcryptHash('plaintext')).toBe(false)
            expect(isBcryptHash('')).toBe(false)
        })
    })
})
