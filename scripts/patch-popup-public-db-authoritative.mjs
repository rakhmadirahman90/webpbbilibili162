import fs from 'node:fs';

const file = 'src/components/ImagePopup.tsx';
let source = fs.readFileSync(file, 'utf8');

// The popup component has received several source-safe patches over time, so
// do not depend on one exact whitespace/version of the old canonical block.
// Replace the canonical-source decision only when the authoritative marker is
// not already present.
if (!source.includes('POPUP_PUBLIC_DB_AUTHORITATIVE')) {
  const blockRegex = /      let canonicalList: any\[\] = \[\];\n(?:.|\n)*?      const dbMap = new Map\(dbItems\.map\(\(p: any\) => \[p\.id, p\]\)\);/;

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

  if (!blockRegex.test(source)) {
    throw new Error('[popup-public-db-authoritative] canonical popup source block not found in current source');
  }

  source = source.replace(blockRegex, replacement);
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-public-db-authoritative] Supabase konfigurasi_popup is now the public popup source of truth');
