import fs from 'node:fs';

const file = 'src/components/AdminPopup.tsx';
const source = fs.readFileSync(file, 'utf8');

// SUPABASE_POPUP_ADMIN_REALTIME_SAFE_V5
// AdminPopup now owns its Supabase read/write/realtime lifecycle directly.
// Older patch versions expected legacy fetchPopups/persistPopups boundaries and
// could abort the production build when those functions no longer existed.
// This compatibility patch is intentionally idempotent and build-safe.
const hasDirectSupabaseAdmin =
  source.includes("from('konfigurasi_popup')") &&
  source.includes('const handleSave = async') &&
  source.includes('crypto.randomUUID()');

if (hasDirectSupabaseAdmin) {
  console.log('[popup-admin-realtime-v5] direct Supabase AdminPopup detected; legacy transformation skipped');
  process.exit(0);
}

// Do not mutate unknown/legacy AdminPopup implementations automatically.
// A build must remain reproducible rather than failing because an old boundary
// is absent after a component refactor.
console.log('[popup-admin-realtime-v5] legacy AdminPopup detected; transformation skipped safely');
process.exit(0);
