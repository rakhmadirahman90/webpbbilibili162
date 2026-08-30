import fs from 'node:fs';

const path = 'src/components/PendaftaranTurnamen.tsx';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('SEEDED_ELIGIBILITY_REGISTRATION_V1')) process.exit(0);

// Seeded data is the authoritative eligibility source for this tournament.
// Category 01 maps to the Ajatappareng event; players explicitly marked for
// both categories are also eligible for Category 01. Category 02 is treated
// as the local Parepare event when present in the seeded qualification text.
const helper = `\n\n// SEEDED_ELIGIBILITY_REGISTRATION_V1\ntype SeededEligibility = { eligible:boolean; id?:number; player_name?:string; club_name?:string; seeded_quality?:string; eligible_category?:string; tournament_qualification?:string; message:string };\nconst SEEDED_TOURNAMENT = 'TURNAMEN BADMINTON BILIBILI 162 CUP I TAHUN 2026';\nconst normalizePlayerName = (value:string) => String(value||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,' ').replace(/\\s+/g,' ').trim();\nconst seededCategoryCode = (category:string) => category===CATEGORIES[0]?'Kategori 01':'Kategori 02';\nconst seededEligibleForCategory = (p:any, category:string) => {\n  const code=seededCategoryCode(category);\n  const text=String(p.eligible_category||p.tournament_qualification||'').toLowerCase();\n  if(code==='Kategori 01') return text.includes('kategori 01') || text.includes('kategori 01 / kategori 02');\n  return text.includes('kategori 02') || text.includes('kategori 01 / kategori 02') || text.includes('lokal parepare');\n};\n`;

const marker = "type Identity=typeof emptyIdentity;";
if (!s.includes('type SeededEligibility')) {
  if (!s.includes(marker)) throw new Error('[seeded-eligibility] identity marker not found');
  s = s.replace(marker, marker + helper);
}

const stateMarker = "const [step,setStep]=useState(1);const [form,setForm]=useState(emptyForm);const [players,setPlayers]=useState<[Identity,Identity]>([{...emptyIdentity},{...emptyIdentity}]);";
const stateReplacement = stateMarker + "\n  const [eligibility,setEligibility]=useState<[SeededEligibility|null,SeededEligibility|null]>([null,null]);const [eligibilityLoading,setEligibilityLoading]=useState<[boolean,boolean]>([false,false]);";
if (!s.includes('const [eligibility,setEligibility]')) {
  if (!s.includes(stateMarker)) throw new Error('[seeded-eligibility] state marker not found');
  s = s.replace(stateMarker, stateReplacement);
}

const updateMarker = "const update=(key:keyof typeof form,value:string)=>setForm(p=>({...p,[key]:value}));";
const updateReplacement = `const update=(key:keyof typeof form,value:string)=>setForm(p=>({...p,[key]:value}));\n  const checkSeededEligibility=async(idx:0|1,name:string,category=form.kategori)=>{\n    const clean=normalizePlayerName(name);\n    setEligibility(p=>p.map((x,i)=>i===idx?null:x) as [SeededEligibility|null,SeededEligibility|null]);\n    if(clean.length<3)return;\n    setEligibilityLoading(p=>p.map((v,i)=>i===idx) as [boolean,boolean]);\n    try{\n      const {data:t,error:te}=await supabase.from('seeded_tournaments').select('id').eq('name',SEEDED_TOURNAMENT).order('id',{ascending:false}).limit(1).maybeSingle();\n      if(te)throw te;\n      if(!t?.id){setEligibility(p=>p.map((x,i)=>i===idx?{eligible:false,message:'Database seeded turnamen belum tersedia.'}:x) as [SeededEligibility|null,SeededEligibility|null]);return;}\n      const {data,error}=await supabase.from('seeded_players').select('id,player_name,club_name,seeded_quality,eligible_category,tournament_qualification').eq('tournament_id',t.id).eq('normalized_name',clean).limit(10);\n      if(error)throw error;\n      const match=(data||[]).find((p:any)=>seededEligibleForCategory(p,category));\n      if(match)setEligibility(p=>p.map((x,i)=>i===idx?{eligible:true,id:match.id,player_name:match.player_name,club_name:match.club_name,seeded_quality:match.seeded_quality,eligible_category:match.eligible_category,tournament_qualification:match.tournament_qualification,message:'ELIGIBLE — DATA SEEDED RESMI COCOK'}:x) as [SeededEligibility|null,SeededEligibility|null]);\n      else setEligibility(p=>p.map((x,i)=>i===idx?{eligible:false,message:'Nama tidak ditemukan sebagai peserta eligible pada kategori ini.'}:x) as [SeededEligibility|null,SeededEligibility|null]);\n    }catch(err:any){setEligibility(p=>p.map((x,i)=>i===idx?{eligible:false,message:'Pengecekan seeded gagal: '+(err?.message||'database tidak dapat diakses')}:x) as [SeededEligibility|null,SeededEligibility|null]);}\n    finally{setEligibilityLoading(p=>p.map((v,i)=>i===idx?false:v) as [boolean,boolean]);}\n  };\n  const updatePlayerName=(idx:0|1,value:string)=>{const key=idx===0?'nama_pemain_1':'nama_pemain_2';update(key as keyof typeof form,value);void checkSeededEligibility(idx,value,form.kategori);};`;
if (!s.includes('const checkSeededEligibility=')) {
  if (!s.includes(updateMarker)) throw new Error('[seeded-eligibility] update marker not found');
  s = s.replace(updateMarker, updateReplacement);
}

