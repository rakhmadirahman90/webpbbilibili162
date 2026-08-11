import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'motion-vendor': ['framer-motion'],
          'charts-vendor': ['recharts'],
          'document-vendor': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'ui-vendor': ['lucide-react', 'swiper', 'sweetalert2'],
        },
      },
    },
  },
});
