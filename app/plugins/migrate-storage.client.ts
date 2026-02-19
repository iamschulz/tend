import { preloadIdbCache } from '~/util/idbStorage'

export default defineNuxtPlugin(async () => {
    await preloadIdbCache(['tend-categories', 'tend-entries'])
})
