import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Relative asset paths so one build works everywhere: at a domain root
  // (anjunatree.com) and at a project subpath (user.github.io/anjunatree/).
  // Safe here because all app state lives in the URL hash, not in paths.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'AnjunaTree — the Anjuna music catalogue, visualised',
        short_name: 'AnjunaTree',
        description:
          'An interactive map of the Anjunabeats, Anjunadeep and Anjunachill catalogue. An unaffiliated fan project.',
        theme_color: '#0b0d12',
        background_color: '#0b0d12',
        display: 'standalone',
        orientation: 'any',
        // Relative so the manifest survives a subpath deploy.
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the shell *and* the catalogue, so the whole map works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,json}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/itunes/],
        runtimeCaching: [
          {
            // Artwork is immutable per release — keep it, but bounded.
            urlPattern: /^https:\/\/is\d+-ssl\.mzstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'itunes-artwork',
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Search results change rarely; serve fast, refresh in background.
            urlPattern: /^https:\/\/itunes\.apple\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'itunes-api',
              expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/itunes': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/itunes/, ''),
      },
    },
  },
})
