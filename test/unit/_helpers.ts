import type { TranslateFunction } from '~/types/TranslateFunction'

/**
 * Simple mock for the i18n `t` function.
 * Returns the key, or interpolates `{name}` placeholders from the `named` param.
 */
export const mockT: TranslateFunction = (key, named) => {
  if (!named) return key
  return Object.entries(named).reduce<string>(
    (result, [k, v]) => result.replace(`{${k}}`, String(v)),
    key,
  )
}
