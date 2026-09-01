import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Tournament registration: KTP is an uploaded document only.
src = src.replace(/import\s*\{\s*createWorker\s*\}\s*from\s*['"]tesseract\.js['"];?\s*\n?/, '');

// Replace the whole KTP handler so no OCR/NIK processing can block registration.
const scanStart = src.indexOf('  const scanKTP=');
const fotoStart = src.indexOf('  const selectFoto=', scanStart);
if (scanStart !== -1 && fotoStart !== -1) {
  const scanFn = [
    '  const scanKTP=async(idx:0|1,file:File)=>{',
    '    if(!file)return;',
    '    if(!file.type.startsWith("image/"))return Swal.fire({icon:"error",title:"KTP tidak valid",text:"Unggah KTP dalam format JPG, PNG, WEBP, HEIC, atau HEIF."});',
    '    if(file.size>12*1024*1024)return Swal.fire({icon:"error",title:"File KTP terlalu besar",text:"Ukuran maksimal KTP adalah 12 MB."});',
    '    updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),nik:"",wilayah:"",ocrStatus:"KTP berhasil diunggah"});',
    '    Swal.fire({icon:"success",title:"KTP berhasil diunggah",text:"KTP tersimpan dan akan diperiksa oleh admin.",confirmButtonColor:"#2563eb"});',
    '  };',
    ''
  ].join('\n');
  src = src.slice(0, scanStart) + scanFn + src.slice(fotoStart);
}

// Align player photo limit with the private tournament-document bucket.
src = src.replace(
  'if(file.size>5*1024*1024)return Swal.fire({icon:"error",title:"Foto terlalu besar",text:"Ukuran maksimal 5 MB."});',
  'if(file.size>12*1024*1024)return Swal.fire({icon:"error",title:"Foto terlalu besar",text:"Ukuran maksimal 12 MB."});'
);

// Rebuild the next-step validation without OCR/NIK requirements.
const nextStart = src.indexOf('  const next=async()=>{');
const previousStart = src.indexOf('  const previous=', nextStart);
if (nextStart === -1 || previousStart === -1) throw new Error('Tournament next-function markers not found');
const nextFn = [
  '  const next=async()=>{',
  '    if(step===1&&(!form.nama_pemain_1.trim()||!form.nama_pemain_2.trim()||!form.whatsapp.trim()))return Swal.fire({icon:"warning",title:"Data pasangan belum lengkap",text:"Nama kedua pemain dan WhatsApp wajib diisi."});',
  '    if(step===1){',
  '      const check=pairStatus.checking||!pairStatus.reason?await checkSeededPairEligibility(form.kategori,form.nama_pemain_1,form.nama_pemain_2):pairStatus;',
  '      if(!check.eligible)return Swal.fire({icon:"error",title:check.databaseError?"Database seeded tidak dapat diperiksa":"Pemain belum eligible",text:check.reason,confirmButtonColor:"#2563eb"});',
  '    }',
  '    if(step===2&&(!form.asal_pb.trim()||!form.domisili.trim()))return Swal.fire({icon:"warning",title:"Data tim belum lengkap",text:"Asal PB/Klub dan domisili wajib diisi."});',
  '    if(step===2){const missing=players.findIndex(p=>!p.foto||!p.ktp);if(missing!==-1)return Swal.fire({icon:"error",title:"Dokumen Pemain "+(missing+1)+" belum lengkap",text:"Foto terbaru dan KTP wajib diunggah untuk kedua pemain."});}',
  '    if(step===3&&!proof)return Swal.fire({icon:"warning",title:"Bukti pembayaran wajib diunggah",text:"Unggah bukti transfer/QRIS terlebih dahulu sebelum melanjutkan ke Konfirmasi."});',
  '    setStep(v=>Math.min(4,v+1));',
  '  };',
  ''
].join('\n');
src = src.slice(0, nextStart) + nextFn + src.slice(previousStart);

// Replace complete submit with sequential, retryable uploads and non-fatal realtime broadcast.
const submitStart = src.indexOf('  const submit=async()=>{');
const goHomeStart = src.indexOf('  const goHome=', submitStart);
if (submitStart === -1 || goHomeStart === -1) throw new Error('Tournament submit-function markers not found');
const submitFn = [
  '  const submit=async()=>{',
  '    if(!proof)return Swal.fire({icon:"warning",title:"Bukti pembayaran belum dipilih",text:"Unggah bukti pembayaran terlebih dahulu."});',
  '    const pair=await checkSeededPairEligibility(form.kategori,form.nama_pemain_1,form.nama_pemain_2);',
  '    if(!pair.eligible)return Swal.fire({icon:"error",title:pair.databaseError?"Database seeded tidak dapat diperiksa":"Pendaftaran ditolak sistem",text:pair.reason||"Pasangan belum eligible untuk kategori ini.",confirmButtonColor:"#2563eb"});',
  '    const missing=players.findIndex(p=>!p.foto||!p.ktp);',
  '    if(missing!==-1)return Swal.fire({icon:"error",title:"Dokumen Pemain "+(missing+1)+" belum lengkap",text:"Foto terbaru dan KTP wajib sudah dipilih untuk kedua pemain."});',
  '    setLoading(true);',
  '    let stage="Persiapan";',
  '    try{',
  '      const code=generateCode();',
  '      const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));',
  '      const uploadDoc=async(bucket:string,file:File,name:string,folder:string)=>{',
  '        if(!file)throw new Error(name+": file belum dipilih.");',
  '        const ext=file.name.split(".").pop()?.toLowerCase()||"jpg";',
  '        const path=folder+"/"+name+"."+ext;',
  '        let lastError:any=null;',
  '        for(let attempt=1;attempt<=3;attempt++){',
  '          try{',
  '            const{error}=await supabase.storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type||"application/octet-stream",cacheControl:"3600"});',
  '            if(!error)return path;',
  '            lastError=error;',
  '          }catch(error){lastError=error;}',
  '          if(attempt<3)await sleep(700*attempt);',
  '        }',
  '        throw new Error(name+": upload gagal setelah 3 percobaan: "+(lastError?.message||"kesalahan jaringan/penyimpanan tidak diketahui"));',
  '      };',
  '',
  '      stage="Upload foto Pemain 1";',
  '      const foto1=await uploadDoc("turnamen-dokumen",players[0].foto!,"foto-pemain-1","pendaftaran/"+code);',
  '      stage="Upload KTP Pemain 1";',
  '      const ktp1=await uploadDoc("turnamen-dokumen",players[0].ktp!,"ktp-pemain-1","pendaftaran/"+code);',
  '      stage="Upload foto Pemain 2";',
  '      const foto2=await uploadDoc("turnamen-dokumen",players[1].foto!,"foto-pemain-2","pendaftaran/"+code);',
  '      stage="Upload KTP Pemain 2";',
  '      const ktp2=await uploadDoc("turnamen-dokumen",players[1].ktp!,"ktp-pemain-2","pendaftaran/"+code);',
  '',
  '      stage="Upload bukti pembayaran";',
  '      const proofPath=await uploadDoc("uploads",proof,"bukti-pembayaran","turnamen-bilibili-162/"+code);',
  '      const proofUrl=supabase.storage.from("uploads").getPublicUrl(proofPath).data.publicUrl;',
  '',
  '      const payload={',
  '        kode_pendaftaran:code,',
  '        nama_pemain_1:form.nama_pemain_1.trim().toUpperCase(),',
  '        nama_pemain_2:form.nama_pemain_2.trim().toUpperCase(),',
  '        whatsapp:form.whatsapp.trim(),',
  '        email:form.email.trim().toLowerCase()||null,',
  '        asal_pb:form.asal_pb.trim().toUpperCase(),',
  '        domisili:form.domisili.trim().toUpperCase(),',
  '        kategori:form.kategori,',
  '        biaya_pendaftaran:FEE,',
  '        status_pembayaran:"Menunggu Verifikasi",',
  '        bukti_pembayaran_url:proofUrl,',
  '        status_pendaftaran:"Pending",',
  '        nik_pemain_1:players[0].nik||null,',
  '        nik_pemain_2:players[1].nik||null,',
  '        foto_pemain_1_url:foto1,',
  '        foto_pemain_2_url:foto2,',
  '        ktp_pemain_1_url:ktp1,',
  '        ktp_pemain_2_url:ktp2,',
  '        wilayah_nik_pemain_1:players[0].wilayah||null,',
  '        wilayah_nik_pemain_2:players[1].wilayah||null,',
  '        verifikasi_nik_status:"Belum Diverifikasi",',
  '        verifikasi_nik_detail:"KTP diunggah; verifikasi NIK dilakukan oleh admin."',
  '      };',
  '',
  '      stage="Menyimpan data pendaftaran";',
  '      const{error}=await supabase.from("pendaftaran_turnamen").insert(payload);',
  '      if(error)throw new Error("Database gagal menyimpan pendaftaran: "+error.message+(error.code?" ("+error.code+")":""));',
  '',
  '      try{await Promise.resolve(broadcastDataChange("pendaftaran_turnamen","INSERT",payload));}catch(broadcastError){console.warn("Realtime broadcast pendaftaran gagal, tetapi data sudah tersimpan:",broadcastError);}',
  '      const wa=form.whatsapp.replace(/\\D/g,"").replace(/^0/,"62")||ADMIN_WA;',
  '      const message=encodeURIComponent("*PENDAFTARAN BILIBILI 162 CUP I 2026*\\n\\nKode: *"+code+"*\\nKategori: *"+form.kategori+"*\\nPasangan: *"+form.nama_pemain_1.toUpperCase()+" & "+form.nama_pemain_2.toUpperCase()+"*\\nBiaya: *Rp150.000/pasang*\\nStatus: *MENUNGGU VERIFIKASI ADMIN*\\n\\n09-12 September 2026\\nGOR Titik Kumpul Soreang Parepare");',
  '      setSuccess({code});',
  '      window.open("https://wa.me/"+wa+"?text="+message,"_blank");',
  '    }catch(err:any){',
  '      const detail=err?.message||"Kesalahan tidak diketahui";',
  '      Swal.fire({icon:"error",title:"Pendaftaran gagal",text:"Tahap: "+stage+"\\n\\n"+detail+"\\n\\nData belum disimpan sampai seluruh proses berhasil.",confirmButtonColor:"#ef4444"});',
  '    }finally{setLoading(false);}',
  '  };',
  ''
].join('\n');
src = src.slice(0, submitStart) + submitFn + src.slice(goHomeStart);

// Keep the public UI consistent with the upload-only workflow.
src = src.replace(
  'Foto terbaru dan KTP <b className="text-white">wajib untuk Pemain 1 dan Pemain 2</b>. Sistem membaca NIK pada KTP secara otomatis dan menolak pendaftaran apabila kode wilayah tidak termasuk Ajatappareng/Parepare.',
  'Foto terbaru dan KTP <b className="text-white">wajib untuk Pemain 1 dan Pemain 2</b>. KTP disimpan secara privat dan akan diperiksa oleh admin.'
);
src = src.replace('Belum ada KTP yang dipindai.', 'Belum ada KTP yang diunggah.');
src = src.replace('Hasil pembacaan NIK', 'Status Dokumen KTP');
src = src.replace('KTP disimpan pada penyimpanan dokumen privat dan hanya dapat diakses admin terautentikasi.', 'Dokumen KTP disimpan pada penyimpanan privat dan hanya dapat diakses admin terautentikasi.');

fs.writeFileSync(path, src);
console.log('[patch-tournament-ktp-upload-only] Sequential uploads + 3x retry + guarded realtime broadcast + explicit stage/database errors applied.');
