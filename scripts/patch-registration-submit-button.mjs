import fs from 'node:fs';

const file = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('  const submit=async()=>{');
const end = s.indexOf('\n  const goHome=()=>', start);
if (start < 0 || end < 0) throw new Error('[registration-submit-fix] submit block not found');

const replacement = `  const submit=async()=>{
    if(loading)return;
    setLoading(true);
    try{
      if(!proof){await Swal.fire({icon:'warning',title:'Bukti pembayaran belum dipilih',text:'Unggah bukti pembayaran terlebih dahulu.'});return;}
      const withTimeout=<T,>(promise:Promise<T>,ms:number)=>new Promise<T>((resolve,reject)=>{const timer=window.setTimeout(()=>reject(new Error('Pemeriksaan database seeded terlalu lama. Silakan coba lagi.')),ms);promise.then(v=>{window.clearTimeout(timer);resolve(v);},e=>{window.clearTimeout(timer);reject(e);});});
      const pair=await withTimeout(checkSeededPairEligibility(form.kategori,form.nama_pemain_1,form.nama_pemain_2),10000);
      if(!pair.eligible){await Swal.fire({icon:'error',title:pair.databaseError?'Database seeded tidak dapat diperiksa':'Pendaftaran ditolak sistem',text:pair.reason,confirmButtonColor:'#2563eb'});return;}
      const checks=players.map(p=>validateNIK(p.nik));
      if(players.some(p=>!p.foto||!p.ktp)||checks.some(c=>!c.valid)){await Swal.fire({icon:'error',title:'Pendaftaran ditolak sistem',text:'Setiap pemain wajib memiliki foto terbaru + KTP yang terbaca dan NIK dari wilayah Ajatappareng/Parepare.'});return;}
      const code=generateCode();
      const uploadDoc=async(file:File,name:string)=>{const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';const path=\`pendaftaran/\${code}/\${name}.\${ext}\`;const{error}=await supabase.storage.from('turnamen-dokumen').upload(path,file,{upsert:false,contentType:file.type});if(error)throw new Error(\`Upload \${name} gagal: \${error.message}\`);return path;};
      const[foto1,ktp1,foto2,ktp2]=await Promise.all([uploadDoc(players[0].foto!,'foto-pemain-1'),uploadDoc(players[0].ktp!,'ktp-pemain-1'),uploadDoc(players[1].foto!,'foto-pemain-2'),uploadDoc(players[1].ktp!,'ktp-pemain-2')]);
      const ext=proof.name.split('.').pop()?.toLowerCase()||'jpg';
      const proofPath=\`turnamen-bilibili-162/\${code}.\${ext}\`;
      const{error:proofError}=await supabase.storage.from('uploads').upload(proofPath,proof,{upsert:false,contentType:proof.type});
      if(proofError)throw new Error(\`Upload bukti pembayaran gagal: \${proofError.message}\`);
      const proofUrl=supabase.storage.from('uploads').getPublicUrl(proofPath).data.publicUrl;
      const payload={kode_pendaftaran:code,nama_pemain_1:form.nama_pemain_1.trim().toUpperCase(),nama_pemain_2:form.nama_pemain_2.trim().toUpperCase(),whatsapp:form.whatsapp.trim(),email:form.email.trim().toLowerCase()||null,asal_pb:form.asal_pb.trim().toUpperCase(),domisili:form.domisili.trim().toUpperCase(),kategori:form.kategori,biaya_pendaftaran:FEE,status_pembayaran:'Menunggu Verifikasi',bukti_pembayaran_url:proofUrl,status_pendaftaran:'Pending',nik_pemain_1:players[0].nik,nik_pemain_2:players[1].nik,foto_pemain_1_url:foto1,foto_pemain_2_url:foto2,ktp_pemain_1_url:ktp1,ktp_pemain_2_url:ktp2,wilayah_nik_pemain_1:players[0].wilayah,wilayah_nik_pemain_2:players[1].wilayah,verifikasi_nik_status:'Valid',verifikasi_nik_detail:\`P1: \${players[0].wilayah}; P2: \${players[1].wilayah}\`};
      const{error}=await supabase.from('pendaftaran_turnamen').insert(payload);
      if(error)throw error;
      broadcastDataChange('pendaftaran_turnamen','INSERT',payload);
      const wa=form.whatsapp.replace(/\\D/g,'').replace(/^0/,'62')||ADMIN_WA;
      const message=encodeURIComponent(\`*PENDAFTARAN BILIBILI 162 CUP I 2026*\\n\\nKode: *\${code}*\\nKategori: *\${form.kategori}*\\nPasangan: *\${form.nama_pemain_1.toUpperCase()} & \${form.nama_pemain_2.toUpperCase()}*\\nWilayah NIK P1: \${players[0].wilayah}\\nWilayah NIK P2: \${players[1].wilayah}\\nBiaya: *Rp150.000/pasang*\\nStatus: *MENUNGGU VERIFIKASI ADMIN*\\n\\n09-12 September 2026\\nGOR Titik Kumpul Soreang Parepare\`);
      setSuccess({code});
      window.open(\`https://wa.me/\${wa}?text=\${message}\`,'_blank');
    }catch(err){
      Swal.fire({icon:'error',title:'Pendaftaran gagal',text:err?.message||'Data tidak berhasil disimpan. Silakan periksa kembali dokumen.'});
    }finally{setLoading(false);}
  };`;

s = s.slice(0, start) + replacement + s.slice(end);
s = s.replace('<button onClick={submit} disabled={loading}', '<button type="button" onClick={submit} disabled={loading}');
fs.writeFileSync(file, s, 'utf8');
console.log('[registration-submit-fix] submit now gives immediate feedback, timeout/error handling, and explicit button type');
