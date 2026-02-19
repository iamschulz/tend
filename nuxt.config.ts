// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  app: {
    head: {
      title: "Tend",
      script: [
        {
          // Render-blocking inline script: applies the user's saved theme
          // preference before first paint to prevent a flash of wrong theme.
          // Runs outside of Nuxt/Vue — raw browser JS in <head>.
          innerHTML: `(function(){var s=localStorage.getItem('force-scheme');if(s==='light'||s==='dark'){document.documentElement.setAttribute('force-scheme',s)}})()`,
          tagPosition: 'head'
        }
      ]
    }
  },
  devtools: {
    enabled: true,

    timeline: {
      enabled: true
    }
  },

  modules: [
    '@nuxt/a11y',
    '@nuxt/eslint',
    '@nuxt/hints',
    '@nuxt/test-utils',
    '@nuxt/fonts',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-icons',
    '@nuxtjs/i18n'
  ],

  css: [
    '~/assets/css/fixes.css',
    '~/assets/css/theme.css',
    '~/assets/css/srOnly.css',
    '~/assets/css/nolist.css',
    '~/assets/css/nobutton.css',
  ],

  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },

  i18n: {
    defaultLocale: 'en',
    detectBrowserLanguage: {
      
    },
    strategy: 'no_prefix',
    locales: [
      { code: 'en', name: 'English', file: 'en.json' },
      { code: 'de', name: 'Deutsch', file: 'de.json' }
    ]
  }
})