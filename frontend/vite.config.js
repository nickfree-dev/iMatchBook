import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Remove base: './' — it breaks React Router's history-based routing.
  // With '/' (default), the router works correctly with pushState.
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'iMatchBook',
        short_name: 'iMatchBook',
        description: 'Real Estate Rental Bookkeeping',
        theme_color: '#312e81',
        background_color: '#020617',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    // In dev, proxy /backend/* requests to the PHP backend container
    port: 5173,
    proxy: {
      '/backend': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
