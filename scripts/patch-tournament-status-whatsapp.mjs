import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

const helperMarker = "const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'];";
const helper = `

function normalizeTournamentWhatsApp(raw: string) {
  const digits = String(raw || '').replace(/\\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits;
}

function escapeTournamentHtml(value: unknown) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTournamentStatusMessage(item: Registration, status: 'Diterima' | 'Ditolak', note: string) {
  const accepted = status === 'Diterima';
  return [
    '*KONFIRMASI STATUS PENDAFTARAN*',
    '*BILIBILI 162 CUP I TAHUN 2026*',
    '',
    'Halo Penanggung Jawab,',
    'Pendaftaran pasangan dengan kode *' + item.kode_pendaftaran + '* telah diperbarui oleh Admin.',
    '',
    '*STATUS: ' + (accepted ? '✅ DITERIMA & DIVERIFIKASI' : '❌ DITOLAK') + '*',
    '',
    '• Kode Pendaftaran: *' + item.kode_pendaftaran + '*',
    '• Pemain 1: *' + item.nama_pemain_1 + '*',
    '• Pemain 2: *' + item.nama_pemain_2 + '*',
    '• Kategori: ' + (item.kategori || '-'),
    '• PB/Klub: ' + (item.asal_pb || '-'),
    '• Domisili: ' + (item.domisili || '-'),
    '• Pembayaran: ' + (item.status_pembayaran || '-'),
    '• Verifikasi NIK: ' + (item.verifikasi_nik_status || '-'),
    '• Wilayah NIK P1: ' + (item.wilayah_nik_pemain_1 || '-'),
    '• Wilayah NIK P2: ' + (item.wilayah_nik_pemain_2 || '-'),
    '• Catatan Admin: ' + (note || '-'),
    '',
    accepted
      ? 'Selamat, pasangan Anda telah dinyatakan *DITERIMA* sebagai peserta Bilibili 162 Cup I 2026.'
      : 'Mohon perhatikan catatan Admin di atas dan lakukan perbaikan/konfirmasi kepada panitia apabila diperlukan.',
    '',
    'Pelaksanaan: 09–12 September 2026',
    'Lokasi: GOR Titik Kumpul Soreang Parepare',
    '',
    '*Pengurus PB BILIBILI 162*'
  ].join('\\n');
}
`;

if (!src.includes('function normalizeTournamentWhatsApp')) {
  if (!src.includes(helperMarker)) throw new Error('Tournament category marker not found.');
  src = src.replace(helperMarker, helperMarker + helper);
}

const startToken = '  const verify=async(item:Registration,nextStatus:\'Diterima\'|\'Ditolak\')=>{';
const endToken = '  const exportExcel=';
const start = src.indexOf(startToken);
const end = src.indexOf(endToken, start);
if (start < 0 || end < 0) throw new Error('Tournament verify block not found.');

const newVerify = `  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{
    let note=item.catatan_admin||'';
    if(nextStatus==='Ditolak'){
      const r=await Swal.fire({
        title:'Alasan Penolakan',
        input:'textarea',
        inputValue:note,
        inputPlaceholder:'Contoh: dokumen belum lengkap / data tidak sesuai...',
        showCancelButton:true,
        confirmButtonText:'Tolak Pendaftaran',
        cancelButtonText:'Batal',
        confirmButtonColor:'#ef4444',
        cancelButtonColor:'#64748b',
        inputValidator:(value)=>!String(value||'').trim()?'Alasan penolakan wajib diisi agar dapat disampaikan kepada Penanggung Jawab.':undefined
      });
      if(!r.isConfirmed)return;
      note=String(r.value||'').trim();
    }else{
      const r=await Swal.fire({
        title:'Konfirmasi Penerimaan',
        html:'Pendaftaran pasangan ini akan berstatus <b style="color:#10b981">DITERIMA & DIVERIFIKASI</b>.<br/><br/>Setelah disimpan, Admin dapat mengirim konfirmasi lengkap ke WhatsApp Penanggung Jawab yang terdaftar.',
        icon:'question',
        showCancelButton:true,
        confirmButtonText:'Ya, Terima & Verifikasi',
        cancelButtonText:'Batal',
        confirmButtonColor:'#10b981',
        cancelButtonColor:'#64748b'
      });
      if(!r.isConfirmed)return;
    }

    setSaving(true);
    const {data,error}=await supabase.from('pendaftaran_turnamen').update({status_pendaftaran:nextStatus,catatan_admin:note}).eq('id',item.id).select('*').single();
    setSaving(false);

    if(error){
      await Swal.fire({icon:'error',title:'Verifikasi Gagal',text:'Status tidak berhasil disimpan. '+error.message,confirmButtonText:'Tutup'});
      return;
    }

    const saved=data as Registration;
    setItems(p=>p.map(x=>x.id===item.id?saved:x));
    setSelected(saved);

    const phone=normalizeTournamentWhatsApp(saved.whatsapp||item.whatsapp);
    const message=buildTournamentStatusMessage(saved,nextStatus,note);
    const waUrl=phone?\`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`:'';
    const accepted=nextStatus==='Diterima';

    const result=await Swal.fire({
      icon:accepted?'success':'warning',
      title:accepted?'Pendaftaran Berhasil Diterima':'Pendaftaran Berhasil Ditolak',
      html:\`<div style="text-align:left;font-size:13px;line-height:1.65">
        <div><b>Status:</b> \${accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK'}</div>
        <div><b>Kode:</b> \${escapeTournamentHtml(saved.kode_pendaftaran)}</div>
        <div><b>Pemain:</b> \${escapeTournamentHtml(saved.nama_pemain_1)} &amp; \${escapeTournamentHtml(saved.nama_pemain_2)}</div>
        <div><b>Kategori:</b> \${escapeTournamentHtml(saved.kategori)}</div>
        <div><b>Pembayaran:</b> \${escapeTournamentHtml(saved.status_pembayaran)}</div>
        <div><b>WhatsApp Penanggung Jawab:</b> \${escapeTournamentHtml(phone?'+'+phone:'Tidak tersedia')}</div>
        <div><b>Catatan Admin:</b> \${escapeTournamentHtml(note||'-')}</div>
        <hr style="margin:12px 0;border:0;border-top:1px solid #e5e7eb"/>
        \${phone?'Klik tombol di bawah untuk membuka WhatsApp dengan pesan konfirmasi lengkap yang sudah disiapkan.':'Nomor WhatsApp Penanggung Jawab tidak tersedia atau tidak valid pada data pendaftaran.'}
      </div>\`,
      showConfirmButton:false,
      showCloseButton:true,
      width:520,
      customClass:{popup:'tournament-status-result'},
      footer:phone?\`<a href="\${waUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px;font-size:14px;min-width:230px">📱 KIRIM KONFIRMASI KE WHATSAPP</a>\`:'<span style="color:#dc2626;font-weight:700">Tambahkan nomor WhatsApp Penanggung Jawab pada data pendaftaran.</span>'
    });

    return result;
  };
`;

src = src.slice(0, start) + newVerify + src.slice(end);
src = src.replace('<Info label="WhatsApp" value={item.whatsapp}/>', '<Info label="WhatsApp Penanggung Jawab" value={item.whatsapp}/>');

fs.writeFileSync(path, src);
console.log('Tournament status verification + WhatsApp confirmation patch applied.');
