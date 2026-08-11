import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/]react(?:-dom)?[\\/]/ },
            { name: 'supabase-vendor', test: /node_modules[\\/]@supabase[\\/]/ },
            { name: 'motion-vendor', test: /node_modules[\\/]framer-motion[\\/]/ },
            { name: 'charts-vendor', test: /node_modules[\\/]recharts[\\/]/ },
            { name: 'document-vendor', test: /node_modules[\\/](jspdf|html2canvas|xlsx)[\\/]/ },
            { name: 'ui-vendor', test: /node_modules[\\/](lucide-react|swiper|sweetalert2)[\\/]/ },
          ],
        },
      },
    },
  },
});
