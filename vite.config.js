import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Clear output directory before building
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Bundle all core modules into a single file
        // Vite will automatically bundle all dependencies of app.js
        manualChunks(id) {
          // Keep plugins as separate chunks (they're loaded dynamically)
          if (id.includes('/js/plugins/')) {
            return 'plugin';
          }
          // Bundle everything else together
          return 'app';
        }
      }
    },
    // Don't minify for easier debugging (can enable later)
    minify: false,
    // Output to dist folder
    outDir: 'dist',
    // Keep source maps for debugging
    sourcemap: true,
    // Target modern browsers
    target: 'es2020'
  },
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to Python server
      '/files': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/save-audio': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/save-default.json': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/default.json': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
});

