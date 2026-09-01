import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let src = fs.readFileSync(path, 'utf8');

// Remove the client-side OCR dependency and make KTP upload-only.
src = src.replace(/import\\s*\\{\\s*createWorker\\s*\\}\\s*from\\s*'tesseract\\.js';\\s*\\n?/, '');

// Replace the whole KTP handler, regardless of which earlier tournament patch version is present.
const scanStart = src.indexOf('  const scanKTP=');
const fotoStart = src.indexOf('  const selectFoto=', scanStart);
if (scanStart !== -1 && fotoStart !== -1) {
  const scanFn = `  const scanKTP=async(idx:0|1,file:File)=>{\n    if(!file)return;\n    if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'KTP tidak valid',text:'Unggah KTP dalam format JPG, PNG, WEBP, HEIC, atau HEIF.'});\n    if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP adalah 12 MB.'});\n    updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),nik:'',wilayah:'',ocrStatus:'KTP berhasil diunggah'});\n    Swal.fire({icon:'success',title:'KTP berhasil diunggah',text:'KTP tersimpan. Pemeriksaan dilakukan oleh admin.',confirmButtonColor:'#2563eb'});\n  };\n`;
  src = src.slice(0, scanStart) + scanFn + src.slice(fotoStart);
}

// Make player photo upload use the same 12 MB ceiling as the storage bucket.
src = src.replace(
  /const selectFoto=\(idx:0\\|1,file:File\\|undefined\)=>\{[\\s\\S]*?\};\\n  const selectProof=/,
  `const selectFoto=(idx:0|1,file:File|undefined)=>{if(!file)return;if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'Foto tidak valid',text:'Foto pemain harus berupa file gambar.'});if(file.size>12*1024*1024)return Swal.fire({icon:'error',title:'Foto terlalu besar',text:'Ukuran maksimal 12 MB.'});updatePlayer(idx,{foto:file,fotoPreview:URL.createObjectURL(file)});};\n  const selectProof=`
);

// Replace the complete submit function with a sequential, retryable flow.
const submitStart = src.indexOf('  const submit=async()=>{');
const goHomeStart = src.indexOf('  const goHome=', submitStart);
if (submitStart === -1 || goHomeStart === -1) throw new Error('Tournament submit function markers not found');

