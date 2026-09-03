import fs from 'node:fs';

const path='src/components/AdminPendaftaranTurnamenModern.tsx';
let src=fs.readFileSync(path,'utf8');

// Keep the existing participant WhatsApp notification implementation intact.
// This patch corrects the event date and ensures every successful admin
// verification message includes the official participant WhatsApp group.
const before='09–12 September 2026';
const after='08–12 September 2026';

if(src.includes(before)){
  src=src.split(before).join(after);
}

// Also handle ASCII hyphen variants from older generated bundles.
src=src.split('09-12 September 2026').join('08-12 September 2026');
src=src.split('09 — 12 September 2026').join('08 — 12 September 2026');
src=src.split('09 – 12 September 2026').join('08 – 12 September 2026');

const groupUrl='https://chat.whatsapp.com/Bs7TWJMPB2v78GTcTl30vO';
const groupBlock=`    '',\n    '*INFO & GRUP WHATSAPP PESERTA*',\n    'Silakan bergabung ke grup WhatsApp resmi peserta PB BILIBILI 162 untuk mendapatkan informasi pertandingan, jadwal, pengumuman, dan koordinasi peserta.',\n    '*Panitia PB BILIBILI 162*',\n    '${groupUrl}'`;

// The v2 helper is injected before this v4 patch during production builds.
// Insert a literal string into the generated TypeScript; do not reference
// this build-script variable from the generated application.
const panitiaLine="    '*Panitia PB BILIBILI 162*'";
if(src.includes('function buildVerifiedWAUrl') && src.includes(panitiaLine) && !src.includes(groupUrl)){
  src=src.replace(panitiaLine, groupBlock);
}

fs.writeFileSync(path,src);
console.log('[patch-wa-v4] verification notification uses 08–12 September 2026 and includes official participant WhatsApp group');
