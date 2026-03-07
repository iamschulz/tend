import { defineConfig } from 'drizzle-kit'

export default defineConfig({
    schema: './server/database/schema.ts',
    out: './server/database/migrations',
    dialect: 'sqlite',
    dbCredentials: {
        url: process.env.NUXT_DB_PATH || './data/tend.db',
    },
})