const submitFn = `  const submit=async()=>{\n    if(!proof)return Swal.fire({icon:'warning',title:'Bukti pembayaran belum dipilih',text:'Unggah bukti pembayaran terlebih dahulu.'});\n\n    const pair=await checkSeededPairEligibility(form.kategori,form.nama_pemain_1,form.nama_pemain_2);\n    if(!pair.eligible)return Swal.fire({icon:'error',title:pair.databaseError?'Database seeded tidak dapat diperiksa':'Pendaftaran belum memenuhi syarat',text:pair.reason||'Pasangan belum eligible untuk kategori ini.',confirmButtonColor:'#2563eb'});\n\n    const missing=players.findIndex(p=>!p.foto||!p.ktp);\n    if(missing!==-1)return Swal.fire({icon:'error',title:\`Dokumen Pemain \\${missing+1} belum lengkap\`,text:'Foto terbaru dan KTP wajib sudah dipilih untuk kedua pemain.'});\n\n    setLoading(true);\n    let stage='Persiapan';\n    try{\n      const code=generateCode();\n      const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));\n      const uploadWithRetry=async(bucket:string,file:File,path:string,label:string)=>{\n        if(!file)throw new Error(\`\\${label}: file belum dipilih.\`);\n        const attempts=3;\n        let lastError:any=null;\n        for(let attempt=1;attempt<=attempts;attempt++){\n          try{\n            const{error}=await supabase.storage.from(bucket).upload(path,file,{upsert:true,contentType:file.type||'application/octet-stream',cacheControl:'3600'});\n            if(!error)return path;\n            lastError=error;\n          }catch(error){lastError=error;}\n          if(attempt<attempts)await sleep(600*attempt);\n        }\n        const detail=lastError?.message||'Kesalahan jaringan/penyimpanan tidak diketahui';\n        throw new Error(\`\\${label}: upload gagal setelah \\${attempts} percobaan. \\${detail}\`);\n      };\n\n      const docExt=(file:File)=>file.name.split('.').pop()?.toLowerCase()||'jpg';\n      const docPath=(name:string,file:File)=>\`pendaftaran/\\${code}/\\${name}.\\${docExt(file)}\`;\n\n      stage='Upload foto Pemain 1';\n      const foto1=await uploadWithRetry('turnamen-dokumen',players[0].foto!,docPath('foto-pemain-1',players[0].foto!),'Foto Pemain 1');\n      stage='Upload KTP Pemain 1';\n      const ktp1=await uploadWithRetry('turnamen-dokumen',players[0].ktp!,docPath('ktp-pemain-1',players[0].ktp!),'KTP Pemain 1');\n      stage='Upload foto Pemain 2';\n      const foto2=await uploadWithRetry('turnamen-dokumen',players[1].foto!,docPath('foto-pemain-2',players[1].foto!),'Foto Pemain 2');\n      stage='Upload KTP Pemain 2';\n      const ktp2=await uploadWithRetry('turnamen-dokumen',players[1].ktp!,docPath('ktp-pemain-2',players[1].ktp!),'KTP Pemain 2');\n\n      stage='Upload bukti pembayaran';\n      const proofExt=docExt(proof);\n      const proofPath=\`turnamen-bilibili-162/\\${code}.\\${proofExt}\`;\n      await uploadWithRetry('uploads',proof,proofPath,'Bukti pembayaran');\n      const proofUrl=supabase.storage.from('uploads').getPublicUrl(proofPath).data.publicUrl;\n\n      const payload={\n        kode_pendaftaran:code,\n        nama_pemain_1:form.nama_pemain_1.trim().toUpperCase(),\n        nama_pemain_2:form.nama_pemain_2.trim().toUpperCase(),\n        whatsapp:form.whatsapp.trim(),\n        email:form.email.trim().toLowerCase()||null,\n        asal_pb:form.asal_pb.trim().toUpperCase(),\n        domisili:form.domisili.trim().toUpperCase(),\n        kategori:form.kategori,\n        biaya_pendaftaran:FEE,\n        status_pembayaran:'Menunggu Verifikasi',\n        bukti_pembayaran_url:proofUrl,\n        status_pendaftaran:'Pending',\n        nik_pemain_1:players[0].nik||null,\n        nik_pemain_2:players[1].nik||null,\n        foto_pemain_1_url:foto1,\n        foto_pemain_2_url:foto2,\n        ktp_pemain_1_url:ktp1,\n        ktp_pemain_2_url:ktp2,\n        wilayah_nik_pemain_1:players[0].wilayah||null,\n        wilayah_nik_pemain_2:players[1].wilayah||null,\n        verifikasi_nik_status:'Belum Diverifikasi',\n        verifikasi_nik_detail:'KTP diunggah; verifikasi NIK dilakukan oleh admin.'\n      };\n\n      stage='Menyimpan data pendaftaran';\n      const{error}=await supabase.from('pendaftaran_turnamen').insert(payload);\n      if(error)throw new Error(\`Database gagal menyimpan pendaftaran: \\${error.message}\\${error.code?\` (\\${error.code})\`:''}\`);\n\n      broadcastDataChange('pendaftaran_turnamen','INSERT',payload);\n      const wa=form.whatsapp.replace(/\\D/g,'').replace(/^0/,'62')||ADMIN_WA;\n      const message=encodeURIComponent(\`*PENDAFTARAN BILIBILI 162 CUP I 2026*\\n\\nKode: *\\${code}*\\nKategori: *\\${form.kategori}*\\nPasangan: *\\${form.nama_pemain_1.toUpperCase()} & \\${form.nama_pemain_2.toUpperCase()}*\\nBiaya: *Rp150.000/pasang*\\nStatus: *MENUNGGU VERIFIKASI ADMIN*\\n\\n09-12 September 2026\\nGOR Titik Kumpul Soreang Parepare\`);\n      setSuccess({code});\n      window.open(\`https://wa.me/\\${wa}?text=\\${message}\`,'_blank');\n    }catch(err:any){\n      const detail=err?.message||'Kesalahan tidak diketahui';\n      Swal.fire({icon:'error',title:'Pendaftaran gagal',html:\`<b>Tahap:</b> \\${stage}<br><span>\\${detail}</span><br><br><small>Data belum disimpan sampai seluruh proses berhasil.</small>\`,confirmButtonColor:'#ef4444'});\n    }finally{setLoading(false);}\n  };\n`;
src = src.slice(0, submitStart) + submitFn + src.slice(goHomeStart);

