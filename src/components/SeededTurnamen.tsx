import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Trophy, ShieldCheck, Users, Filter, ChevronDown, Info, RefreshCw, Plus, Pencil, Trash2, X, Save, SlidersHorizontal } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type Player = {
  id: number;
  tournament_id?: number | null;
  source_sheet: string;
  source_no: number | null;
  player_name: string;
  club_name: string | null;
  seeded_quality: string | null;
  division_level: string | null;
  tournament_qualification: string | null;
  region_status: string | null;
  validity_status: string | null;
  archive_category: string | null;
  gender: string | null;
  eligible_category: string | null;
  normalized_name?: string | null;
  raw_data?: Record<string, unknown> | null;
};

type FormState = {
  source_sheet: string; source_no: string; player_name: string; club_name: string;
  seeded_quality: string; division_level: string; tournament_qualification: string;
  region_status: string; validity_status: string; archive_category: string;
  gender: string; eligible_category: string; normalized_name: string; raw_data: string;
};

const SHEET_ORDER = ['PBSI - Seeded Utama & Sulsel','Seeded Putra (B-, C+, C-)','PBSI - Arsip Utama B & C','Seeded Putri (Database PBSI)'];
const PAGE_SIZE = 20;
const emptyForm: FormState = { source_sheet:'', source_no:'', player_name:'', club_name:'', seeded_quality:'', division_level:'', tournament_qualification:'', region_status:'', validity_status:'', archive_category:'', gender:'Putra', eligible_category:'', normalized_name:'', raw_data:'{}' };
const text = (v: unknown) => String(v ?? '').trim();
const norm = (v: string) => v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g,'');

