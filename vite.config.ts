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
        'soundlab.svg',
        'icons/*.png',
        'robots.txt',
        'sitemap.xml',
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
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui', 'browser'],
        orientation: 'any',
        background_color: '#050505',
        theme_color: '#050505',
        categories: ['music', 'entertainment', 'productivity'],
        prefer_related_applications: false,
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
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/uploads\//],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
        // Large drumkits / media stay network-only
        globIgnores: ['**/drumkits/**', '**/og-image.jpg'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
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
          if (id.includes('tone')) return 'vendor-tone';
          if (id.includes('framer-motion') || id.includes('/motion/')) return 'vendor-motion';
          if (id.includes('socket.io')) return 'vendor-socket';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react-dom') || id.includes('/react/') || id.includes('react-router')) {
            return 'vendor-react';
          }
          if (id.includes('axios') || id.includes('zustand') || id.includes('@tanstack')) {
            return 'vendor-data';
          }
        },
      },
    },
  },
})
