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
      // 'prompt', not 'autoUpdate': an installed copy could otherwise keep
      // serving a cached build indefinitely without telling anyone. The new
      // worker waits, and <UpdatePrompt> offers the refresh.
      registerType: 'prompt',
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
        globPatterns: ['**/*.{js,css,html,svg,png,json,woff2}'],
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
          // The iTunes *API* is deliberately NOT cached here. Its responses are
          // origin-specific but carry no `Vary: Origin`, so a cached copy can
          // be replayed against the wrong origin and fail CORS; and caching an
          // opaque (status 0) response would leave an unreadable body behind
          // for good. src/itunes.ts fetches it with `cache: 'no-store'`.
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
