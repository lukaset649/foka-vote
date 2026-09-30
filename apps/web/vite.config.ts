import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        id: '/',
        name: 'FOKA Vote',
        short_name: 'FOKA Vote',
        description:
          'Photography club contest tool: anonymous submissions, weighted voting, public results.',
        lang: 'pl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#fafafa',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^[0-9a-f]{32}$/],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/media\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
