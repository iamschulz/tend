import { LOGO_ASCII } from '~/util/logo-ascii'

/**
 * Renders the Tend logo as ASCII art.
 */
export function renderTendAscii(): void {
    const { width, height, chars, colors } = LOGO_ASCII
    let output = ''
    const styles: string[] = []

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x
            const ch = chars[i]!
            const color = colors[i]
            if (color === null) {
                output += '  '
                continue
            }
            output += `%c${ch} `
            styles.push(`color: ${color}; font-weight: bold;`)
        }
        output += '\n'
    }

    console.log(output, ...styles)
}