// Re-check both names when category changes.
const categoryOld = "<select value={form.kategori} onChange={e=>update('kategori',e.target.value)}";
const categoryNew = "<select value={form.kategori} onChange={e=>{update('kategori',e.target.value);void checkSeededEligibility(0,form.nama_pemain_1,e.target.value);void checkSeededEligibility(1,form.nama_pemain_2,e.target.value);}}";
s = s.replace(categoryOld, categoryNew);

// Replace player-name fields with an inline seeded eligibility indicator.
const fieldsOld = "<Field label=\"Nama Pemain 1\" value={form.nama_pemain_1} onChange={v=>update('nama_pemain_1',v)}/><Field label=\"Nama Pemain 2\" value={form.nama_pemain_2} onChange={v=>update('nama_pemain_2',v)}/>";
const fieldsNew = "<SeededNameField index={0} label=\"Nama Pemain 1\" value={form.nama_pemain_1} onChange={v=>updatePlayerName(0,v)} result={eligibility[0]} loading={eligibilityLoading[0]}/><SeededNameField index={1} label=\"Nama Pemain 2\" value={form.nama_pemain_2} onChange={v=>updatePlayerName(1,v)} result={eligibility[1]} loading={eligibilityLoading[1]}/>";
if (!s.includes('SeededNameField')) {
  if (!s.includes(fieldsOld)) throw new Error('[seeded-eligibility] player name fields not found');
  s = s.replace(fieldsOld, fieldsNew);
}

// KTP upload: eligible seeded players still upload KTP, but OCR is skipped.
const scanStart = "  const scanKTP=async(idx:0|1,file:File)=>{";
const scanBypass = "  const scanKTP=async(idx:0|1,file:File)=>{\n    if(eligibility[idx]?.eligible){\n      if(!file.type.startsWith('image/'))return Swal.fire({icon:'error',title:'KTP harus berupa foto',text:'Unggah KTP dalam format JPG, PNG, atau WEBP.'});\n      if(file.size>5*1024*1024)return Swal.fire({icon:'error',title:'File KTP terlalu besar',text:'Ukuran maksimal KTP adalah 5 MB.'});\n      updatePlayer(idx,{ktp:file,ktpPreview:URL.createObjectURL(file),ocrStatus:'VALID — ELIGIBLE SEEDED (OCR KTP TIDAK DIPERLUKAN)'});\n      return;\n    }";
if (!s.includes('ELIGIBLE SEEDED (OCR KTP TIDAK DIPERLUKAN)')) {
  if (!s.includes(scanStart)) throw new Error('[seeded-eligibility] scanKTP marker not found');
  s = s.replace(scanStart, scanBypass);
}

// Eligible seeded players do not need a locally OCR-read NIK; their seeded
// eligibility is recorded as the verification basis while KTP remains mandatory.
const nextOld = "const missing=players.findIndex(p=>!p.foto||!p.ktp||!p.nik||!validateNIK(p.nik).valid);";
const nextNew = "const missing=players.findIndex((p,i)=>!p.foto||!p.ktp||(!eligibility[i]?.eligible&&(!p.nik||!validateNIK(p.nik).valid)));";
s = s.replace(nextOld,nextNew);
s = s.replace("text:'Foto terbaru dan KTP wajib. NIK harus terbaca otomatis dan kode wilayah harus termasuk Ajatappareng/Parepare.'","text:'Foto terbaru dan KTP wajib. Jika nama ditemukan sebagai ELIGIBLE di database seeded resmi, KTP tetap diunggah tetapi tidak perlu OCR ulang. Pemain non-seeded tetap mengikuti verifikasi NIK.'");

