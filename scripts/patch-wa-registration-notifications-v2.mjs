import fs from 'node:fs';

const REG_PATH = 'src/components/PendaftaranTurnamen.tsx';
const ADMIN_PATH = 'src/components/AdminPendaftaranTurnamenModern.tsx';

function patchRegistration() {
  let src = fs.readFileSync(REG_PATH, 'utf8');
  const helperMarker = "const emptyIdentity={nik:'',foto:null as File|null,ktp:null as File|null,fotoPreview:'',ktpPreview:'',ocrStatus:'Belum dipindai',wilayah:''};";
  const helper = `

function normalizeTournamentWA(raw:string){
  const digits=String(raw||'').replace(/\\D/g,'');
  if(!digits)return '';
  if(digits.startsWith('62'))return digits;
  if(digits.startsWith('0'))return '62'+digits.slice(1);
  if(digits.startsWith('8'))return '62'+digits;
  return digits;
}

function buildTournamentAdminWAUrl(payload:any,adminNumber:string){
  const phone=normalizeTournamentWA(adminNumber);
  if(!phone)return '';
  const message=[
    '*NOTIFIKASI PENDAFTARAN PESERTA BARU*',
    '*PB BILIBILI 162 CUP I TAHUN 2026*','',
    'Halo Admin/Panitia,',
    'Pendaftaran pasangan berikut telah berhasil disimpan di sistem:',
    '',
    '• Kode: *'+payload.kode_pendaftaran+'*',
    '• Kategori: *'+payload.kategori+'*',
    '• Pemain 1: *'+payload.nama_pemain_1+'*',
    '• Pemain 2: *'+payload.nama_pemain_2+'*',
    '• PB/Klub: *'+payload.asal_pb+'*',
    '• Domisili: *'+payload.domisili+'*',
    '• WhatsApp Penanggung Jawab: *'+payload.whatsapp+'*',
    '• Email: '+(payload.email||'-'),
    '• Pembayaran: *'+payload.status_pembayaran+'*',
    '• Status: *MENUNGGU VERIFIKASI ADMIN*','',
    'Dokumen foto dan KTP kedua pemain sudah diunggah.',
    'Silakan lanjutkan pemeriksaan melalui Portal Admin.','',
    '*09–12 September 2026 • GOR Titik Kumpul Soreang Parepare*'
  ].join('\\n');
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
}
`;
  if(!src.includes('function buildTournamentAdminWAUrl')){
    if(!src.includes(helperMarker))throw new Error('[patch-wa-v2] Registration helper marker not found.');
    src=src.replace(helperMarker,helperMarker+helper);
  }

  const start=src.indexOf("const wa=form.whatsapp.replace(/\\\\D/g,'').replace(/^0/,'62')||ADMIN_WA;");
  const end=src.indexOf("    }catch(err:any){",start);
  if(start<0||end<0)throw new Error('[patch-wa-v2] Registration WA block not found.');

  const replacement=`const participantWA=normalizeTournamentWA(form.whatsapp);\n      const adminWAUrl=buildTournamentAdminWAUrl(payload,ADMIN_WA);\n      const participantMessage=[\n        '*PENDAFTARAN BILIBILI 162 CUP I TAHUN 2026*','',\n        'Pendaftaran pasangan Anda telah berhasil disimpan.',\n        '',\n        '• Kode: *'+code+'*',\n        '• Kategori: *'+form.kategori+'*',\n        '• Pemain 1: *'+form.nama_pemain_1.toUpperCase()+'*',\n        '• Pemain 2: *'+form.nama_pemain_2.toUpperCase()+'*',\n        '• PB/Klub: *'+form.asal_pb.toUpperCase()+'*',\n        '• Status: *MENUNGGU VERIFIKASI ADMIN*','',\n        'Simpan kode pendaftaran ini untuk referensi Anda.',\n        '*PB BILIBILI 162*'\n      ].join('\\n');\n      const participantWAUrl=participantWA?'https://wa.me/'+participantWA+'?text='+encodeURIComponent(participantMessage):'';\n\n      setSuccess({code});\n      await Swal.fire({\n        icon:'success',\n        title:'PENDAFTARAN BERHASIL',\n        html:'<div style="text-align:left;line-height:1.7"><b>Kode Pendaftaran:</b> '+code+'<br/><b>Status:</b> MENUNGGU VERIFIKASI ADMIN<br/><br/>Data sudah berhasil tersimpan. Kirim notifikasi lengkap kepada Admin/Panitia melalui tombol di bawah.</div>',\n        showConfirmButton:!!adminWAUrl,\n        confirmButtonText:'📱 KIRIM NOTIFIKASI KE WA ADMIN',\n        confirmButtonColor:'#16a34a',\n        showDenyButton:!!participantWAUrl,\n        denyButtonText:'KIRIM SALINAN KE WA SAYA',\n        denyButtonColor:'#2563eb',\n        showCancelButton:true,\n        cancelButtonText:'SELESAI',\n        allowOutsideClick:false\n      }).then(result=>{\n        if(result.isConfirmed&&adminWAUrl)window.location.assign(adminWAUrl);\n        else if(result.isDenied&&participantWAUrl)window.location.assign(participantWAUrl);\n      });\n`;
  src=src.slice(0,start)+replacement+src.slice(end);
  fs.writeFileSync(REG_PATH,src);
  console.log('[patch-wa-v2] Registration -> Admin WA notification applied.');
}

