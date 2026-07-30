import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'soundlab.svg',
        'icons/*.png',
        'og-image.jpg',
        'robots.txt',
        'sitemap.xml',
        'yandex_1f68e778c1c9a522.html',
      ],
      manifest: {
        id: '/',
        name: 'SoundLab',
        short_name: 'SoundLab',
        description:
          'Онлайн студия звукозаписи. Установите на компьютер или телефон: ярлык на рабочем столе, MIDI, SoundTok и чаты.',
        lang: 'ru',
        dir: 'ltr',
        start_url: '/?source=pwa',
        scope: '/',
        // Android Chrome installs a real WebAPK only with standalone/fullscreen/minimal-ui.
        // Do NOT list "browser" in display_override — that leads to bookmark-style shortcuts.
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        background_color: '#050505',
        theme_color: '#050505',
        categories: ['music', 'entertainment', 'productivity'],
        prefer_related_applications: false,
        // Lets getInstalledRelatedApps() detect an already-installed PWA in a browser tab
        // so the install banner does not keep showing after install.
        related_applications: [
          {
            platform: 'webapp',
            url: 'https://soundlab-studio.ru/manifest.webmanifest',
          },
        ],
        launch_handler: {
          client_mode: ['navigate-existing', 'auto'],
        },
        icons: [
          { src: '/icons/icon-48.png', sizes: '48x48', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-256.png', sizes: '256x256', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Лента',
            short_name: 'Лента',
            description: 'Открыть ленту публикаций',
            url: '/feed?source=pwa-shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'SoundTok',
            short_name: 'SoundTok',
            description: 'Смотреть SoundTok',
            url: '/soundtok?source=pwa-shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'MIDI',
            short_name: 'MIDI',
            description: 'Открыть MIDI-секвенсор',
            url: '/midi?source=pwa-shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
          {
            name: 'Чаты',
            short_name: 'Чаты',
            description: 'Открыть чаты',
            url: '/chats?source=pwa-shortcut',
            icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
          },
        ],
      },
      workbox: {
        // Keep shell fresh after deploys; avoid sticky stale JS chunks
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Custom push / notificationclick handlers
        importScripts: ['/sw-push.js'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
        // Heavy lazy routes load on demand; runtime caching still applies after visit
        globIgnores: [
          '**/drumkits/**',
          '**/og-image.jpg',
          '**/MIDI-*.js',
          '**/ChatPage-*.js',
          '**/RapBattleNew-*.js',
          '**/SoundTok-*.js',
          '**/AdminPanel-*.js',
          '**/vendor-motion-*.js',
        ],
        maximumFileSizeToCacheInBytes: 400_000,
        runtimeCaching: [
          // Keep installed PWA startup responsive: show the cached shell quickly,
          // then let the SW update flow refresh stale builds in the background.
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'soundlab-pages',
              networkTimeoutSeconds: 1,
              expiration: {
                maxEntries: 8,
                maxAgeSeconds: 60 * 60 * 24,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // /api/* is handled in public/sw-push.js (network-only + soft 503 on failure).
          // Keeping a Workbox NetworkOnly route here causes uncaught `no-response` noise
          // when the backend briefly restarts during deploys.
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'soundlab-uploads',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 7,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'soundlab-images',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'font' || request.destination === 'style',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'soundlab-assets',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5002',
        changeOrigin: true,
      }
    }
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('framer-motion') || id.includes('/motion/')) return 'vendor-motion';
          if (id.includes('socket.io')) return 'vendor-socket';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('axios') || id.includes('zustand')) {
            return 'vendor-data';
          }
        },
      },
    },
  },
})
