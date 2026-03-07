import { getDatabase } from '../database'

export function useDb() {
    return getDatabase()
}
