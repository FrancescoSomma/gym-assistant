/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false, // UpdatePrompt registers it through useRegisterSW
      // The icons already match globPatterns: adding them again duplicates entries and cache.addAll fails.
      includeManifestIcons: false,
      // No "webmanifest" here: the plugin adds it already, and duplicates make cache.addAll fail.
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,woff2}'] },
      manifest: {
        name: 'Palestra',
        short_name: 'Palestra',
        lang: 'it',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        background_color: '#1F1E1C',
        theme_color: '#1F1E1C',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
});
