import fs from 'node:fs';

const REGISTRATION_PATH = 'src/components/PendaftaranTurnamen.tsx';
const ADMIN_PATH = 'src/components/AdminPendaftaranTurnamenModern.tsx';

function esc(value) {
  return String(value ?? '-');
}

function patchRegistration() {
  let src = fs.readFileSync(REGISTRATION_PATH, 'utf8');

  const helperMarker = "const emptyIdentity={nik:'',foto:null as File|null,ktp:null as File|null,fotoPreview:'',ktpPreview:'',ocrStatus:'Belum dipindai',wilayah:''};";
  const helpers = `

function normalizeTournamentWhatsAppV2(raw:string){
  const digits=String(raw??'').replace(/\\D/g,'');
  if(!digits)return '';
  if(digits.startsWith('62'))return digits;
  if(digits.startsWith('0'))return '62'+digits.slice(1);
  if(digits.startsWith('8'))return '62'+digits;
  return digits;
}

function buildAdminRegistrationWhatsApp(payload:any, adminPhone:string){
  const phone=normalizeTournamentWhatsAppV2(adminPhone);
  if(!phone)return '';
  const message=[
    '*NOTIFIKASI PENDAFTARAN PESERTA BARU*',
    '*PB BILIBILI 162 CUP I TAHUN 2026*',
    '',
    'Halo Admin/Panitia,',
    'Peserta baru telah berhasil menyelesaikan proses pendaftaran online.',
    '',
    '📋 *DETAIL PENDAFTARAN*',
    '• Kode: *'+payload.kode_pendaftaran+'*',
    '• Kategori: *'+payload.kategori+'*',
    '• Pemain 1: *'+payload.nama_pemain_1+'*',
    '• Pemain 2: *'+payload.nama_pemain_2+'*',
    '• PB/Klub: *'+payload.asal_pb+'*',
    '• Domisili: *'+payload.domisili+'*',
    '• WhatsApp Penanggung Jawab: *'+payload.whatsapp+'*',
    '• Email: '+(payload.email||'-'),
    '• Pembayaran: *'+payload.status_pembayaran+'*',
    '• Status Pendaftaran: *MENUNGGU VERIFIKASI*',
    '',
    'Dokumen foto/KTP kedua pemain telah diunggah pada sistem.',
    'Silakan buka Portal Admin untuk pemeriksaan dan verifikasi.',
    '',
    '*Pelaksanaan: 09–12 September 2026*',
    '*GOR Titik Kumpul Soreang Parepare*'
  ].join('\\n');
  return 'https://wa.me/'+phone+'?text='+encodeURIComponent(message);
}
`;
  if(!src.includes('function buildAdminRegistrationWhatsApp')){
    if(!src.includes(helperMarker))throw new Error('[patch-wa] Registration helper marker not found.');
    src=src.replace(helperMarker,helperMarker+helpers);
  }

  const start = src.indexOf("const wa=form.whatsapp.replace(/\\\\D/g,'').replace(/^0/,'62')||ADMIN_WA;");
  const end = src.indexOf("    }catch(err:any){",start);
  if(start<0||end<0)throw new Error('[patch-wa] Registration WhatsApp block not found.');

  const replacement = `const waParticipant=normalizeTournamentWhatsAppV2(form.whatsapp);\n      const adminUrl=buildAdminRegistrationWhatsApp(payload,ADMIN_WA);\n      const participantMessage=[\n        '*PENDAFTARAN BILIBILI 162 CUP I TAHUN 2026*',\n        '',\n        'Pendaftaran pasangan Anda telah berhasil disimpan di sistem.',\n        '',\n        '• Kode Pendaftaran: *'+code+'*',\n        '• Kategori: *'+form.kategori+'*',\n        '• Pemain 1: *'+form.nama_pemain_1.toUpperCase()+'*',\n        '• Pemain 2: *'+form.nama_pemain_2.toUpperCase()+'*',\n        '• PB/Klub: *'+form.asal_pb.toUpperCase()+'*',\n        '• Status: *MENUNGGU VERIFIKASI ADMIN*',\n        '',\n        'Simpan kode ini untuk memantau pendaftaran.',\n        '*PB BILIBILI 162 CUP I*'\n      ].join('\\n');\n      const participantUrl=waParticipant?'https://wa.me/'+waParticipant+'?text='+encodeURIComponent(participantMessage):'';\n      setSuccess({code});\n      await Swal.fire({\n        icon:'success',\n        title:'Pendaftaran Berhasil',\n        html:'<div style="text-align:left;font-size:13px;line-height:1.7"><b>Kode:</b> '+code+'<br/><b>Status:</b> Menunggu Verifikasi Admin<br/><br/>Data sudah tersimpan. Gunakan tombol di bawah untuk mengirim notifikasi lengkap ke WhatsApp Admin/Panitia.</div>',\n        showConfirmButton:!!adminUrl,\n        confirmButtonText:'📱 KIRIM NOTIFIKASI KE WA ADMIN',\n        confirmButtonColor:'#16a34a',\n        showDenyButton:!!participantUrl,\n        denyButtonText:'SALIN KE WA SAYA',\n        denyButtonColor:'#2563eb',\n        showCancelButton:true,\n        cancelButtonText:'Selesai',\n        allowOutsideClick:false\n      }).then(result=>{\n        if(result.isConfirmed&&adminUrl)window.location.assign(adminUrl);\n        else if(result.isDenied&&participantUrl)window.location.assign(participantUrl);\n      });\n`;
  src=src.slice(0,start)+replacement+src.slice(end);
  fs.writeFileSync(REGISTRATION_PATH,src);
  console.log('[patch-wa] Registration participant -> admin notification applied.');
}

