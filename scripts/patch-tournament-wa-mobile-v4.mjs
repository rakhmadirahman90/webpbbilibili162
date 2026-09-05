import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(file, 'utf8');

// Add the WhatsApp icon import without creating a duplicate import token.
if (!src.includes('MessageCircle } from \'lucide-react\'')) {
  src = src.replace("ShieldCheck } from 'lucide-react';", "ShieldCheck, MessageCircle } from 'lucide-react';");
}

// Build the WhatsApp URL from the participant row. This is intentionally a plain
// anchor target so Android Chrome treats it as a normal user navigation.
if (!src.includes('function buildTournamentWhatsAppUrl(row: Registration)')) {
  const marker = "function publicOrPathUrl(value?: string | null) { const v = clean(value); return /^https?:\\/\\//i.test(v) ? v : ''; }";
  const helper = `${marker}

function normalizeTournamentWhatsApp(raw: unknown) {
  let digits = String(raw ?? '').replace(/\\D/g, '');
  if (digits.startsWith('620')) digits = '62' + digits.slice(3);
  else if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}

function buildTournamentWhatsAppUrl(row: Registration) {
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
`;
  if (!src.includes(marker)) throw new Error('Marker publicOrPathUrl tidak ditemukan pada V2.');
  src = src.replace(marker, helper);
}

// Replace the whole Actions component safely. No nested template literals are
// used here, preventing the build-time `Unexpected identifier 'flex'` failure.
const start = src.indexOf('function Actions({');
const end = src.indexOf('function DetailModal({', start);
if (start < 0 || end < 0) throw new Error('Blok Actions/DetailModal V2 tidak ditemukan.');

const newActions = `function Actions({onDetail,onEdit,onPayment,onAccept,onReject,onDelete,paymentVerified,registrationPending,full=false,row}:{onDetail:()=>void,onEdit:()=>void,onPayment:()=>void,onAccept:()=>void,onReject:()=>void,onDelete:()=>void,paymentVerified:boolean,registrationPending:boolean,full?:boolean,row:Registration}){
  const actionClass = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg';
  return <div className={'flex ' + (full ? 'w-full ' : '') + 'flex-wrap gap-1.5'}>
    <button type="button" title="Lihat detail & dokumen" onClick={onDetail} className={actionClass + ' border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-100'}><Eye size={14}/> Detail</button>
    <button type="button" title="Edit data + foto + KTP + bukti pembayaran" onClick={onEdit} className={actionClass + ' border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-100'}><Pencil size={14}/> Edit</button>
    {!paymentVerified&&<button type="button" title="Verifikasi pembayaran" onClick={onPayment} className={actionClass + ' border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100'}><CreditCard size={14}/> Bayar</button>}
    {registrationPending&&<><button type="button" title="Terima" onClick={onAccept} className={actionClass + ' bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700'}><CheckCircle2 size={14}/> Terima</button><button type="button" title="Tolak" onClick={onReject} className={actionClass + ' bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700'}><XCircle size={14}/> Tolak</button></>}
    {!registrationPending&&<a href={buildTournamentWhatsAppUrl(row)} target="_blank" rel="noopener noreferrer" title="Kirim konfirmasi status melalui WhatsApp" aria-label="Kirim konfirmasi status melalui WhatsApp" className={actionClass + ' border border-green-200 bg-green-50 px-2.5 text-[10px] font-black text-green-700 hover:bg-green-100'}><MessageCircle size={14}/> WA</a>}
    <button type="button" title="Hapus" onClick={onDelete} className={actionClass + ' border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100'}><Trash2 size={14}/> Hapus</button>
  </div>;
}
`;

src = src.slice(0, start) + newActions + src.slice(end);

// Ensure both desktop and mobile callers pass their actual participant row.
src = src.replace(
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'}/>',
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} row={row}/>'
);
src = src.replace(
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} full/>',
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} full row={row}/>'
);

fs.writeFileSync(file, src);
console.log('[patch-tournament-wa-mobile-v4] Fixed build-safe WhatsApp action for desktop and mobile participant cards.');