const submitChecksOld = "const checks=players.map(p=>validateNIK(p.nik));if(players.some(p=>!p.foto||!p.ktp)||checks.some(c=>!c.valid))return Swal.fire({icon:'error',title:'Pendaftaran ditolak sistem',text:'Setiap pemain wajib memiliki foto terbaru + KTP yang terbaca dan NIK dari wilayah Ajatappareng/Parepare.'});";
const submitChecksNew = "const checks=players.map(p=>validateNIK(p.nik));if(players.some((p,i)=>!p.foto||!p.ktp||(!eligibility[i]?.eligible&&!checks[i].valid))||eligibility.some((e)=>e?.eligible===false&&e.message.includes('tidak ditemukan')))return Swal.fire({icon:'error',title:'Pendaftaran ditolak sistem',text:'Pastikan kedua nama sudah dicek ke database seeded. Pemain eligible cukup upload KTP tanpa OCR; pemain non-seeded tetap wajib verifikasi NIK.'});";
if (s.includes(submitChecksOld)) s=s.replace(submitChecksOld,submitChecksNew);

// Preserve seeded basis in registration payload.
const payloadOld = "verifikasi_nik_status:'Valid',verifikasi_nik_detail:`P1: ${players[0].wilayah}; P2: ${players[1].wilayah}`";
const payloadNew = "verifikasi_nik_status:eligibility.some(e=>e?.eligible)?'Valid — Seeded Eligible':'Valid',verifikasi_nik_detail:`P1: ${eligibility[0]?.eligible?'SEEDED ELIGIBLE — '+(eligibility[0]?.eligible_category||eligibility[0]?.tournament_qualification||'-'):players[0].wilayah}; P2: ${eligibility[1]?.eligible?'SEEDED ELIGIBLE — '+(eligibility[1]?.eligible_category||eligibility[1]?.tournament_qualification||'-'):players[1].wilayah}`";
s=s.replace(payloadOld,payloadNew);

// Use seeded eligibility details in the final summary and guidance.
s=s.replace("<Summary label=\"NIK Pemain 1\" value={`${players[0].nik} — ${players[0].wilayah}`}/><Summary label=\"NIK Pemain 2\" value={`${players[1].nik} — ${players[1].wilayah}`}/>","<Summary label=\"Pemain 1\" value={eligibility[0]?.eligible?`${form.nama_pemain_1.toUpperCase()} — SEEDED ELIGIBLE`:`${players[0].nik} — ${players[0].wilayah}`}/><Summary label=\"Pemain 2\" value={eligibility[1]?.eligible?`${form.nama_pemain_2.toUpperCase()} — SEEDED ELIGIBLE`:`${players[1].nik} — ${players[1].wilayah}`}/>");

// Pass eligibility into identity cards and show the different KTP rule.
s=s.replace("<PlayerIdentity index={0} identity={players[0]} ocrLoading={ocrLoading[0]} onPhoto={f=>selectFoto(0,f)} onKtp={f=>scanKTP(0,f)}/><PlayerIdentity index={1} identity={players[1]} ocrLoading={ocrLoading[1]} onPhoto={f=>selectFoto(1,f)} onKtp={f=>scanKTP(1,f)}/>","<PlayerIdentity index={0} identity={players[0]} eligible={eligibility[0]?.eligible===true} seeded={eligibility[0]} ocrLoading={ocrLoading[0]} onPhoto={f=>selectFoto(0,f)} onKtp={f=>scanKTP(0,f)}/><PlayerIdentity index={1} identity={players[1]} eligible={eligibility[1]?.eligible===true} seeded={eligibility[1]} ocrLoading={ocrLoading[1]} onPhoto={f=>selectFoto(1,f)} onKtp={f=>scanKTP(1,f)}/>");

