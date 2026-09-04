import { execFileSync } from 'node:child_process';

execFileSync('npm', ['install', 'vite@5.4.2', '--no-save', '--ignore-scripts'], { stdio: 'inherit' });

const scripts = [
  'patch-navbar-jsx-fix.mjs',
  'patch-performance-v2.mjs',
  'patch-gallery-source.mjs',
  'patch-gallery-share-preview.mjs',
  'patch-news-share-preview.mjs',
  'patch-header-datetime-v2.mjs',
  'patch-import-surat.mjs',
  'patch-admin-tournament-api.mjs',
  'patch-tournament-status-whatsapp.mjs',
  'patch-tournament-wa-popup.mjs',
  'patch-registration-whatsapp-direct.mjs',
  'patch-payment-dashboard.mjs',
  'patch-admin-participant-doc-edit-safe.mjs',
  'patch-kas-modern-ui.mjs'
];

console.log('[build-prep] running stable production preparation scripts');
for (const script of scripts) {
  execFileSync(process.execPath, ['scripts/' + script], { stdio: 'inherit' });
}
console.log('[build-prep] production preparation complete');
