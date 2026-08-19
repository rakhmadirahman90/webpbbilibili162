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
    // Keep Rollup's dependency graph intact for the critical application shell.
    // The previous manualChunks rules created a circular vendor-core <->
    // vendor-react dependency graph, which can leave mobile browsers stuck on
    // the static boot screen even though the Vercel build itself is READY.
    // Route-level React.lazy() chunks still provide code-splitting for heavy
    // pages without forcing fragile vendor boundaries.
  },
});