// Remove OCR/NIK language from the public registration UI.
src = src.replace(
  'Foto terbaru dan KTP <b className="text-white">wajib untuk Pemain 1 dan Pemain 2</b>. Sistem membaca NIK pada KTP secara otomatis dan menolak pendaftaran apabila kode wilayah tidak termasuk Ajatappareng/Parepare.',
  'Foto terbaru dan KTP <b className="text-white">wajib untuk Pemain 1 dan Pemain 2</b>. KTP disimpan secara privat dan akan diperiksa oleh admin.'
);
src = src.replace(
  /<div className="rounded-2xl border border-amber-400\\/20 bg-amber-400\\/5 p-4 text-xs text-slate-300"><b className="text-amber-300">Wilayah NIK yang diterima:<\\/b>[\\s\\S]*?<\\/div>/,
  '<div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs text-slate-300"><b className="text-amber-300">Dokumen:</b> Foto terbaru dan KTP kedua pemain wajib diunggah. Pemeriksaan akhir dilakukan oleh admin.</div>'
);
src = src.replace(
  /<div className="mt-4 grid sm:grid-cols-2 gap-3"><Summary label="Kategori"[\\s\\S]*?<\\/div><\\/div><div className="rounded-2xl border border-white\\/10 bg-white\\/\\[.03\\] p-4 text-xs leading-relaxed text-slate-300"><b className="text-white">Persetujuan:<\\/b>[\\s\\S]*?<\\/div><\\/section>/,
  '<div className="mt-4 grid sm:grid-cols-2 gap-3"><Summary label="Kategori" value={form.kategori}/><Summary label="Pasangan" value={`${form.nama_pemain_1.toUpperCase()} & ${form.nama_pemain_2.toUpperCase()}`}/><Summary label="Dokumen" value="Foto + KTP kedua pemain siap"/><Summary label="Pembayaran" value={proof?.name||"Bukti pembayaran siap"}/></div></div><div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-xs leading-relaxed text-slate-300"><b className="text-white">Persetujuan:</b> Saya memastikan data pasangan dan dokumen yang diunggah benar. Pemeriksaan dokumen dilakukan oleh admin setelah pendaftaran tersimpan.</div></section>'
);
src = src.replace(
  'KTP disimpan pada penyimpanan dokumen privat dan hanya dapat diakses admin terautentikasi.',
  'Dokumen KTP disimpan pada penyimpanan privat dan hanya dapat diakses admin terautentikasi.'
);
src = src.replace(/Sedang membaca KTP\.\.\./g, 'Mengunggah KTP...');
src = src.replace(/Belum ada KTP yang dipindai\./g, 'Belum ada KTP yang diunggah.');
src = src.replace(/Hasil pembacaan NIK/g, 'Status Dokumen KTP');
src = src.replace(/JPG\\/PNG\\/WEBP • maks\. 5 MB/g, 'JPG/PNG/WEBP/HEIC/HEIF • maks. 12 MB');

fs.writeFileSync(path, src);
console.log('[patch-tournament-submit-reliable] Sequential tournament uploads, retries, explicit stage errors, and KTP upload-only flow applied.');
