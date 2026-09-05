import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
let src = fs.readFileSync(file, 'utf8');

// Pastikan ikon WhatsApp tersedia di komponen yang benar-benar dipakai route /admin/pendaftaran-turnamen.
src = src.replace(
  "ShieldCheck } from 'lucide-react';",
  "ShieldCheck, MessageCircle } from 'lucide-react';"
);

const helperMarker = "function publicOrPathUrl(value?: string | null) { const v = clean(value); return /^https?:\\/\\//i.test(v) ? v : ''; }";
const helper = `${helperMarker}

function normalizeTournamentWhatsApp(raw: unknown) {
  let digits = String(raw ?? '').replace(/\\D/g, '');
  if (digits.startsWith('620')) digits = '62' + digits.slice(3);
  else if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}

function openTournamentWhatsApp(row: Registration) {
  const phone = normalizeTournamentWhatsApp(row.whatsapp);
  if (!phone || phone.length < 10) {
    void Swal.fire({
      icon: 'warning',
      title: 'Nomor WhatsApp Tidak Valid',
      text: 'Nomor WhatsApp Penanggung Jawab belum tersedia atau tidak valid pada data peserta.',
      confirmButtonColor: '#2563eb'
    });
    return;
  }

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

  // Navigasi langsung lebih andal pada Chrome Android daripada window.open().
  window.location.assign('https://wa.me/' + phone + '?text=' + encodeURIComponent(message));
}
`;

if (!src.includes('function openTournamentWhatsApp(row: Registration)')) {
  if (!src.includes(helperMarker)) throw new Error('Marker publicOrPathUrl tidak ditemukan pada V2.');
  src = src.replace(helperMarker, helper);
}

const startToken = 'function Actions({';
const endToken = 'function DetailModal({';
const start = src.indexOf(startToken);
const end = src.indexOf(endToken, start);
if (start < 0 || end < 0) throw new Error('Blok Actions/DetailModal V2 tidak ditemukan.');

const newActions = `function Actions({onDetail,onEdit,onPayment,onAccept,onReject,onDelete,paymentVerified,registrationPending,full=false}:{onDetail:()=>void,onEdit:()=>void,onPayment:()=>void,onAccept:()=>void,onReject:()=>void,onDelete:()=>void,paymentVerified:boolean,registrationPending:boolean,full?:boolean,row?:Registration}){
  return <div className={\`flex \${full?'w-full':''} flex-wrap gap-1.5\`}>
    <button type="button" title="Lihat detail & dokumen" onClick={onDetail} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-100"><Eye size={14}/> Detail</button>
    <button type="button" title="Edit data + foto + KTP + bukti pembayaran" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 text-[10px] font-black text-indigo-700 hover:bg-indigo-100"><Pencil size={14}/> Edit</button>
    {!paymentVerified&&<button type="button" title="Verifikasi pembayaran" onClick={onPayment} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><CreditCard size={14}/> Bayar</button>}
    {registrationPending&&<><button type="button" title="Terima" onClick={onAccept} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700"><CheckCircle2 size={14}/> Terima</button><button type="button" title="Tolak" onClick={onReject} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700"><XCircle size={14}/> Tolak</button></>}
    {!registrationPending&&<button type="button" title="Kirim konfirmasi status melalui WhatsApp" aria-label="Kirim konfirmasi status melalui WhatsApp" onClick={()=>void openTournamentWhatsApp(arguments as unknown as Registration)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-[10px] font-black text-green-700 hover:bg-green-100"><MessageCircle size={14}/> WA</button>}
    <button type="button" title="Hapus" onClick={onDelete} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14}/> Hapus</button>
  </div>;
}
`;

// Ganti signature dan panggilan Actions agar row dikirim ke tombol WA.
src = src.slice(0, start) + newActions + src.slice(end);
src = src.replace(
  'function Actions({onDetail,onEdit,onPayment,onAccept,onReject,onDelete,paymentVerified,registrationPending,full=false}:{onDetail:()=>void,onEdit:()=>void,onPayment:()=>void,onAccept:()=>void,onReject:()=>void,onDelete:()=>void,paymentVerified:boolean,registrationPending:boolean,full?:boolean})',
  'function Actions({onDetail,onEdit,onPayment,onAccept,onReject,onDelete,paymentVerified,registrationPending,full=false,row}:{onDetail:()=>void,onEdit:()=>void,onPayment:()=>void,onAccept:()=>void,onReject:()=>void,onDelete:()=>void,paymentVerified:boolean,registrationPending:boolean,full?:boolean,row:Registration})'
);
src = src.replace(
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'}/>',
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} row={row}/>'
);
src = src.replace(
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} full/>',
  'onDelete={onDelete} paymentVerified={ps===\'terverifikasi\'} registrationPending={rs===\'pending\'} full row={row}/>'
);

// Hindari argumen implisit; gunakan row yang benar pada tombol WA.
src = src.replace(
  'onClick={()=>void openTournamentWhatsApp(arguments as unknown as Registration)}',
  'onClick={()=>void openTournamentWhatsApp(row)}'
);

fs.writeFileSync(file, src);
console.log('[patch-tournament-wa-mobile-v2] WhatsApp action added to the actual V2 admin participant cards.');
