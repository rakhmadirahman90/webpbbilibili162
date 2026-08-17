import fs from 'node:fs';

const file = 'src/components/ImagePopup.tsx';
let source = fs.readFileSync(file, 'utf8');

const oldBlock = `      let canonicalList: any[] = [];
      if (siteLoaded) {
        canonicalList = sitePopups;
      } else if (apiItems.length > 0) {
        canonicalList = apiItems;
      } else if (dbItems.length > 0) {
        canonicalList = dbItems;
      } else {
        canonicalList = [OFFICIAL_LATEST_POPUP];
      }
`;

const newBlock = `      // POPUP_PUBLIC_DB_AUTHORITATIVE: Supabase is the single source of truth.
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
`;

if (!source.includes('POPUP_PUBLIC_DB_AUTHORITATIVE')) {
  if (!source.includes(oldBlock)) {
    throw new Error('[popup-public-db-authoritative] canonical popup source block not found');
  }
  source = source.replace(oldBlock, newBlock);
}

fs.writeFileSync(file, source, 'utf8');
console.log('[popup-public-db-authoritative] Supabase konfigurasi_popup is now the public popup source of truth');
