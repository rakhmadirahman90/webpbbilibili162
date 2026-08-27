import fs from 'node:fs';

const path = 'src/components/ManajemenTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

if (src.includes('PATCH_TOURNAMENT_VERIFY_RELIABLE_V1')) process.exit(0);

const startToken = "  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{";
const endToken = '  const exportExcel=';
const start = src.indexOf(startToken);
const end = src.indexOf(endToken, start);
if (start < 0 || end < 0) throw new Error('Tournament verify block not found.');

const actualVerify = `  const verify=async(item:Registration,nextStatus:'Diterima'|'Ditolak')=>{
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

    // PATCH_TOURNAMENT_VERIFY_RELIABLE_V1: visible progress + deterministic save + explicit WA action.
    Swal.fire({
      title:'Menyimpan Verifikasi...',
      text:nextStatus==='Diterima'?'Sedang menyimpan status DITERIMA & DIVERIFIKASI.':'Sedang menyimpan status DITOLAK.',
      allowOutsideClick:false,
      allowEscapeKey:false,
      showConfirmButton:false,
      didOpen:()=>Swal.showLoading()
    });

    try {
      const {data,error}=await supabase
        .from('pendaftaran_turnamen')
        .update({status_pendaftaran:nextStatus,catatan_admin:note})
        .eq('id',item.id)
        .select('*')
        .single();

      if(error) throw error;
      if(!data) throw new Error('Data pendaftaran tidak ditemukan setelah penyimpanan.');

      const saved=data as Registration;
      setItems(p=>p.map(x=>x.id===item.id?saved:x));
      setSelected(saved);
      Swal.close();

      const digits=String(saved.whatsapp||item.whatsapp||'').replace(/\\D/g,'');
      const phone=digits.startsWith('62')?digits:(digits.startsWith('0')?'62'+digits.slice(1):digits);
      const message=typeof buildTournamentStatusMessage==='function' ? buildTournamentStatusMessage(saved,nextStatus,note) : '';
      const waUrl=phone&&message?\`https://wa.me/\${phone}?text=\${encodeURIComponent(message)}\`:'';
      const accepted=nextStatus==='Diterima';

      const result=await Swal.fire({
        icon:accepted?'success':'warning',
        title:accepted?'Pendaftaran Berhasil Diterima':'Pendaftaran Berhasil Ditolak',
        html:\`<div style="text-align:left;font-size:13px;line-height:1.7">\n          <div><b>Status:</b> \${accepted?'DITERIMA & DIVERIFIKASI':'DITOLAK'}</div>\n          <div><b>Kode:</b> \${escapeTournamentHtml(saved.kode_pendaftaran)}</div>\n          <div><b>Pemain:</b> \${escapeTournamentHtml(saved.nama_pemain_1)} &amp; \${escapeTournamentHtml(saved.nama_pemain_2)}</div>\n          <div><b>WhatsApp Penanggung Jawab:</b> \${escapeTournamentHtml(phone?'+'+phone:'Tidak tersedia')}</div>\n          <div><b>Catatan Admin:</b> \${escapeTournamentHtml(note||'-')}</div>\n        </div>\`,
        showCancelButton:!!waUrl,
        confirmButtonText:waUrl?'📱 Kirim Konfirmasi ke WhatsApp':'Tutup',
        cancelButtonText:'Tutup',
        confirmButtonColor:'#16a34a',
        cancelButtonColor:'#64748b',
        allowOutsideClick:false
      });

      if(result.isConfirmed&&waUrl){
        // Direct navigation is triggered by the user's tap on the result button,
        // avoiding mobile popup blocking after the asynchronous database update.
        window.location.assign(waUrl);
      }
    } catch(error) {
      Swal.close();
      const message=error instanceof Error?error.message:String(error||'Gagal menyimpan status pendaftaran.');
      await Swal.fire({icon:'error',title:'Verifikasi Gagal',text:message,confirmButtonText:'Tutup'});
    }
  };
`;

src = src.slice(0,start) + actualVerify + src.slice(end);
fs.writeFileSync(path,src);
console.log('Reliable tournament verification patch applied.');
