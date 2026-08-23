import fs from 'node:fs';

const file = 'src/components/KasRealtimeNotifier.tsx';
if (!fs.existsSync(file)) process.exit(0);

let source = fs.readFileSync(file, 'utf8');

if (source.includes('showCloseButton: true')) {
  console.log('[patch-kas-notifier-close] already patched');
  process.exit(0);
}

const marker = 'Swal.fire({';
const index = source.indexOf(marker);
if (index < 0) {
  console.warn('[patch-kas-notifier-close] Swal.fire target not found');
  process.exit(0);
}

const replacement = `Swal.fire({\n          showCloseButton: true,\n          closeButtonHtml: '<span aria-hidden="true" style="font-size:24px;line-height:1;font-weight:700">×</span>',\n          closeButtonAriaLabel: 'Tutup laporan kas',`;
source = source.slice(0, index) + replacement + source.slice(index + marker.length);

fs.writeFileSync(file, source, 'utf8');
console.log('[patch-kas-notifier-close] added accessible close button to realtime kas notification');
