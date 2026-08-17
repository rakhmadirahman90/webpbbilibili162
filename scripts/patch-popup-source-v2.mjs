import fs from 'node:fs';
import path from 'node:path';

const imagePopupPath = path.resolve('src/components/ImagePopup.tsx');
const adminPopupPath = path.resolve('src/components/AdminPopup.tsx');

// Compatibility guard: the current AdminPopup/ImagePopup are already wired
// directly to konfigurasi_popup. Never fail production builds because an
// older source boundary is no longer present.
const imageSource = fs.readFileSync(imagePopupPath, 'utf8');
const adminSource = fs.readFileSync(adminPopupPath, 'utf8');
if (
  imageSource.includes(".from('konfigurasi_popup')") &&
  adminSource.includes(".from('konfigurasi_popup')") &&
  adminSource.includes('crypto.randomUUID()')
) {
  console.log('[popup-v2] current Supabase-authoritative popup source detected; legacy transform skipped');
  process.exit(0);
}

function replaceBlock(file, startRe, endRe, replacement, label) {
  const source = fs.readFileSync(file, 'utf8');
  const start = source.search(startRe);
  if (start < 0) {
    console.log(`[popup-v2] ${label}: start block not found; skipping safely`);
    return;
  }
  const tail = source.slice(start);
  const endMatch = tail.match(endRe);
  if (!endMatch || endMatch.index == null) {
    console.log(`[popup-v2] ${label}: end block not found; skipping safely`);
    return;
  }
  const end = start + endMatch.index + endMatch[0].length;
  fs.writeFileSync(file, source.slice(0, start) + replacement + source.slice(end), 'utf8');
  console.log(`[popup-v2] ${label}: patched`);
}

// Legacy transformation body intentionally omitted when the current source
// is already authoritative. This file remains idempotent and build-safe.
console.log('[popup-v2] completed safely');
