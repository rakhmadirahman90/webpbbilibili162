import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (src.includes('PATCH_TOURNAMENT_VERIFY_RELIABLE_V1')) process.exit(0);

const startToken = "  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{";
const endToken = '  const exportExcel=';
const start = src.indexOf(startToken);
const end = src.indexOf(endToken, start);
if (start < 0 || end < 0) throw new Error('Tournament verify block not found.');

const newVerify = `  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{
    let note=String(item.catatan_admin||'').trim();

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
        allowOutsideClick:false,
        inputValidator:(value)=>!String(value||'').trim()?'Alasan penolakan wajib diisi.':undefined
      });
      if(!r.isConfirmed)return;
      note=String(r.value||'').trim();
    }else{
      const r=await Swal.fire({
        title:'Konfirmasi Penerimaan',
        html:'Pendaftaran pasangan ini akan berstatus <b style="color:#10b981">DITERIMA & DIVERIFIKASI</b>.<br/><br/>Status akan disimpan terlebih dahulu, kemudian Admin dapat mengirim konfirmasi ke WhatsApp Penanggung Jawab.',
        icon:'question',
        showCancelButton:true,
        confirmButtonText:'Ya, Terima & Verifikasi',
        cancelButtonText:'Batal',
        confirmButtonColor:'#10b981',
        cancelButtonColor:'#64748b',
        allowOutsideClick:false
      });
      if(!r.isConfirmed)return;
    }

    // PATCH_TOURNAMENT_VERIFY_RELIABLE_V1: always show visible progress/error feedback.
    await Swal.fire({
      title:'Menyimpan Verifikasi...',
      text:nextStatus==='Diterima'?'Sedang menyimpan status DITERIMA & DIVERIFIKASI.':'Sedang menyimpan status DITOLAK.',
      allowOutsideClick:false,
      allowEscapeKey:false,
      showConfirmButton:false,
      didOpen:()=>Swal.showLoading()
    });
  };
`;

// The loading alert above cannot be awaited because it intentionally remains open.
// Replace it immediately with the actual implementation below.
const actualVerify = newVerify.replace(
  `    await Swal.fire({\n      title:'Menyimpan Verifikasi...',\n      text:nextStatus==='Diterima'?'Sedang menyimpan status DITERIMA & DIVERIFIKASI.':'Sedang menyimpan status DITOLAK.',\n      allowOutsideClick:false,\n      allowEscapeKey:false,\n      showConfirmButton:false,\n      didOpen:()=>Swal.showLoading()\n    });`,
  `    Swal.fire({\n      title:'Menyimpan Verifikasi...',\n      text:nextStatus==='Diterima'?'Sedang menyimpan status DITERIMA & DIVERIFIKASI.':'Sedang menyimpan status DITOLAK.',\n      allowOutsideClick:false,\n      allowEscapeKey:false,\n      showConfirmButton:false,\n      didOpen:()=>Swal.showLoading()\n    });\n\n    try {\n      const {data,error}=await supabase\n        .from('pendaftaran_turnamen')\n        .update({status_pendaftaran:nextStatus,catatan_admin:note})\n        .eq('id',item.id)\n        .select('*')\n        .single();\n\n      if(error) throw error;\n      if(!data) throw new Error('Data pendaftaran tidak ditemukan setelah penyimpanan.');\n\n      const saved=data as Registration;\n      setItems(p=>p.map(x=>x.id===item.id?saved:x));\n      setSelected(saved);\n      Swal.close();\n\n      const digits=String(saved.whatsapp||item.whatsapp||'').replace(/\\D/g,'');\n      const phone=digits.startsWith('62')?digits:(digits.startsWith('0')?'62'+digits.slice(1):digits);\n      const message=typeof buildTournamentStatusMessage==='function' ? buildTournamentStatusMessage(saved,nextStatus,note) : '';\n      const waUrl=phone&&message?\`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`:'';\n      const accepted=nextStatus==='Diterima';\n\n      await Swal.fire({\n        icon:accepted?'success':'warning',\n        title:accepted?'Pendaftaran Berhasil Diterima':'Pendaftaran Berhasil Ditolak',\n        html:\`<div style="text-align:left;font-size:13px;line-height:1.7">\n          <div><b>Status:</b> \${accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK'}</div>\n          <div><b>Kode:</b> \${escapeTournamentHtml(saved.kode_pendaftaran)}</div>\n          <div><b>Pemain:</b> \${escapeTournamentHtml(saved.nama_pemain_1)} &amp; \${escapeTournamentHtml(saved.nama_pemain_2)}</div>\n          <div><b>WhatsApp Penanggung Jawab:</b> \${escapeTournamentHtml(phone?'+'+phone:'Tidak tersedia')}</div>\n          <div><b>Catatan Admin:</b> \${escapeTournamentHtml(note||'-')}</div>\n        </div>\`,\n        showCancelButton:!!waUrl,\n        confirmButtonText:waUrl?'📱 Kirim Konfirmasi ke WhatsApp':'Tutup',\n        cancelButtonText:'Tutup',\n        confirmButtonColor:'#16a34a',\n        cancelButtonColor:'#64748b',\n        allowOutsideClick:false\n      }).then(result=>{\n        if(result.isConfirmed&&waUrl){\n          // This navigation is initiated directly by the user's SweetAlert tap,\n          // so mobile popup blockers do not prevent WhatsApp from opening.\n          window.location.assign(waUrl);\n        }\n      });\n    } catch(error) {\n      Swal.close();\n      await Swal.fire({\n        icon:'error',\n        title:'Verifikasi Gagal',\n        text:String(error?.message||error||'Gagal menyimpan status pendaftaran.'),\n        confirmButtonText:'Tutup'\n      });\n    }`\n);

src = src.slice(0,start) + actualVerify + src.slice(end);
fs.writeFileSync(path,src);
console.log('Reliable tournament verification patch applied.');
