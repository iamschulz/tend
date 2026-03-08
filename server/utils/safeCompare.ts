import { timingSafeEqual } from 'node:crypto'

/**
 * Constant-time string comparison. Compares both value and length without
 * leaking timing information about where the strings differ.
 * @param input - The untrusted input string
 * @param secret - The trusted secret to compare against
 */
export function safeCompare(input: string, secret: string): boolean {
    const inputBuf = Buffer.from(input)
    const secretBuf = Buffer.from(secret)
    if (inputBuf.length !== secretBuf.length) {
        // Compare input against itself to spend constant time, then return false
        timingSafeEqual(inputBuf, inputBuf)
        return false
    }
    return timingSafeEqual(inputBuf, secretBuf)
}
