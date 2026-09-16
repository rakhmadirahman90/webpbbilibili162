import fs from 'node:fs';

const path = 'src/components/PublicPrestasi.tsx';
let src = fs.readFileSync(path, 'utf8');
const marker = '/* __PUBLIC_PRESTASI_LEGACY_CARDS_REMOVED_V1__ */';

// The legacy cards have already been removed in the source. This build patch
// must never re-insert an internal marker into the public UI.
if (src.includes(marker)) {
  src = src.replaceAll(marker, '').replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(path, src, 'utf8');
  console.log('[patch-hide-legacy-prestasi] removed internal legacy marker from public Prestasi source.');
} else {
  console.log('[patch-hide-legacy-prestasi] no internal legacy marker found; leaving source unchanged.');
}

// Keep this patch idempotent. Legacy achievement cards and pagination are
// intentionally not recreated here; the current BILIBILI 162 Cup result
// section is the canonical Prestasi presentation.
