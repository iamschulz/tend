import { describe, it, expect } from 'vitest'
import { safeCompare } from '~~/server/utils/safeCompare'

describe('safeCompare', () => {
    it('returns true for equal strings', () => {
        expect(safeCompare('hello', 'hello')).toBe(true)
    })

    it('returns false for different strings of same length', () => {
        expect(safeCompare('hello', 'world')).toBe(false)
    })

    it('returns false when input is shorter than secret', () => {
        expect(safeCompare('hi', 'hello')).toBe(false)
    })

    it('returns false when input is longer than secret', () => {
        expect(safeCompare('hello!', 'hello')).toBe(false)
    })

    it('returns false when input is a prefix of secret', () => {
        expect(safeCompare('pass', 'password')).toBe(false)
    })

    it('returns false when secret is a prefix of input', () => {
        expect(safeCompare('password', 'pass')).toBe(false)
    })

    it('handles empty input against non-empty secret', () => {
        expect(safeCompare('', 'secret')).toBe(false)
    })

    it('handles unicode strings', () => {
        expect(safeCompare('pässwörd', 'pässwörd')).toBe(true)
        expect(safeCompare('pässwörd', 'password')).toBe(false)
    })
})