export default function SeededTurnamen() {
  const [players,setPlayers] = useState<Player[]>([]);
  const [query,setQuery] = useState('');
  const [gender,setGender] = useState('Semua');
  const [quality,setQuality] = useState('Semua');
  const [sheet,setSheet] = useState('Semua');
  const [category,setCategory] = useState('Semua');
  const [club,setClub] = useState('Semua');
  const [region,setRegion] = useState('Semua');
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [showArchive,setShowArchive] = useState(false);
  const [showFilters,setShowFilters] = useState(false);
  const [page,setPage] = useState(1);
  const [formOpen,setFormOpen] = useState(false);
  const [editing,setEditing] = useState<Player|null>(null);
  const [form,setForm] = useState<FormState>(emptyForm);

  const loadPlayers = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data, error: queryError } = await supabase.from('seeded_players')
        .select('id,tournament_id,source_sheet,source_no,player_name,club_name,seeded_quality,division_level,tournament_qualification,region_status,validity_status,archive_category,gender,eligible_category,normalized_name,raw_data')
        .order('source_sheet',{ascending:true}).order('source_no',{ascending:true}).limit(5000);
      if(queryError) throw queryError;
      setPlayers((data||[]) as Player[]);
    } catch(err:any) { console.error(err); setError(err?.message||'Data seeded belum dapat dimuat.'); }
    finally { setLoading(false); }
  },[]);
  useEffect(()=>{void loadPlayers();},[loadPlayers]);

  const qualities = useMemo(()=>Array.from(new Set(players.map(p=>text(p.seeded_quality)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id')),[players]);
  const categories = useMemo(()=>Array.from(new Set(players.map(p=>text(p.eligible_category)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id')),[players]);
  const clubs = useMemo(()=>Array.from(new Set(players.map(p=>text(p.club_name)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id')),[players]);
  const regions = useMemo(()=>Array.from(new Set(players.map(p=>text(p.region_status)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id')),[players]);
  const filtered = useMemo(()=>{
    const q=norm(query);
    return players.filter(p=>{
      const hay=norm([p.player_name,p.club_name,p.seeded_quality,p.source_sheet,p.region_status,p.eligible_category,p.archive_category,p.division_level,p.tournament_qualification,p.validity_status,p.normalized_name,p.gender,p.source_no].map(text).join(' '));
      return (!q||hay.includes(q)) && (gender==='Semua'||text(p.gender)===gender) && (quality==='Semua'||text(p.seeded_quality)===quality) && (sheet==='Semua'||p.source_sheet===sheet) && (category==='Semua'||text(p.eligible_category)===category) && (club==='Semua'||text(p.club_name)===club) && (region==='Semua'||text(p.region_status)===region);
    });
  },[players,query,gender,quality,sheet,category,club,region]);
  useEffect(()=>setPage(1),[query,gender,quality,sheet,category,club,region]);
  const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)); const safePage=Math.min(page,pages); const visible=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
  const summary=useMemo(()=>{const map=new Map<string,number>();players.forEach(p=>{const k=`${p.gender||'Lainnya'} • ${p.seeded_quality||'Tanpa kelas'}`;map.set(k,(map.get(k)||0)+1);});return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);},[players]);

  const openCreate=()=>{setEditing(null);setForm({...emptyForm,source_sheet:SHEET_ORDER[0]});setFormOpen(true);};
  const openEdit=(p:Player)=>{setEditing(p);setForm({source_sheet:p.source_sheet||'',source_no:p.source_no==null?'':String(p.source_no),player_name:p.player_name||'',club_name:p.club_name||'',seeded_quality:p.seeded_quality||'',division_level:p.division_level||'',tournament_qualification:p.tournament_qualification||'',region_status:p.region_status||'',validity_status:p.validity_status||'',archive_category:p.archive_category||'',gender:p.gender||'Putra',eligible_category:p.eligible_category||'',normalized_name:p.normalized_name||'',raw_data:JSON.stringify(p.raw_data||{},null,2)});setFormOpen(true);};
  const closeForm=()=>{if(saving)return;setFormOpen(false);setEditing(null);setForm(emptyForm);};
  const update=(key:keyof FormState,value:string)=>setForm(f=>({...f,[key]:value}));

  const savePlayer=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(!form.player_name.trim()){await Swal.fire({icon:'warning',title:'Nama pemain wajib diisi',text:'Silakan isi nama pemain.',background:'#0b1324',color:'#fff'});return;}
    if(!form.source_sheet.trim()){await Swal.fire({icon:'warning',title:'Sumber data wajib diisi',text:'Silakan pilih sumber data.',background:'#0b1324',color:'#fff'});return;}
    let raw:Record<string,unknown>={};
    try { raw=form.raw_data.trim()?JSON.parse(form.raw_data):{}; if(!raw||Array.isArray(raw)||typeof raw!=='object') throw new Error('Raw Data harus berupa object JSON.'); }
    catch(err:any){await Swal.fire({icon:'warning',title:'Raw Data tidak valid',text:err?.message||'Periksa format JSON.',background:'#0b1324',color:'#fff'});return;}
    setSaving(true);
    try {
      const payload={source_sheet:form.source_sheet.trim(),source_no:form.source_no?Number(form.source_no):null,player_name:form.player_name.trim(),club_name:form.club_name.trim()||null,seeded_quality:form.seeded_quality.trim()||null,division_level:form.division_level.trim()||null,tournament_qualification:form.tournament_qualification.trim()||null,region_status:form.region_status.trim()||null,validity_status:form.validity_status.trim()||null,archive_category:form.archive_category.trim()||null,gender:form.gender.trim()||null,eligible_category:form.eligible_category.trim()||null,normalized_name:form.normalized_name.trim()||norm(form.player_name),raw_data:raw};
      const result=editing?await supabase.from('seeded_players').update(payload).eq('id',editing.id):await supabase.from('seeded_players').insert(payload);
      if(result.error) throw result.error;
      await Swal.fire({icon:'success',title:editing?'Data diperbarui':'Pemain ditambahkan',text:'Perubahan berhasil disimpan.',timer:1200,showConfirmButton:false,background:'#0b1324',color:'#fff'});
      closeForm(); await loadPlayers();
    } catch(err:any){await Swal.fire({icon:'error',title:'Gagal menyimpan',text:err?.message||'Database menolak perubahan.',background:'#0b1324',color:'#fff'});}
    finally{setSaving(false);}
  };

  const deletePlayer=async(p:Player)=>{
    const check=await supabase.from('seeded_pair_evaluations').select('id',{count:'exact',head:true}).or(`player1_seeded_id.eq.${p.id},player2_seeded_id.eq.${p.id}`);
    if(check.error && !String(check.error.message).toLowerCase().includes('does not exist')) console.warn(check.error);
    const linked=check.count||0;
    const result=await Swal.fire({icon:'warning',title:'Hapus pemain?',html:`<div style="text-align:left"><b>${p.player_name.replace(/</g,'&lt;')}</b><br><span style="opacity:.7">ID ${p.id}${linked?` • ${linked} evaluasi pasangan terkait`:''}</span><br><br>Data akan dihapus permanen dari daftar seeded.</div>`,showCancelButton:true,confirmButtonText:'Ya, Hapus',cancelButtonText:'Batal',confirmButtonColor:'#dc2626',background:'#0b1324',color:'#fff'});
    if(!result.isConfirmed)return;
    try{const {error:e}=await supabase.from('seeded_players').delete().eq('id',p.id);if(e)throw e;await Swal.fire({icon:'success',title:'Pemain dihapus',timer:1000,showConfirmButton:false,background:'#0b1324',color:'#fff'});await loadPlayers();}
    catch(err:any){await Swal.fire({icon:'error',title:'Gagal menghapus',text:err?.message||'Data tidak dapat dihapus. Periksa relasi database.',background:'#0b1324',color:'#fff'});}
  };

  const resetFilters=()=>{setQuery('');setGender('Semua');setQuality('Semua');setSheet('Semua');setCategory('Semua');setClub('Semua');setRegion('Semua');};
  const activeFilters=[gender,quality,sheet,category,club,region].filter(v=>v!=='Semua').length+(query?1:0);
  const field=(key:keyof FormState,label:string,type='text',required=false)=><label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}{required&&<b className="ml-1 text-red-400">*</b>}</span><input type={type} value={form[key]} onChange={e=>update(key,e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#050914] px-3 py-2.5 text-xs text-white outline-none transition focus:border-blue-500 sm:text-sm" /></label>;
  const selectField=(key:keyof FormState,label:string,opts:string[])=><label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><select value={form[key]} onChange={e=>update(key,e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-[#050914] px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"><option value="">Pilih...</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select></label>;

  return <div className="min-h-full overflow-x-hidden bg-[#050b17] p-2.5 text-white sm:p-5 md:p-8"><div className="mx-auto max-w-[1450px] space-y-4 sm:space-y-5">
    <section className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#07152d] via-[#0b1730] to-[#050914] p-4 shadow-2xl sm:rounded-[28px] sm:p-7 md:p-9"><div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"/><div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="min-w-0"><div className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300 sm:px-3 sm:text-[10px]"><Trophy size={13}/> Seeded • Database Terhubung</div><h1 className="mt-2 text-xl font-black italic uppercase tracking-tight sm:mt-3 sm:text-4xl">Seeded Resmi Bilibili 162</h1><p className="mt-2 text-xs leading-5 text-slate-300 sm:text-sm sm:leading-relaxed">Kelola database seeded dengan pencarian, filter, tambah, edit, hapus, dan sinkronisasi langsung ke Supabase.</p></div><div className="grid grid-cols-2 gap-2 sm:gap-3"><Stat label="Total seeded" value={players.length} icon={<Users size={16}/>} /><Stat label="Kualitas" value={qualities.length} icon={<ShieldCheck size={16}/>} /></div></div></section>
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-3.5 sm:rounded-2xl sm:p-5"><div className="flex gap-3"><Info className="mt-0.5 shrink-0 text-amber-300" size={17}/><div className="text-[11px] leading-5 text-slate-300 sm:text-sm"><b className="text-amber-200">Sumber data:</b> 1.103 baris seeded pemain dari empat sumber PBSI. Data sumber dipertahankan melalui kolom <code>raw_data</code>.</div></div></section>
    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-xl sm:p-5"><div className="flex flex-col gap-2"><div className="flex gap-2"><label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, klub, kategori, wilayah..." className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-xs outline-none focus:border-blue-500/50 sm:text-sm"/></label><button onClick={()=>setShowFilters(v=>!v)} className={`flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[10px] font-black uppercase ${showFilters?'border-blue-500 bg-blue-500/10 text-blue-300':'border-white/10 bg-slate-950 text-slate-300'}`}><SlidersHorizontal size={16}/><span className="hidden xs:inline">Filter</span>{activeFilters>0&&<b className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[8px] text-white">{activeFilters}</b>}</button></div>{showFilters&&<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"><FilterSelect label="Gender" value={gender} onChange={setGender} options={['Semua','Putra','Putri']}/><FilterSelect label="Kualitas Seeded" value={quality} onChange={setQuality} options={['Semua',...qualities]}/><FilterSelect label="Sumber Data" value={sheet} onChange={setSheet} options={['Semua',...SHEET_ORDER]}/><FilterSelect label="Kategori" value={category} onChange={setCategory} options={['Semua',...categories]}/><FilterSelect label="PB / Klub" value={club} onChange={setClub} options={['Semua',...clubs]}/><FilterSelect label="Wilayah" value={region} onChange={setRegion} options={['Semua',...regions]}/><div className="flex items-end"><button onClick={resetFilters} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] font-black uppercase text-slate-300 hover:text-white">Reset Semua Filter</button></div></div>}</div><div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500"><span>Menampilkan <b className="text-white">{visible.length}</b> dari <b className="text-white">{filtered.length}</b> data</span><span>Halaman <b className="text-white">{safePage}</b> / {pages}</span></div></section>
    {error&&<section className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</section>}

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl sm:rounded-3xl"><div className="flex items-center justify-between border-b border-white/10 p-3.5 sm:p-5"><div><h2 className="font-black uppercase tracking-wider text-sm sm:text-base">Daftar Seeded Pemain</h2><p className="mt-1 text-[10px] text-slate-500">{filtered.length.toLocaleString('id-ID')} dari {players.length.toLocaleString('id-ID')} data</p></div><button onClick={openCreate} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500 sm:min-h-11 sm:px-4 sm:text-xs"><Plus size={16}/> <span className="hidden sm:inline">Tambah Pemain</span><span className="sm:hidden">Tambah</span></button></div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1050px] text-left"><thead className="bg-white/[.03] text-[9px] uppercase tracking-widest text-slate-500"><tr><th className="p-4">No</th><th>Pemain</th><th>Klub / PB</th><th>Gender</th><th>Seeded</th><th>Sumber</th><th>Wilayah / Kategori</th><th className="pr-4 text-right">Aksi</th></tr></thead><tbody>{loading?<tr><td colSpan={8} className="p-10 text-center text-xs text-slate-500">Memuat database seeded...</td></tr>:visible.map((p,i)=><tr key={p.id} className="border-t border-white/5 hover:bg-blue-500/[.03]"><td className="p-4 font-mono text-xs text-slate-500">{(safePage-1)*PAGE_SIZE+i+1}</td><td className="text-xs font-black text-white"><div>{p.player_name}</div><div className="mt-1 text-[9px] text-slate-600">ID {p.id}</div></td><td className="text-xs text-slate-300">{p.club_name||'-'}</td><td className="text-xs text-slate-300">{p.gender||'-'}</td><td><span className="inline-flex rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-300">{p.seeded_quality||'-'}</span></td><td className="max-w-[230px] text-[10px] text-slate-400">{p.source_sheet}</td><td className="text-[10px] text-slate-400">{p.region_status||p.eligible_category||p.archive_category||'-'}</td><td className="pr-4"><div className="flex justify-end gap-1.5"><ActionButton label="Edit" tone="blue" onClick={()=>openEdit(p)} icon={<Pencil size={15}/>}/><ActionButton label="Hapus" tone="red" onClick={()=>void deletePlayer(p)} icon={<Trash2 size={15}/>}/></div></td></tr>)}{!loading&&!visible.length&&<tr><td colSpan={8} className="p-10 text-center text-xs text-slate-500">Tidak ada data yang cocok.</td></tr>}</tbody></table></div>
      <div className="md:hidden">{loading?<div className="p-12 text-center text-xs text-slate-500">Memuat database seeded...</div>:!visible.length?<div className="p-12 text-center text-xs text-slate-500">Tidak ada data yang cocok.</div>:<div className="divide-y divide-white/5">{visible.map((p,i)=><article key={p.id} className="p-3.5 transition hover:bg-white/[.02]"><div className="flex items-start gap-2.5"><div className="flex min-w-0 flex-1 items-start gap-2"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-[9px] font-black text-blue-300">{(safePage-1)*PAGE_SIZE+i+1}</span><div className="min-w-0"><h3 className="break-words text-sm font-black leading-5 text-white">{p.player_name}</h3><p className="mt-0.5 text-[9px] text-slate-600">ID {p.id} • No. Sumber {p.source_no??'-'}</p></div></div><div className="flex shrink-0 gap-1.5"><ActionButton label="Edit" tone="blue" onClick={()=>openEdit(p)} icon={<Pencil size={16}/>} mobile/><ActionButton label="Hapus" tone="red" onClick={()=>void deletePlayer(p)} icon={<Trash2 size={16}/>} mobile/></div></div><div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-white/5 bg-black/15 p-3"><Mini label="PB / Klub" value={p.club_name}/><Mini label="Kategori" value={p.eligible_category}/><Mini label="Kelas" value={p.division_level}/><Mini label="Gender" value={p.gender}/><Mini label="Wilayah" value={p.region_status}/><Mini label="Kualitas" value={p.seeded_quality}/></div><div className="mt-2 flex items-center justify-between text-[9px]"><span className="uppercase tracking-wider text-slate-600">Sumber</span><span className="max-w-[70%] truncate text-slate-400">{p.source_sheet}</span></div></article>)}</div>}</div>
      <div className="flex items-center justify-between border-t border-white/10 p-3"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-slate-300 disabled:opacity-30"><ChevronDown size={14} className="rotate-90"/> Sebelumnya</button><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{safePage} / {pages}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-white/10 px-3 text-[10px] font-bold text-slate-300 disabled:opacity-30">Berikutnya <ChevronDown size={14} className="-rotate-90"/></button></div>
    </section>

    <section className="rounded-2xl border border-white/10 bg-slate-900/60 shadow-xl"><button onClick={()=>setShowArchive(v=>!v)} className="flex w-full items-center justify-between p-4 text-left sm:p-5"><div><h2 className="font-black uppercase tracking-wider text-sm">Ringkasan Kualitas Seeded</h2><p className="mt-1 text-[10px] text-slate-500">Rekap dihitung langsung dari database.</p></div><ChevronDown size={18} className={`transition-transform ${showArchive?'rotate-180':''}`}/></button>{showArchive&&<div className="grid gap-2 border-t border-white/10 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{summary.map(([k,count])=><div key={k} className="rounded-xl border border-white/10 bg-black/20 p-4"><div className="text-[10px] font-bold text-slate-400">{k}</div><div className="mt-1 text-xl font-black">{count}</div></div>)}</div>}</section>
    <div className="flex justify-center pb-2"><button onClick={()=>void loadPlayers()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-4 text-[10px] font-black uppercase text-slate-300"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh Data</button></div>
  </div>

  {formOpen&&<div className="fixed inset-0 z-[100000] overflow-y-auto bg-black/80 p-2.5 backdrop-blur-sm sm:p-5"><div className="mx-auto my-2 w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b1324] shadow-2xl sm:my-6 sm:rounded-3xl"><div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-[#0b1324]/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4"><div className="min-w-0"><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">{editing?<Pencil size={15}/>:<Plus size={15}/>}</div><div><h2 className="text-sm font-black uppercase sm:text-lg">{editing?'Edit Data Pemain':'Tambah Data Pemain'}</h2><p className="text-[9px] text-slate-500 sm:text-xs">Semua perubahan tersimpan langsung ke Supabase.</p></div></div></div><button onClick={closeForm} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:bg-white/5 hover:text-white"><X size={20}/></button></div><form onSubmit={savePlayer} className="p-3.5 sm:p-6"><div className="mb-4 rounded-xl border border-blue-500/15 bg-blue-500/[.04] p-3 text-[10px] leading-5 text-slate-400">Lengkapi data pemain. Kolom bertanda <b className="text-red-400">*</b> wajib diisi. <span className="text-slate-500">ID database dibuat otomatis saat tambah.</span></div><div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{field('player_name','Nama Pemain','text',true)}{field('club_name','PB / Klub')}{selectField('gender','Gender',['Putra','Putri'])}{selectField('source_sheet','Sumber Data',SHEET_ORDER)}{field('source_no','Nomor Sumber','number')}{field('seeded_quality','Kualitas Seeded')}{field('division_level','Kelas / Level')}{field('eligible_category','Kategori')}{field('region_status','Status Wilayah')}{field('validity_status','Status Validitas')}{field('archive_category','Kategori Arsip')}{field('tournament_qualification','Kualifikasi Turnamen')}{field('normalized_name','Nama Ter-normalisasi')}</div><label className="mt-3 block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-400">Raw Data JSON</span><textarea value={form.raw_data} onChange={e=>update('raw_data',e.target.value)} rows={8} className="w-full rounded-xl border border-white/10 bg-[#050914] px-3 py-2.5 font-mono text-[10px] text-slate-200 outline-none focus:border-blue-500 sm:text-xs"/></label><div className="sticky bottom-0 mt-4 flex flex-col-reverse gap-2 border-t border-white/10 bg-[#0b1324] pt-3 sm:flex-row sm:justify-end"><button type="button" onClick={closeForm} disabled={saving} className="min-h-11 rounded-xl border border-white/10 px-5 text-[10px] font-black uppercase text-slate-300">Batal</button><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-[10px] font-black uppercase text-white shadow-lg shadow-blue-900/20 disabled:opacity-50">{saving?<RefreshCw size={15} className="animate-spin"/>:<Save size={15}/>} {saving?'Menyimpan...':editing?'Simpan Perubahan':'Simpan Pemain'}</button></div></form></div></div>}
  </div>;
}

function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[]}){return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"><option value="Semua">Semua</option>{options.filter(o=>o!=='Semua').map(o=><option key={o} value={o}>{o}</option>)}</select></label>}
function ActionButton({label,tone,onClick,icon,mobile=false}:{label:string;tone:'blue'|'red';onClick:()=>void;icon:React.ReactNode;mobile?:boolean}){return <button type="button" onClick={onClick} aria-label={label} title={label} className={`group inline-flex items-center justify-center gap-1.5 rounded-xl border font-black transition active:scale-95 ${mobile?'h-10 w-10 p-0':'min-h-9 px-2.5 py-2 text-[9px]'} ${tone==='blue'?'border-blue-400/20 bg-blue-500/10 text-blue-300 hover:border-blue-400/40 hover:bg-blue-500/20':'border-red-400/20 bg-red-500/10 text-red-300 hover:border-red-400/40 hover:bg-red-500/20'}`}>{icon}{!mobile&&<span>{label}</span>}</button>}
function Mini({label,value}:{label:string;value:string|null|undefined}){return <div className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-600">{label}</span><span className="mt-0.5 block break-words text-[10px] text-slate-300">{value||'-'}</span></div>}
function Stat({label,value,icon}:{label:string;value:number;icon:React.ReactNode}){return <div className="min-w-0 rounded-xl border border-white/10 bg-black/20 p-2.5 sm:rounded-2xl sm:p-3"><div className="flex items-center justify-between text-blue-300"><span className="text-[8px] font-black uppercase tracking-widest text-slate-500 sm:text-[9px]">{label}</span>{icon}</div><p className="mt-1 text-xl font-black sm:text-2xl">{value.toLocaleString('id-ID')}</p></div>}
