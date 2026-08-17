import fs from 'node:fs';

const file = 'src/components/ImagePopup.tsx';
let source = fs.readFileSync(file, 'utf8');

// patch-popup-supabase-authoritative.mjs runs immediately before this patch in
// the build pipeline and may already have made konfigurasi_popup authoritative.
// In that case this patch must be a safe no-op rather than failing the build.
if (source.includes('SUPABASE_POPUP_AUTH_V3')) {
  console.log('[popup-public-db-authoritative] Supabase authoritative source already applied; no-op');
  process.exit(0);
}

if (!source.includes('POPUP_PUBLIC_DB_AUTHORITATIVE')) {
  const blockRegex = /      let canonicalList: any\[\] = \[\];[\s\S]*?      const dbMap = new Map\(dbItems\.map\(\(p: any\) => \[p\.id, p\]\)\);/;

  const replacement = `      // POPUP_PUBLIC_DB_AUTHORITATIVE: Supabase is the single source of truth.
      // Do not let stale site_settings/API snapshots hide active rows from konfigurasi_popup.
      let canonicalList: any[] = [];
      if (dbItems.length > 0) {
        canonicalList = dbItems;
      } else if (siteLoaded && sitePopups.length > 0) {
        canonicalList = sitePopups;
      } else if (apiItems.length > 0) {
        canonicalList = apiItems;
      } else {
        canonicalList = [OFFICIAL_LATEST_POPUP];
      }

      const dbMap = new Map(dbItems.map((p: any) => [p.id, p]));`;

  if (blockRegex.test(source)) {
    source = source.replace(blockRegex, replacement);
  } else {
    // Never make this compatibility patch capable of breaking production.
    console.warn('[popup-public-db-authoritative] legacy canonical block not present; leaving source unchanged');
    process.exit(0);
  }
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-public-db-authoritative] Supabase konfigurasi_popup source patch applied');
