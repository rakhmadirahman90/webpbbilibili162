import fs from 'node:fs';

const path='src/components/AdminPendaftaranTurnamenModern.tsx';
let src=fs.readFileSync(path,'utf8');

// Keep the existing participant WhatsApp notification implementation intact.
// This patch only corrects the tournament event date and is intentionally
// idempotent so repeated production builds cannot fail on source boundaries.
const before='09–12 September 2026';
const after='08–12 September 2026';

if(src.includes(before)){
  src=src.split(before).join(after);
}

// Also handle ASCII hyphen variants from older generated bundles.
src=src.split('09-12 September 2026').join('08-12 September 2026');
src=src.split('09 — 12 September 2026').join('08 — 12 September 2026');
src=src.split('09 – 12 September 2026').join('08 – 12 September 2026');

fs.writeFileSync(path,src);
console.log('[patch-wa-v4] participant WhatsApp notification event dates set to 08–12 September 2026');
