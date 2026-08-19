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
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx') || id.includes('file-saver')) return;
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('@supabase')) return 'vendor-supabase';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('swiper') || id.includes('react-easy-crop') || id.includes('react-zoom-pan-pinch')) return 'vendor-media';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('firebase') || id.includes('@google/')) return 'vendor-integrations';
          if (id.includes('sweetalert2') || id.includes('date-fns') || id.includes('uuid')) return 'vendor-utils';
          if (id.includes('react/') || id.includes('react-dom')) return 'vendor-react';
          return 'vendor-core';
        },
      },
    },
  },
});
