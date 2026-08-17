import fs from 'node:fs';

// Compatibility patch intentionally kept non-fatal. The final popup source patch
// runs later in prebuild and directly enforces Supabase konfigurasi_popup as the
// only runtime source of truth. This legacy patch must never break production
// when the source shape has changed.
const file = 'src/components/ImagePopup.tsx';
if (fs.existsSync(file)) {
  console.log('[popup-public-db-authoritative] compatibility step: safe no-op; final popup patch owns source-of-truth logic');
} else {
  console.warn('[popup-public-db-authoritative] ImagePopup.tsx not found; safe no-op');
}