// Replace PlayerIdentity component with seeded-aware presentation.
const piStart=s.indexOf('function PlayerIdentity(');
const fieldStart=s.indexOf('function Field(',piStart);
if(piStart<0||fieldStart<0)throw new Error('[seeded-eligibility] PlayerIdentity component boundary not found');
const newPI=`function PlayerIdentity({index,identity,eligible,seeded,ocrLoading,onPhoto,onKtp}:{index:number;identity:Identity;eligible:boolean;seeded:SeededEligibility|null;ocrLoading:boolean;onPhoto:(f:File|undefined)=>void;onKtp:(f:File)=>void}){return <div className=\"rounded-2xl border border-white/10 bg-slate-950/60 p-4\"><div className=\"flex items-center justify-between gap-2\"><div className=\"flex items-center gap-2\"><Users size={18} className=\"text-blue-400\"/><h3 className=\"text-sm font-black uppercase text-white\">Pemain {index+1}</h3></div>{eligible&&<span className=\"rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] font-black uppercase text-emerald-300\">✓ SEEDED ELIGIBLE</span>}</div>{seeded?.club_name&&<p className=\"mt-2 text-[10px] text-slate-400\">Database: <b className=\"text-white\">{seeded.club_name}</b>{seeded.seeded_quality&&<> • Seeded <b className=\"text-amber-300\">{seeded.seeded_quality}</b></>}</p>}<div className=\"grid sm:grid-cols-2 gap-3 mt-4\"><label className=\"cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[.03] p-4 text-center\"><input type=\"file\" accept=\"image/*\" capture=\"user\" className=\"hidden\" onChange={e=>onPhoto(e.target.files?.[0])}/>{identity.fotoPreview?<img src={identity.fotoPreview} className=\"mx-auto h-28 w-24 rounded-xl object-cover\"/>:<><ScanLine className=\"mx-auto text-blue-400\" size={27}/><p className=\"mt-2 text-[10px] font-black uppercase text-white\">Foto Terbaru *</p><p className=\"mt-1 text-[9px] text-slate-500\">Bisa ambil langsung dari kamera</p></>}</label><label className=\"cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/[.03] p-4 text-center\"><input type=\"file\" accept=\"image/jpeg,image/png,image/webp\" className=\"hidden\" onChange={e=>e.target.files?.[0]&&onKtp(e.target.files[0])}/>{identity.ktpPreview?<img src={identity.ktpPreview} className=\"mx-auto h-28 w-full rounded-xl object-cover\"/>:<><FileUp className=\"mx-auto text-amber-400\" size={27}/><p className=\"mt-2 text-[10px] font-black uppercase text-white\">KTP *</p><p className=\"mt-1 text-[9px] text-slate-500\">{eligible?'Upload KTP • OCR tidak perlu':'JPG/PNG/WEBP • maks. 5 MB'}</p></>}</label></div><div className=\"mt-3 rounded-xl border border-white/5 bg-white/[.02] p-3\"><p className=\"text-[9px] uppercase tracking-widest text-slate-500\">Status Identitas</p>{eligible?<><p className=\"mt-1 text-xs font-black text-emerald-300\">✓ ELIGIBLE berdasarkan database seeded resmi</p><p className=\"mt-1 text-[10px] text-slate-400\">KTP tetap wajib diunggah sebagai dokumen, tetapi tidak dilakukan OCR/verifikasi NIK ulang.</p></>:ocrLoading?<p className=\"mt-1 text-xs font-bold text-blue-300\">Sedang membaca KTP...</p>:identity.nik?<><p className=\"mt-1 font-mono text-sm font-black text-white tracking-wider\">{identity.nik}</p><p className={\`mt-1 text-[10px] font-bold \${identity.wilayah?'text-emerald-300':'text-rose-300'}\`}>{identity.ocrStatus}</p>{identity.wilayah&&<p className=\"mt-1 text-[10px] text-slate-400\">{identity.wilayah}</p>}</>:<p className=\"mt-1 text-[10px] text-slate-500\">Belum ada KTP yang dipindai.</p>}</div></div>}`;
s=s.slice(0,piStart)+newPI+s.slice(fieldStart);

// Add the inline name field component before the generic Field component.
const nameField=`function SeededNameField({index,label,value,onChange,result,loading}:{index:number;label:string;value:string;onChange:(v:string)=>void;result:SeededEligibility|null;loading:boolean}){return <label className=\"block\"><span className=\"text-[11px] font-black uppercase tracking-widest text-slate-300\">{label}</span><div className=\"relative mt-2\"><input type=\"text\" value={value} onChange={e=>onChange(e.target.value)} placeholder=\"Ketik nama sesuai database seeded...\" className={\`w-full rounded-xl border bg-slate-900 px-4 py-3 pr-12 text-sm text-white outline-none \${result?.eligible?'border-emerald-400/60':result?.eligible===false?'border-rose-400/40':'border-white/10'} focus:border-blue-500\`}/>{loading&&<Loader2 size={17} className=\"absolute right-4 top-3.5 animate-spin text-blue-400\"/>}</div>{loading?<p className=\"mt-2 text-[10px] text-blue-300\">Mengecek database seeded resmi...</p>:result?.eligible?<div className=\"mt-2 rounded-lg border border-emerald-400/20 bg-emerald-500/10 p-2 text-[10px]\"><b className=\"text-emerald-300\">✓ ELIGIBLE</b> <span className=\"text-slate-300\">{result.player_name}</span>{result.club_name&&<span className=\"text-slate-400\"> • {result.club_name}</span>} {result.eligible_category&&<span className=\"text-amber-300\"> • {result.eligible_category}</span>}</div>:result?.eligible===false?<p className=\"mt-2 text-[10px] font-bold text-rose-300\">✕ {result.message}</p>:<p className=\"mt-2 text-[10px] text-slate-500\">Nama akan dicek otomatis ke database seeded sebelum lanjut.</p>}</label>}`;
if(!s.includes('function SeededNameField(')){const fsx=s.indexOf('function Field(');if(fsx<0)throw new Error('[seeded-eligibility] Field component boundary not found');s=s.slice(0,fsx)+nameField+s.slice(fsx);}

fs.writeFileSync(path,s,'utf8');
console.log('[patch-seeded-eligibility-registration] seeded eligibility + KTP bypass applied');
