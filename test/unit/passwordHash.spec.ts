import { describe, it, expect } from 'vitest'
import { bcryptHash, verifyPasswordHash, isBcryptHash } from '~~/server/utils/passwordHash'

describe('passwordHash', () => {
    describe('bcryptHash', () => {
        it('returns a bcrypt hash', async () => {
            const hash = await bcryptHash('testpassword')
            expect(hash).toMatch(/^\$2[aby]\$/)
        })

        it('produces different hashes for the same input (salted)', async () => {
            const hash1 = await bcryptHash('same')
            const hash2 = await bcryptHash('same')
            expect(hash1).not.toBe(hash2)
        })

        it('produces a hash that verifies correctly', async () => {
            const hash = await bcryptHash('mypassword')
            expect(await verifyPasswordHash('mypassword', hash)).toBe(true)
        })

        it('produces a hash that rejects wrong passwords', async () => {
            const hash = await bcryptHash('correct')
            expect(await verifyPasswordHash('wrong', hash)).toBe(false)
        })
    })

    describe('verifyPasswordHash', () => {
        it('returns true for matching password', async () => {
            const hash = await bcryptHash('hello')
            expect(await verifyPasswordHash('hello', hash)).toBe(true)
        })

        it('returns false for non-matching password', async () => {
            const hash = await bcryptHash('original')
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
