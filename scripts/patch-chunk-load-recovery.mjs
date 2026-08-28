import fs from 'node:fs';

const path = 'src/App.tsx';
let src = fs.readFileSync(path, 'utf8');

const marker = "// Lazy-Loaded Public Views";
const helper = `const lazyWithChunkRecovery = <T extends React.ComponentType<any>>(loader: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      return await loader();
    } catch (error) {
      const message = String(error instanceof Error ? error.message : error || '');
      const isChunkError = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(message);
      if (isChunkError && typeof window !== 'undefined') {
        try {
          const recoveryKey = 'pb162-chunk-recovery-v1';
          if (!sessionStorage.getItem(recoveryKey)) {
            sessionStorage.setItem(recoveryKey, '1');
            const reloadUrl = new URL(window.location.href);
            reloadUrl.searchParams.set('__pb162_reload', String(Date.now()));
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
              await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
            }
            if ('caches' in window) {
              const keys = await caches.keys().catch(() => []);
              await Promise.all(keys.map((key) => caches.delete(key).catch(() => false)));
            }
            window.location.replace(reloadUrl.toString());
          }
        } catch (_) {}
      }
      throw error;
    }
  });

`;

if (src.includes('const lazyWithChunkRecovery')) {
  console.log('Chunk-load recovery patch already present.');
} else if (!src.includes(marker)) {
  // Current App may use a different, already-stable code-splitting structure.
  // Never fail the entire production build merely because the legacy marker
  // disappeared.
  console.log('Chunk-load recovery marker not found; current App architecture requires no patch.');
} else {
  src = src.replace(marker, helper + marker);
  src = src.replace(/\blazy\(\(\) => import\(/g, 'lazyWithChunkRecovery(() => import(');
  src = src.replace(/\blazy\(\(\) => import\(([^;]+?)\)\.then\(/g, 'lazyWithChunkRecovery(() => import($1).then(');
  fs.writeFileSync(path, src);
  console.log('Chunk-load recovery patch applied.');
}
