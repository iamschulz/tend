import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { initDatabase } from '../database'

export default defineNitroPlugin(() => {
    const config = useRuntimeConfig()
    const dbPath = config.dbPath || './data/tend.db'

    mkdirSync(dirname(dbPath), { recursive: true })
    initDatabase(dbPath)

    console.log(`Database initialized at ${dbPath}`)
})
