import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative asset paths so one build works everywhere: at a domain root
  // (anjunatree.com) and at a project subpath (user.github.io/anjunatree/).
  // Safe here because all app state lives in the URL hash, not in paths.
  base: './',
  plugins: [react()],
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
