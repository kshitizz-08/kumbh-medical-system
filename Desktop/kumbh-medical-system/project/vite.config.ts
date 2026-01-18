import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Nashik Kumbh Mela Medical Seva',
        short_name: 'Kumbh Medical',
        description: 'Godavari Ghat emergency care & digital medical records',
        theme_color: '#ea580c',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom'],
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'face-api': ['face-api.js'],
          'lucide-icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '0.0.0.0', // Allow access from all network interfaces (required for ngrok)
    port: 5173, // Default Vite port - change if needed
    strictPort: false, // Use next available port if 5173 is taken
    // Allow all hosts for development (includes ngrok domains)
    // This fixes the "Blocked request. This host is not allowed" error
    // WARNING: Only use 'all' in development, not in production!
    allowedHosts: 'all',
    // For HMR (Hot Module Replacement) to work through ngrok
    hmr: {
      // When using ngrok with HTTPS, use port 443
      // When using HTTP, you might need to adjust this
      protocol: 'ws',
      host: 'localhost',
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: 'all',
  },
});
