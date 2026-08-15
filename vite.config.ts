import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function patchKelolaSuratSaveRefresh(): Plugin {
  return {
    name: 'patch-kelola-surat-save-refresh',
    buildStart() {
      const file = path.resolve('src/components/KelolaSurat.tsx');
      if (!fs.existsSync(file)) return;
      const source = fs.readFileSync(file, 'utf8');
      const oldText = '      await fetchSurat();';
      const newText = `      // Refresh is best-effort and must never keep the Save button spinning.\n      void Promise.race([\n        fetchSurat(),\n        new Promise(resolve => setTimeout(resolve, 5000)),\n      ]).catch(err => console.warn('[KelolaSurat] background refresh failed:', err));`;
      if (!source.includes(oldText)) return;
      fs.writeFileSync(file, source.replace(oldText, newText), 'utf8');
      console.log('[KelolaSurat] patched post-save refresh to non-blocking background refresh');
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [patchKelolaSuratSaveRefresh(), react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'vendor-docs';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
