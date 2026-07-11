import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
    // Keep a single React instance so Framer Motion's hooks share the app's
    // React (avoids "Invalid hook call" from duplicate module instances).
    dedupe: ['react', 'react-dom'],
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'motion', 'motion/react'],
  },

  server: {
    watch: {
      // Never watch build output. The dev-server file watcher otherwise holds
      // a handle on release/win-unpacked.tmp and makes electron-builder's
      // rename fail with EPERM when a build runs while the dev server is up.
      ignored: ['**/release/**', '**/release', '**/dist/**', '**/dist'],
    },
  },

  assetsInclude: ['**/*.svg', '**/*.csv'],
});
