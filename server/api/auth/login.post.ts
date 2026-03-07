import { z } from 'zod'

const loginSchema = z.object({
    username: z.string().min(1),
    password: z.string().min(1),
})

export default defineEventHandler(async (event) => {
    const { username, password } = await readValidatedBody(event, loginSchema.parse)
    const config = useRuntimeConfig()

    if (!config.adminUsername || !config.adminPassword) {
        throw createError({ statusCode: 500, message: 'Admin credentials not configured' })
    }

    if (username !== config.adminUsername || password !== config.adminPassword) {
        throw createError({ statusCode: 401, message: 'Invalid credentials' })
    }

    await setUserSession(event, {
        user: { username },
    })

    return { ok: true }
})
