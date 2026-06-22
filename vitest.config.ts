import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Config dédiée aux tests : pas de plugin PWA, environnement jsdom.
// JSX en runtime automatique (react/jsx-runtime) → pas besoin d'importer React.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
})
