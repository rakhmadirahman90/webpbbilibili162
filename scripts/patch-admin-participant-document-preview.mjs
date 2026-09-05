import fs from 'node:fs';

const file = 'src/components/AdminPendaftaranTurnamenModernV2.tsx';
if (!fs.existsSync(file)) process.exit(0);
let s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('function EditModal(');
const end = s.indexOf('function DocumentEditSection', start);
if (start < 0 || end < 0) {
  console.log('[patch-admin-participant-document-preview] EditModal boundary not found; leaving source unchanged');
  process.exit(0);
}

const replacement = String.raw`async function resolveEditDocumentUrl(value: string | null | undefined, bucket: 'turnamen-dokumen' | 'uploads') {
  const raw = clean(value);
  if (!raw) return '';
  if (/^https?:\\/\\//i.test(raw)) return raw;
  const path = storagePathFromValue(raw, bucket);
  if (!path) return '';
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
  if (!error && data?.signedUrl) return data.signedUrl;
  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicData?.publicUrl || '';
}

function EditModal({row,saving,onChange,onClose,onSave}:{row:Registration,saving:boolean,onChange:(r:Registration)=>void,onClose:()=>void,onSave:(e:React.FormEvent)=>void}) {
  const files=(row.__files||{}) as Record<string,File|undefined>;
  const [previews,setPreviews]=useState<Record<string,string>>({});
  const [resolving,setResolving]=useState(true);

  useEffect(()=>{
    let active=true;
    const run=async()=>{
      setResolving(true);
      const next:Record<string,string>={};
      const items:[string,string|null|undefined,'turnamen-dokumen'|'uploads'][]=[
        ['foto1',row.foto_pemain_1_url,'turnamen-dokumen'],
        ['ktp1',row.ktp_pemain_1_url,'turnamen-dokumen'],
        ['foto2',row.foto_pemain_2_url,'turnamen-dokumen'],
        ['ktp2',row.ktp_pemain_2_url,'turnamen-dokumen'],
        ['payment',row.bukti_pembayaran_url,'uploads']
      ];
      await Promise.all(items.map(async([key,value,bucket])=>{
        if(value){
          const url=await resolveEditDocumentUrl(value,bucket);
          if(url) next[key]=url;
        }
      }));
      if(active){setPreviews(next);setResolving(false);}
    };
    void run();
    return()=>{active=false;};
  },[row.id,row.foto_pemain_1_url,row.ktp_pemain_1_url,row.foto_pemain_2_url,row.ktp_pemain_2_url,row.bukti_pembayaran_url]);

  const setFile=(key:string,file:File|undefined)=>{
    if(!file)return;
    const isImage=key!=='payment';
    if(isImage&&!file.type.startsWith('image/'))return void Swal.fire({icon:'error',title:'File tidak valid',text:'Foto dan KTP harus berupa gambar JPG, PNG, atau WEBP.'});
    if(!validSize(file,key==='payment'?'Bukti pembayaran':key.toUpperCase()))return;
    const localUrl=URL.createObjectURL(file);
    setPreviews(p=>{if(p[key]?.startsWith('blob:'))URL.revokeObjectURL(p[key]);return {...p,[key]:localUrl};});
    onChange({...row,__files:{...files,[key]:file}});
  };
  useEffect(()=>()=>{Object.values(previews).forEach(url=>{if(url.startsWith('blob:'))URL.revokeObjectURL(url);});},[]);
  const field=(label:string,value:string|number|null|undefined,key:string,wide=false)=><label className={wide?'sm:col-span-2':''}><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><input value={clean(value)} onChange={e=>onChange({...row,[key]:e.target.value})} className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white"/></label>;
  return <div className="fixed inset-0 z-[1100] overflow-y-auto bg-slate-950/70 p-3 backdrop-blur-sm"><div className="mx-auto my-2 w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-blue-600">EDIT PESERTA + DOKUMEN</p><h2 className="mt-1 text-lg font-black text-slate-900 sm:text-2xl">Perbarui Data Pendaftaran</h2><p className="mt-1 text-[10px] text-slate-500">Preview dokumen lama dimuat dari Storage. File baru langsung tampil sebelum disimpan.</p></div><button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100"><X size={18}/></button></div><form onSubmit={onSave} className="max-h-[calc(100dvh-110px)] overflow-y-auto p-4 sm:p-6 space-y-6">
    <section><div className="mb-3 flex items-center gap-2"><ShieldCheck size={17} className="text-blue-600"/><h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Data Pasangan</h3></div><div className="grid gap-3 sm:grid-cols-2">{field('Kategori',row.kategori,'kategori')}{field('Nama Pemain 1',row.nama_pemain_1,'nama_pemain_1')}{field('Nama Pemain 2',row.nama_pemain_2,'nama_pemain_2')}{field('WhatsApp',row.whatsapp,'whatsapp')}{field('Email',row.email,'email')}{field('Asal PB / Klub',row.asal_pb,'asal_pb')}{field('Domisili',row.domisili,'domisili')}{field('Kode Pendaftaran',row.kode_pendaftaran,'kode_pendaftaran')}</div></section>
    <DocumentEditSection title="Pemain 1" nik={row.nik_pemain_1} wilayah={row.wilayah_nik_pemain_1} photoKey="foto1" ktpKey="ktp1" photo={previews.foto1||''} ktp={previews.ktp1||''} loading={resolving&&!previews.foto1&&!previews.ktp1} onNik={v=>onChange({...row,nik_pemain_1:v})} onWilayah={v=>onChange({...row,wilayah_nik_pemain_1:v})} onFile={setFile}/>
    <DocumentEditSection title="Pemain 2" nik={row.nik_pemain_2} wilayah={row.wilayah_nik_pemain_2} photoKey="foto2" ktpKey="ktp2" photo={previews.foto2||''} ktp={previews.ktp2||''} loading={resolving&&!previews.foto2&&!previews.ktp2} onNik={v=>onChange({...row,nik_pemain_2:v})} onWilayah={v=>onChange({...row,wilayah_nik_pemain_2:v})} onFile={setFile}/>
    <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4"><div className="flex items-center gap-2"><CreditCard size={17} className="text-amber-600"/><h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Bukti Pembayaran</h3></div><p className="mt-1 text-[10px] text-slate-500">Ganti file bukti transfer/QRIS jika dokumen sebelumnya salah atau perlu diperbarui.</p><div className="mt-3 flex flex-wrap items-center gap-3">{previews.payment&&<a href={previews.payment} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-900 px-3 text-[10px] font-black uppercase text-white"><ExternalLink size={14}/> Lihat Bukti Saat Ini</a>}{resolving&&!previews.payment&&<span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-white px-3 text-[10px] font-bold text-slate-500"><Loader2 className="animate-spin" size={14}/> Memuat bukti...</span>}<label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 text-[10px] font-black uppercase text-white hover:bg-amber-600"><Upload size={14}/> {files.payment?'Ganti Bukti Dipilih':'Upload Bukti Baru'}<input type="file" className="hidden" accept="image/*,.pdf" onChange={e=>setFile('payment',e.target.files?.[0])}/></label>{files.payment&&<span className="text-[10px] font-bold text-emerald-700">{files.payment.name}</span>}</div></section>
    <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} disabled={saving} className="min-h-11 rounded-xl border border-slate-200 px-5 text-xs font-black uppercase text-slate-600">Batal</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-black uppercase text-white shadow-lg hover:bg-blue-700 disabled:opacity-50">{saving?<Loader2 className="animate-spin" size={16}/>:<Save size={16}/>} Simpan Semua Perubahan</button></div>
  </form></div></div>;
}

`;

s = s.slice(0, start) + replacement + s.slice(end);
fs.writeFileSync(file, s);
console.log('[patch-admin-participant-document-preview] storage-backed document previews applied');
