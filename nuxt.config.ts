// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  app: {
    head: {
      title: "",
      titleTemplate: '%s Tend',
      link: [{ rel: 'icon', type: 'image/svg', href: '/tend.svg' }],
      script: [
        {
          // Render-blocking inline script: applies the user's saved theme
          // preference before first paint to prevent a flash of wrong theme.
          // Runs outside of Nuxt/Vue — raw browser JS in <head>.
          innerHTML: `(function(){var s=localStorage.getItem('force-scheme');if(s==='light'||s==='dark'){document.documentElement.setAttribute('force-scheme',s)}var d=s==='dark'||(s!=='light'&&matchMedia('(prefers-color-scheme:dark)').matches);var m=document.createElement('meta');m.name='theme-color';m.content=d?'#1B1b1B':'#E0E0E0';document.head.appendChild(m)})()`,
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
    './modules/pwa',
    '@nuxt/fonts',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    'nuxt-icons',
    '@nuxtjs/i18n',
    '@nuxt/a11y',
    '@nuxt/eslint',
    '@nuxt/hints',
  ],

  css: [
    '~/assets/css/theme.css',
    '~/assets/css/srOnly.css',
    '~/assets/css/nolist.css',
    '~/assets/css/nobutton.css',
    '~/assets/css/dashedbox.css',
  ],

  piniaPluginPersistedstate: {
    storage: 'localStorage',
  },

  nitro: {
    prerender: {
      // Disable link crawling — the prev/next date nav links create infinite
      // chains (/day/2025-02-24 → /day/2025-02-23 → …) that OOM the crawler.
      // This is a client-side SPA; the 200.html fallback handles all routes.
      crawlLinks: false,
      routes: ['/'],
    },
  },

  i18n: {
    defaultLocale: 'en',
    detectBrowserLanguage: {},
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      { code: 'en', language: 'en', name: 'English', file: 'en.json' },
      { code: 'de', language: 'de', name: 'Deutsch', file: 'de.json' }
    ]
  }
})