function patchAdmin() {
  let src = fs.readFileSync(ADMIN_PATH, 'utf8');
  const marker = "const rupiah = (n?: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));";
  const helper = `\nfunction normalizeAdminWA(raw?:string|null){\n  const digits=String(raw??'').replace(/\\D/g,'');\n  if(!digits)return '';\n  if(digits.startsWith('62'))return digits;\n  if(digits.startsWith('0'))return '62'+digits.slice(1);\n  if(digits.startsWith('8'))return '62'+digits;\n  return digits;\n}\n\nfunction buildVerifiedWAUrl(row:any,status:'Diterima'|'Ditolak',note:string){\n  const phone=normalizeAdminWA(row.whatsapp);\n  if(!phone)return '';\n  const accepted=status==='Diterima';\n  const message=[\n    accepted?'*PENDAFTARAN BERHASIL DIVERIFIKASI*':'*PEMBERITAHUAN STATUS PENDAFTARAN*',\n    '*PB BILIBILI 162 CUP I TAHUN 2026*','',\n    'Halo Penanggung Jawab,',\n    accepted?'Pendaftaran pasangan Anda telah *DITERIMA & DIVERIFIKASI* oleh Admin.':'Status pendaftaran pasangan Anda telah diperbarui oleh Admin.',\n    '',\n    '• Kode: *'+String(row.kode_pendaftaran||'-')+'*',\n    '• Kategori: *'+String(row.kategori||'-')+'*',\n    '• Pemain 1: *'+String(row.nama_pemain_1||'-')+'*',\n    '• Pemain 2: *'+String(row.nama_pemain_2||'-')+'*',\n    '• PB/Klub: *'+String(row.asal_pb||'-')+'*',\n    '• Domisili: *'+String(row.domisili||'-')+'*',\n    '• Pembayaran: *'+String(row.status_pembayaran||'-')+'*',\n    '• Status: *'+(accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK')+'*',\n    '• Catatan Admin: '+String(note||'-'),'','',\n    accepted?'Selamat, pasangan Anda resmi terdaftar sebagai peserta pada kategori tersebut.':'Silakan hubungi panitia untuk informasi lebih lanjut.',\n    '',\n    '*09–12 September 2026 • GOR Titik Kumpul Soreang Parepare*',\n    '*Panitia PB BILIBILI 162*'\n  ].join('\\n');\n  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);\n}\n`;
  if(!src.includes('function buildVerifiedWAUrl')){
    if(!src.includes(marker))throw new Error('[patch-wa-v2] Admin helper marker not found.');
    src=src.replace(marker,marker+helper);
  }

  const startToken='  const updateStatus = async (row: Registration, nextReg: \'Diterima\' | \'Ditolak\') => {';
  const endToken='  const verifyPayment = async';
  const start=src.indexOf(startToken);const end=src.indexOf(endToken,start);
  if(start<0||end<0)throw new Error('[patch-wa-v2] Admin verification block not found.');
  const replacement=`  const updateStatus = async (row: Registration, nextReg: 'Diterima' | 'Ditolak') => {\n    let note='';\n    if(nextReg==='Ditolak'){\n      const result=await Swal.fire({title:'Tolak pendaftaran?',text:\`Pendaftaran \${row.kode_pendaftaran||''} akan ditandai ditolak.\`,input:'textarea',inputPlaceholder:'Alasan penolakan...',showCancelButton:true,confirmButtonText:'Tolak',cancelButtonText:'Batal',confirmButtonColor:'#dc2626'});\n      if(!result.isConfirmed)return;\n      note=String(result.value||'').trim();\n    }else{\n      const result=await Swal.fire({icon:'question',title:'Verifikasi pendaftaran?',text:\`\${row.nama_pemain_1||'-'} & \${row.nama_pemain_2||'-'} akan dinyatakan DITERIMA & DIVERIFIKASI.\`,showCancelButton:true,confirmButtonText:'Ya, Verifikasi',cancelButtonText:'Batal',confirmButtonColor:'#16a34a'});\n      if(!result.isConfirmed)return;\n    }\n    try{\n      const payload:any={status_pendaftaran:nextReg};\n      if(note)payload.catatan_verifikasi=note;\n      const {data,error}=await supabase.from('pendaftaran_turnamen').update(payload).eq('id',row.id).select('*').single();\n      if(error)throw error;\n      const saved=data as Registration;\n      await load();\n      const waUrl=buildVerifiedWAUrl(saved,nextReg,note);\n      await Swal.fire({\n        icon:nextReg==='Diterima'?'success':'warning',\n        title:nextReg==='Diterima'?'BERHASIL DIVERIFIKASI':'PENDAFTARAN DITOLAK',\n        text:'Status sudah tersimpan di database. Gunakan tombol WhatsApp untuk mengirim hasil verifikasi kepada peserta.',\n        showConfirmButton:false,\n        showCloseButton:true,\n        allowOutsideClick:false,\n        footer:waUrl?'<a href="'+waUrl+'" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;justify-content:center;background:#16a34a;color:#fff;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px;font-size:14px">📱 KIRIM HASIL VERIFIKASI KE WA PESERTA</a>':'<span style="color:#dc2626;font-weight:700">Nomor WhatsApp Penanggung Jawab tidak tersedia.</span>'\n      });\n    }catch(e:any){\n      await Swal.fire({icon:'error',title:'Gagal menyimpan verifikasi',text:e?.message||'Perubahan ditolak database.',confirmButtonColor:'#dc2626'});\n    }\n  };\n\n`;
  src=src.slice(0,start)+replacement+src.slice(end);
  fs.writeFileSync(ADMIN_PATH,src);
  console.log('[patch-wa-v2] Admin verification -> participant WA notification applied.');
}

patchRegistration();
patchAdmin();