function patchAdmin() {
  let src = fs.readFileSync(ADMIN_PATH, 'utf8');

  const marker = "function publicOrPathUrl(value?: string | null) {";
  const helper = `function normalizeAdminWhatsApp(raw?:string|null){\n  const digits=String(raw??'').replace(/\\D/g,'');\n  if(!digits)return '';\n  if(digits.startsWith('62'))return digits;\n  if(digits.startsWith('0'))return '62'+digits.slice(1);\n  if(digits.startsWith('8'))return '62'+digits;\n  return digits;\n}\n\nfunction buildVerifiedParticipantMessage(row:Registration,nextStatus:'Diterima'|'Ditolak',note:string){\n  const accepted=nextStatus==='Diterima';\n  return [\n    accepted?'*PEMBERITAHUAN PENDAFTARAN TERVERIFIKASI*':'*PEMBERITAHUAN STATUS PENDAFTARAN*',\n    '*PB BILIBILI 162 CUP I TAHUN 2026*','',\n    'Halo Penanggung Jawab,',\n    accepted?'Pendaftaran pasangan Anda telah *BERHASIL DIVERIFIKASI* oleh Admin.':'Pendaftaran pasangan Anda telah diperbarui oleh Admin.',\n    '',\n    '📋 *DETAIL PENDAFTARAN*',\n    '• Kode: *'+esc(row.kode_pendaftaran)+'*',\n    '• Kategori: *'+esc(row.kategori)+'*',\n    '• Pemain 1: *'+esc(row.nama_pemain_1)+'*',\n    '• Pemain 2: *'+esc(row.nama_pemain_2)+'*',\n    '• PB/Klub: *'+esc(row.asal_pb)+'*',\n    '• Domisili: *'+esc(row.domisili)+'*',\n    '• Pembayaran: *'+esc(row.status_pembayaran)+'*',\n    '• Status Pendaftaran: *'+(accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK')+'*',\n    '• Catatan Admin: '+(note||'-'),\n    '',\n    accepted?'Selamat, pasangan Anda resmi diterima pada kategori yang didaftarkan.':'Silakan hubungi panitia apabila membutuhkan penjelasan lebih lanjut.',\n    '',\n    '*Pelaksanaan: 09–12 September 2026*',\n    '*GOR Titik Kumpul Soreang Parepare*',\n    '',\n    '*Panitia PB BILIBILI 162*'\n  ].join('\\n');\n}\n\n`;
  if(!src.includes('function buildVerifiedParticipantMessage')){
    if(!src.includes(marker))throw new Error('[patch-wa] Admin helper marker not found.');
    src=src.replace(marker,helper+marker);
  }

  const startToken = '  const updateStatus = async (row: Registration, nextReg: \'Diterima\' | \'Ditolak\') => {';
  const endToken = '  const verifyPayment = async';
  const start=src.indexOf(startToken);const end=src.indexOf(endToken,start);
  if(start<0||end<0)throw new Error('[patch-wa] Admin updateStatus block not found.');

  const replacement = `  const updateStatus = async (row: Registration, nextReg: 'Diterima' | 'Ditolak') => {\n    let note='';\n    if(nextReg==='Ditolak'){\n      const result=await Swal.fire({title:'Tolak pendaftaran?',text:\`Pendaftaran \${row.kode_pendaftaran||''} akan ditandai ditolak.\`,input:'textarea',inputPlaceholder:'Alasan penolakan...',showCancelButton:true,confirmButtonText:'Tolak',cancelButtonText:'Batal',confirmButtonColor:'#dc2626'});\n      if(!result.isConfirmed)return;\n      note=clean(result.value);\n    }else{\n      const result=await Swal.fire({icon:'question',title:'Verifikasi pendaftaran?',html:\`<b>\${clean(row.nama_pemain_1)} & \${clean(row.nama_pemain_2)}</b><br/><br/>Status akan menjadi <b style="color:#16a34a">DITERIMA & DIVERIFIKASI</b>.\`,showCancelButton:true,confirmButtonText:'Ya, Verifikasi',cancelButtonText:'Batal',confirmButtonColor:'#16a34a'});\n      if(!result.isConfirmed)return;\n    }\n    try{\n      const payload:any={status_pendaftaran:nextReg};\n      if(note)payload.catatan_verifikasi=note;\n      const {data,error}=await supabase.from('pendaftaran_turnamen').update(payload).eq('id',row.id).select('*').single();\n      if(error)throw error;\n      const saved=data as Registration;\n      await load();\n      const phone=normalizeAdminWhatsApp(saved.whatsapp);\n      const message=buildVerifiedParticipantMessage(saved,nextReg,note);\n      const waUrl=phone?'https://wa.me/'+phone+'?text='+encodeURIComponent(message):'';\n      await Swal.fire({\n        icon:nextReg==='Diterima'?'success':'warning',\n        title:nextReg==='Diterima'?'Berhasil Diverifikasi':'Pendaftaran Ditolak',\n        html:\`<div style="text-align:left;font-size:13px;line-height:1.7"><div><b>Kode:</b> \${clean(saved.kode_pendaftaran)}</div><div><b>Pasangan:</b> \${clean(saved.nama_pemain_1)} & \${clean(saved.nama_pemain_2)}</div><div><b>Status:</b> \${nextReg==='Diterima'?'DITERIMA & DIVERIFIKASI':'DITOLAK'}</div><div><b>WhatsApp:</b> \${phone?'+'+phone:'Tidak tersedia'}</div></div>\`,\n        showConfirmButton:false,showCloseButton:true,allowOutsideClick:false,\n        footer:waUrl?\`<a href="\${waUrl}" style="display:inline-flex;align-items:center;justify-content:center;background:#16a34a;color:white;text-decoration:none;font-weight:800;border-radius:10px;padding:12px 18px;font-size:14px;min-width:230px">📱 KIRIM HASIL VERIFIKASI KE WA PESERTA</a>\`:'<span style="color:#dc2626;font-weight:700">Nomor WhatsApp peserta tidak tersedia.</span>'\n      });\n    }catch(e:any){\n      await Swal.fire({icon:'error',title:'Gagal menyimpan verifikasi',text:e?.message||'Perubahan ditolak database.',confirmButtonColor:'#dc2626'});\n    }\n  };\n\n`;
  src=src.slice(0,start)+replacement+src.slice(end);
  fs.writeFileSync(ADMIN_PATH,src);
  console.log('[patch-wa] Admin verification -> participant notification applied.');
}

patchRegistration();
patchAdmin();
