import fs from 'node:fs';

const componentPath = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(componentPath, 'utf8');
let changes = 0;

// The live admin route renders V2, so payment labels must be patched here.
if (!src.includes('paymentDisplayLabel')) {
  const marker = "const statusPay = (v?: string) => { const s = clean(v).toLowerCase(); return s.includes('terver') || s.includes('lunas') || s.includes('diterima') ? 'terverifikasi' : 'menunggu'; };";
  if (!src.includes(marker)) throw new Error('[patch-payment-dashboard-v2] statusPay marker not found');
  src = src.replace(marker, `${marker}\nconst paymentDisplayLabel = (v?: string) => statusPay(v) === 'terverifikasi' ? 'Lunas' : 'Belum Lunas';`);
  changes++;
}

const replacements = [
  ["(paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus)", "(paymentStatus === 'Semua' || paymentDisplayLabel(r.status_pembayaran) === paymentStatus)"],
  ["options={['Semua','menunggu','terverifikasi']}", "options={['Semua','Belum Lunas','Lunas']}"] ,
  ['<Stat label="Pembayaran OK" value={stats.paid} icon={<CreditCard size={17}/>} />', '<Stat label="Lunas" value={stats.paid} icon={<CreditCard size={17}/>} />'],
  ["title: 'Verifikasi pembayaran?'", "title: 'Tandai pembayaran Lunas?'"],
  ["confirmButtonText: 'Verifikasi'", "confirmButtonText: 'Simpan Lunas'"],
  ["status_pembayaran: 'Terverifikasi'", "status_pembayaran: 'Lunas'"],
  ["title: 'Pembayaran terverifikasi'", "title: 'Pembayaran Lunas'"],
  ['title="Verifikasi pembayaran"', 'title="Tandai pembayaran Lunas"'],
  ['text="Terverifikasi"', 'text="Lunas"'],
  ['text="Menunggu"', 'text="Belum Lunas"'],
  ['text="Pembayaran OK"', 'text="Lunas"'],
  ['text="Bayar Menunggu"', 'text="Belum Lunas"']
];

for (const [from, to] of replacements) {
  if (src.includes(from)) {
    src = src.replace(from, to);
    changes++;
  }
}

// Replace the payment badge condition text while preserving registration status labels.
src = src.replace(
  /ps==='terverifikasi'\?<(?:Badge|Badge)[^>]*text="Terverifikasi"[^>]*\/>:<(?:Badge|Badge)[^>]*text="Menunggu"[^>]*\/>/g,
  "paymentDisplayLabel(row.status_pembayaran)==='Lunas'?<Badge text=\"Lunas\" tone=\"green\"/>:<Badge text=\"Belum Lunas\" tone=\"amber\"/>"
);
src = src.replace(
  /ps==='terverifikasi'\?<Badge text="Pembayaran OK" tone="green"\/>:<Badge text="Bayar Menunggu" tone="amber"\/>/g,
  "paymentDisplayLabel(row.status_pembayaran)==='Lunas'?<Badge text=\"Lunas\" tone=\"green\"/>:<Badge text=\"Belum Lunas\" tone=\"amber\"/>"
);

src = src.replace(
  'function Stat({label,value,icon}:{label:string,value:number,icon:React.ReactNode})',
  'function Stat({label,value,icon}:{label:string,value:React.ReactNode,icon:React.ReactNode})'
);

// Accessibility/readability fix for the tournament registration edit modal.
// The screenshot showed inherited white/transparent text on white inputs and document fields.
// Keep dark header/button text-white intact; only override white text in the modal and form controls.
const readabilityMarker = '/* tournament-edit-readable-v1 */';
if (!src.includes(readabilityMarker)) {
  const css = `<style>{\`\n${readabilityMarker}\n.tournament-admin-page .fixed.inset-0 input,\n.tournament-admin-page .fixed.inset-0 textarea,\n.tournament-admin-page .fixed.inset-0 select,\n.tournament-admin-page .fixed.inset-0 input.text-white,\n.tournament-admin-page .fixed.inset-0 textarea.text-white,\n.tournament-admin-page .fixed.inset-0 select.text-white { color:#111827 !important; -webkit-text-fill-color:#111827 !important; opacity:1 !important; }\n.tournament-admin-page .fixed.inset-0 input::placeholder,\n.tournament-admin-page .fixed.inset-0 textarea::placeholder { color:#64748b !important; opacity:1 !important; -webkit-text-fill-color:#64748b !important; }\n.tournament-admin-page .fixed.inset-0 .text-white:not(button):not(a):not([role=\"button\"]),\n.tournament-admin-page .fixed.inset-0 [class*=\"text-white/\"]:not(button):not(a):not([role=\"button\"]) { color:#111827 !important; }\n.tournament-admin-page .fixed.inset-0 label,\n.tournament-admin-page .fixed.inset-0 p,\n.tournament-admin-page .fixed.inset-0 small { color:#334155; }\n.tournament-admin-page .fixed.inset-0 button { -webkit-text-fill-color:currentColor; }\n\`}</style>`;
  const rootMarker = 'return <div className="tournament-admin-page';
  if (!src.includes(rootMarker)) throw new Error('[patch-payment-dashboard-v2] edit modal root marker not found');
  src = src.replace(rootMarker, `${css}\n  ${rootMarker}`);
  changes++;
}

fs.writeFileSync(componentPath, src);

const required = [
  'const paymentDisplayLabel =',
  "options={['Semua','Belum Lunas','Lunas']}",
  'Tandai pembayaran Lunas?',
  "status_pembayaran: 'Lunas'",
  'Pembayaran Lunas',
  'text="Lunas"',
  'text="Belum Lunas"',
  'tournament-edit-readable-v1',
  '-webkit-text-fill-color:#111827'
];
for (const marker of required) {
  if (!src.includes(marker)) throw new Error(`[patch-payment-dashboard-v2] required UI marker missing: ${marker}`);
}

console.log(`[patch-payment-dashboard-v2] applied ${changes} direct replacements; V2 payment labels + edit readability verified`);
