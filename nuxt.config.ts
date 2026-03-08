// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',

  runtimeConfig: {
    dbPath: './data/tend.db',
    maxBodySizeMb: 5,
    adminUsername: '',
    adminPassword: '',
    session: {
      password: '',
      maxAge: Number(process.env.NUXT_SESSION_MAX_AGE_DAYS || 60) * 60 * 60 * 24,
    },
    public: {
      backendMode: 'standalone',
    },
  },

  app: {
    head: {
      title: "",
      titleTemplate: '%s Tend',
      link: [{ rel: 'icon', type: 'image/svg', href: '/tend.svg' }],
      meta: [
        { name: 'theme-color', content: '#E0E0E0', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#1B1B1B', media: '(prefers-color-scheme: dark)' },
      ],
      script: [
        {
          // Render-blocking inline script: applies the user's saved theme
          // preference before first paint to prevent a flash of wrong theme.
          // When a forced scheme is active, overrides both theme-color meta tags.
          innerHTML: `(function(){var s=localStorage.getItem('force-scheme');if(s==='light'||s==='dark'){document.documentElement.setAttribute('force-scheme',s);var c=s==='dark'?'#1B1B1B':'#E0E0E0';document.querySelectorAll('meta[name=theme-color]').forEach(function(m){m.content=c})}})()`,
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
    ...(process.env.NUXT_PUBLIC_BACKEND_MODE === 'server' ? ['nuxt-auth-utils'] as const : []),
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
      // This is a client-side SPA; the index.html fallback handles all routes.
      crawlLinks: false,
      routes: ['/'],
    },
    externals: {
      external: ['better-sqlite3'],
    },
  },

  experimental: {
    viewTransition: true,
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