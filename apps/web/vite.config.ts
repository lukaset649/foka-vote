import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// 30 days
const MEDIA_CACHE_MAX_AGE_SECONDS = 2592000;
const API_CACHE_NAME = 'api-v1';
// 7 days
const API_CACHE_MAX_AGE_SECONDS = 604800;

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
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              url.pathname.startsWith('/media/') &&
              url.pathname.endsWith('-thumb.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-thumbs',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: MEDIA_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              url.pathname.startsWith('/media/') &&
              url.pathname.endsWith('-preview.webp'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-previews',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: MEDIA_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin &&
              /^\/api\/(contests(\/[^/]+(\/(submissions|results))?)?|gallery\/albums(\/[^/]+)?)$/.test(
                url.pathname,
              ),
            handler: 'NetworkFirst',
            options: {
              cacheName: API_CACHE_NAME,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: API_CACHE_MAX_AGE_SECONDS,
                purgeOnQuotaError: true,
              },
              cacheableResponse: { statuses: [200] },
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
    host: '0.0.0.0',
    port: 5173,
  },
  preview: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
    },
  },
});
