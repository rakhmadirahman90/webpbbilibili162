import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// V2 deliberately reuses the component's already-working updateItem() path.
// This avoids a second direct Supabase reference inside the verification handler.
const marker = "const CATEGORIES = ['Ganda Putra AD/BC-/C+C Ajatappareng', 'Ganda Putra CC Lokal Parepare'];";
const helpers = `

function normalizeTournamentWhatsAppV2(raw: string) {
  const digits = String(raw || '').replace(/\\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return digits;
}

function escapeTournamentHtmlV2(value: unknown) {
  return String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildTournamentStatusMessageV2(item: Registration, status: 'Diterima' | 'Ditolak', note: string) {
  const accepted = status === 'Diterima';
  return [
    '*KONFIRMASI STATUS PENDAFTARAN*',
    '*BILIBILI 162 CUP I TAHUN 2026*', '',
    'Halo Penanggung Jawab,',
    'Pendaftaran pasangan dengan kode *' + item.kode_pendaftaran + '* telah diperbarui oleh Admin.', '',
    '*STATUS: ' + (accepted ? '✅ DITERIMA & DIVERIFIKASI' : '❌ DITOLAK') + '*', '',
    '• Kode Pendaftaran: *' + item.kode_pendaftaran + '*',
    '• Pemain 1: *' + item.nama_pemain_1 + '*',
    '• Pemain 2: *' + item.nama_pemain_2 + '*',
    '• Kategori: ' + (item.kategori || '-'),
    '• PB/Klub: ' + (item.asal_pb || '-'),
    '• Domisili: ' + (item.domisili || '-'),
    '• Pembayaran: ' + (item.status_pembayaran || '-'),
    '• Catatan Admin: ' + (note || '-'), '',
    accepted ? 'Selamat, pasangan Anda telah dinyatakan *DITERIMA* sebagai peserta Bilibili 162 Cup I 2026.' : 'Mohon perhatikan catatan Admin dan lakukan perbaikan/konfirmasi kepada panitia apabila diperlukan.', '',
    'Pelaksanaan: 09–12 September 2026',
    'Lokasi: GOR Titik Kumpul Soreang Parepare', '',
    '*Pengurus PB BILIBILI 162*'
  ].join('\\n');
}
`;
if (!src.includes('function normalizeTournamentWhatsAppV2')) {
  if (!src.includes(marker)) throw new Error('Tournament category marker not found.');
  src = src.replace(marker, marker + helpers);
}

// Make the existing save helper propagate errors and return the saved row.
const updateStart = '  const updateItem=async(id:string,patch:Partial<Registration>)=>{';
const updateEnd = '  const verify=';
const us = src.indexOf(updateStart);
const ue = src.indexOf(updateEnd, us);
if (us < 0 || ue < 0) throw new Error('updateItem block not found.');
const updateImpl = `  const updateItem=async(id:string,patch:Partial<Registration>)=>{\n    setSaving(true);\n    try {\n      const {data,error}=await supabase.from('pendaftaran_turnamen').update(patch).eq('id',id).select('*').single();\n      if(error) throw error;\n      if(!data) throw new Error('Data pendaftaran tidak ditemukan setelah penyimpanan.');\n      setItems(p=>p.map(x=>x.id===id?data as Registration:x));\n      setSelected(data as Registration);\n      return data as Registration;\n    } finally {\n      setSaving(false);\n    }\n  };\n`;
src = src.slice(0, us) + updateImpl + src.slice(ue);

const startToken = '  const verify=';
const endToken = '  const exportExcel=';
const start = src.indexOf(startToken);
const end = src.indexOf(endToken, start);
if (start < 0 || end < 0) throw new Error('Tournament verify block not found.');

const verifyImpl = `  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{\n    let note=String(item.catatan_admin||'').trim();\n    if(nextStatus==='Ditolak'){\n      const r=await Swal.fire({title:'Alasan Penolakan',input:'textarea',inputValue:note,inputPlaceholder:'Contoh: dokumen belum lengkap / data tidak sesuai...',showCancelButton:true,confirmButtonText:'Tolak Pendaftaran',cancelButtonText:'Batal',confirmButtonColor:'#ef4444',cancelButtonColor:'#64748b',allowOutsideClick:false,inputValidator:(value)=>!String(value||'').trim()?'Alasan penolakan wajib diisi.':undefined});\n      if(!r.isConfirmed)return;\n      note=String(r.value||'').trim();\n    }else{\n      const r=await Swal.fire({title:'Konfirmasi Penerimaan',html:'Pendaftaran pasangan ini akan berstatus <b style="color:#10b981">DITERIMA & DIVERIFIKASI</b>.',icon:'question',showCancelButton:true,confirmButtonText:'Ya, Terima & Verifikasi',cancelButtonText:'Batal',confirmButtonColor:'#10b981',cancelButtonColor:'#64748b',allowOutsideClick:false});\n      if(!r.isConfirmed)return;\n    }\n\n    Swal.fire({title:'Menyimpan Verifikasi...',text:'Sedang menyimpan status pendaftaran.',allowOutsideClick:false,allowEscapeKey:false,showConfirmButton:false,didOpen:()=>Swal.showLoading()});\n    try {\n      const saved=await updateItem(item.id,{status_pendaftaran:nextStatus,catatan_admin:note});\n      Swal.close();\n      const phone=normalizeTournamentWhatsAppV2(saved.whatsapp||item.whatsapp);\n      const message=buildTournamentStatusMessageV2(saved,nextStatus,note);\n      const waUrl=phone?\`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`:'';\n      const accepted=nextStatus==='Diterima';\n      const result=await Swal.fire({\n        icon:accepted?'success':'warning',\n        title:accepted?'Pendaftaran Berhasil Diterima':'Pendaftaran Berhasil Ditolak',\n        html:\`<div style="text-align:left;font-size:13px;line-height:1.7"><div><b>Status:</b> \${accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK'}</div><div><b>Kode:</b> \${escapeTournamentHtmlV2(saved.kode_pendaftaran)}</div><div><b>Pemain:</b> \${escapeTournamentHtmlV2(saved.nama_pemain_1)} &amp; \${escapeTournamentHtmlV2(saved.nama_pemain_2)}</div><div><b>WhatsApp:</b> \${escapeTournamentHtmlV2(phone?'+'+phone:'Tidak tersedia')}</div><div><b>Catatan:</b> \${escapeTournamentHtmlV2(note||'-')}</div></div>\`,\n        showCancelButton:!!waUrl,confirmButtonText:waUrl?'📱 Kirim Konfirmasi ke WhatsApp':'Tutup',cancelButtonText:'Tutup',confirmButtonColor:'#16a34a',cancelButtonColor:'#64748b',allowOutsideClick:false\n      });\n      if(result.isConfirmed&&waUrl) window.location.assign(waUrl);\n    } catch(error) {\n      Swal.close();\n      await Swal.fire({icon:'error',title:'Verifikasi Gagal',text:error instanceof Error?error.message:String(error||'Gagal menyimpan status pendaftaran.'),confirmButtonText:'Tutup'});\n    }\n  };\n`;
src = src.slice(0,start) + verifyImpl + src.slice(end);
fs.writeFileSync(path,src);
console.log('Tournament verification V2 applied.');
