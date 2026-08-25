import { execFileSync } from 'node:child_process';

const scripts = [
  'patch-performance-v2.mjs',
  'patch-gallery-source.mjs',
  'patch-gallery-share-preview.mjs',
  'patch-news-share-preview.mjs',
  'patch-header-datetime-v2.mjs',
  'patch-import-surat.mjs'
];

for (const script of scripts) {
  execFileSync(process.execPath, [`scripts/${script}`], { stdio: 'inherit' });
}
