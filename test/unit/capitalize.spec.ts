import { describe, it, expect } from 'vitest'
import { capitalize } from '~/util/capitalize'

describe('capitalize', () => {
  it('capitalizes a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('keeps an already capitalized string unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello')
  })

  it('handles a single character', () => {
    expect(capitalize('a')).toBe('A')
  })

  it('capitalizes only the first character', () => {
    expect(capitalize('hELLO')).toBe('HELLO')
  })
})
