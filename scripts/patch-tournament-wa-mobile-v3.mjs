import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(file, 'utf8');

// Mobile Chrome/Android lebih konsisten membuka WhatsApp melalui anchor link
// hasil klik pengguna daripada window.location/window.open yang dipanggil dari handler.
const helperMarker = "function openTournamentWhatsApp(row: Registration) {";
const start = src.indexOf(helperMarker);
if (start < 0) {
  console.log('[patch-tournament-wa-mobile-v3] V2 WhatsApp helper not found; no-op');
  process.exit(0);
}

const fnEnd = src.indexOf('\n}\n', start);
if (fnEnd < 0) throw new Error('WhatsApp helper end not found.');

const oldFn = src.slice(start, fnEnd + 3);
const newFn = `function buildTournamentWhatsAppUrl(row: Registration) {
  const phone = normalizeTournamentWhatsApp(row.whatsapp);
  if (!phone || phone.length < 10) return '';
  const message = [
    '*KONFIRMASI STATUS PENDAFTARAN*',
    '*BILIBILI 162 CUP I TAHUN 2026*',
    '',
    'Halo Penanggung Jawab,',
    'Pendaftaran pasangan dengan kode *' + clean(row.kode_pendaftaran) + '* telah diperbarui oleh Admin.',
    '',
    '*STATUS: DITERIMA & DIVERIFIKASI*',
    '',
    '• Pemain 1: *' + clean(row.nama_pemain_1) + '*',
    '• Pemain 2: *' + clean(row.nama_pemain_2) + '*',
    '• Kategori: ' + (clean(row.kategori) || '-'),
    '• PB/Klub: ' + (clean(row.asal_pb) || '-'),
    '• Domisili: ' + (clean(row.domisili) || '-'),
    '• Pembayaran: ' + (clean(row.status_pembayaran) || '-'),
    '',
    'Selamat, pasangan Anda telah dinyatakan *DITERIMA* sebagai peserta Bilibili 162 Cup I 2026.',
    '',
    'Pelaksanaan: 09–12 September 2026',
    'Lokasi: GOR Titik Kumpul Soreang Parepare',
    '',
    '*Pengurus PB BILIBILI 162*'
  ].join('\\n');
  return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(message);
}

function openTournamentWhatsApp(row: Registration) {
  const url = buildTournamentWhatsAppUrl(row);
  if (!url) {
    void Swal.fire({ icon: 'warning', title: 'Nomor WhatsApp Tidak Valid', text: 'Nomor WhatsApp Penanggung Jawab belum tersedia atau tidak valid pada data peserta.', confirmButtonColor: '#2563eb' });
    return;
  }
  window.location.assign(url);
}`;

src = src.slice(0, start) + newFn + src.slice(start + oldFn.length);

const oldButton = 'onClick={()=>void openTournamentWhatsApp(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-[10px] font-black text-green-700 hover:bg-green-100"><MessageCircle size={14}/> WA</button>';
const newButton = 'href={buildTournamentWhatsAppUrl(row)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-[10px] font-black text-green-700 hover:bg-green-100"><MessageCircle size={14}/> WA</a>';
if (!src.includes(oldButton)) {
  console.log('[patch-tournament-wa-mobile-v3] Old WA button pattern not found; no-op');
  process.exit(0);
}
src = src.replace('<button type="button" title="Kirim konfirmasi status melalui WhatsApp" aria-label="Kirim konfirmasi status melalui WhatsApp" ' + oldButton, '<a title="Kirim konfirmasi status melalui WhatsApp" aria-label="Kirim konfirmasi status melalui WhatsApp" ' + newButton);

fs.writeFileSync(file, src);
console.log('[patch-tournament-wa-mobile-v3] WA mobile button converted to direct anchor link for Android Chrome.');
