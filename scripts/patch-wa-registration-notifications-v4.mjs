import fs from 'node:fs';

const path='src/components/AdminPendaftaranTurnamenModern.tsx';
let src=fs.readFileSync(path,'utf8');

if(!src.includes('function buildParticipantSuccessWAUrl')){
  const marker='function Actions(';
  const helper=`function normalizeParticipantWA(raw:string){
  const d=String(raw??'').replace(/\\D/g,'');
  if(!d)return '';
  if(d.startsWith('62'))return d;
  if(d.startsWith('0'))return '62'+d.slice(1);
  if(d.startsWith('8'))return '62'+d;
  return d;
}

function buildParticipantSuccessWAUrl(row:Registration){
  const phone=normalizeParticipantWA(row.whatsapp);
  if(!phone)return '';
  const message=[
    '*PEMBERITAHUAN PENDAFTARAN PB BILIBILI 162*',
    '*PB BILIBILI 162 CUP I TAHUN 2026*','',
    'Halo Penanggung Jawab,',
    'Pendaftaran pasangan Anda telah *BERHASIL DIVERIFIKASI ADMIN*.','',
    '• Kode Pendaftaran: *'+String(row.kode_pendaftaran||'-')+'*',
    '• Kategori: *'+String(row.kategori||'-')+'*',
    '• Pemain 1: *'+String(row.nama_pemain_1||'-')+'*',
    '• Pemain 2: *'+String(row.nama_pemain_2||'-')+'*',
    '• PB/Klub: *'+String(row.asal_pb||'-')+'*',
    '• Domisili: *'+String(row.domisili||'-')+'*',
    '• Pembayaran: *'+String(row.status_pembayaran||'-')+'*',
    '• Status: *DITERIMA & DIVERIFIKASI*','',
    'Selamat, pasangan Anda resmi terdaftar sebagai peserta.',
    '*08–12 September 2026 • GOR Titik Kumpul Soreang Parepare*',
    '*Panitia PB BILIBILI 162*'
  ].join('\\n');
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
}

`;
  if(!src.includes(marker))throw new Error('[patch-wa-v4] Actions marker not found');
  src=src.replace(marker,helper+marker);
}

const start=src.indexOf('function Actions(');
const end=src.indexOf('\\n\\nfunction DetailModal',start);
if(start<0||end<0)throw new Error('[patch-wa-v4] Actions boundaries not found');

const replacement=`function Actions({row,onDetail,onEdit,onPayment,onAccept,onReject,onDelete,full=false}:{row:Registration,onDetail:(r:Registration)=>void,onEdit:()=>void,onPayment:(r:Registration)=>void,onAccept:()=>void,onReject:()=>void,onDelete:(r:Registration)=>void,full?:boolean}){
  const rs=statusReg(row.status_pendaftaran),ps=statusPay(row.status_pembayaran);
  const participantWA=buildParticipantSuccessWAUrl(row);
  const sendParticipantWA=()=>{
    if(!participantWA){
      void Swal.fire({icon:'warning',title:'WhatsApp peserta tidak tersedia',text:'Nomor WhatsApp penanggung jawab belum tersedia pada data pendaftaran.',confirmButtonColor:'#2563eb'});
      return;
    }
    window.location.href=participantWA;
  };
  return <div className={\\`flex \\${full?'w-full':'justify-end'} flex-wrap gap-1.5\\`}>
    <button title="Lihat detail & dokumen" onClick={()=>void onDetail(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[10px] font-black text-blue-700 hover:bg-blue-100"><Eye size={14}/> Detail</button>
    <button title="Edit" onClick={onEdit} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-[10px] font-black text-slate-600 hover:bg-slate-50"><Pencil size={14}/> Edit</button>
    {ps!=='terverifikasi'&&<button title="Verifikasi pembayaran" onClick={()=>void onPayment(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"><CreditCard size={14}/> Bayar</button>}
    {rs==='pending'&&<><button title="Terima" onClick={onAccept} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-[10px] font-black text-white hover:bg-emerald-700"><CheckCircle2 size={14}/> Terima</button><button title="Tolak" onClick={onReject} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-rose-600 px-2.5 text-[10px] font-black text-white hover:bg-rose-700"><XCircle size={14}/> Tolak</button></>}
    {rs==='diterima'&&<button title="Kirim notifikasi WhatsApp kepada peserta" onClick={sendParticipantWA} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-2.5 text-[10px] font-black text-white hover:bg-emerald-600">📱 WA Peserta</button>}
    <button title="Hapus" onClick={()=>void onDelete(row)} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 text-[10px] font-black text-rose-700 hover:bg-rose-100"><Trash2 size={14}/> Hapus</button>
  </div>;
}`;

src=src.slice(0,start)+replacement+src.slice(end);
fs.writeFileSync(path,src);
console.log('[patch-wa-v4] participant WhatsApp notification event dates set to 08–12 September 2026');
