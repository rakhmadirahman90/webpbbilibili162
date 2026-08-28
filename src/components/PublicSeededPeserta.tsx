import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, SlidersHorizontal, X } from 'lucide-react';
import { supabase } from '../supabase';

type Player = { id:number; player_name:string|null; club_name:string|null; gender:string|null; seeded_quality:string|null };
const text=(v:unknown)=>String(v??'').trim();
const norm=(v:string)=>v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const CACHE_KEY='public_seeded_players_v2';
const DEFAULT_PAGE_SIZE=20;
function readCache():Player[]{try{const raw=sessionStorage.getItem(CACHE_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[]}catch{return []}}
function uniqueOptions(players:Player[],key:keyof Player){return Array.from(new Set(players.map(p=>text(p[key])).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'id-ID',{sensitivity:'base'}))}

export default function PublicSeededPeserta(){
 const initialPlayers=useMemo(()=>readCache(),[]);
 const [players,setPlayers]=useState<Player[]>(initialPlayers);
 const playersRef=useRef<Player[]>(initialPlayers);
 const [query,setQuery]=useState('');
 const [club,setClub]=useState('');
 const [gender,setGender]=useState('');
 const [quality,setQuality]=useState('');
 const [page,setPage]=useState(1);
 const [pageSize,setPageSize]=useState(DEFAULT_PAGE_SIZE);
 const [loading,setLoading]=useState(initialPlayers.length===0);
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState('');
 const requestRef=useRef<Promise<void>|null>(null);
 const mountedRef=useRef(true);
 useEffect(()=>()=>{mountedRef.current=false},[]);
 useEffect(()=>{playersRef.current=players},[players]);
 const load=useCallback(async(showInitialLoader=false)=>{
  if(requestRef.current)return requestRef.current;
  const task=(async()=>{
   if(showInitialLoader&&playersRef.current.length===0&&mountedRef.current)setLoading(true);
   if(mountedRef.current){setRefreshing(true);setError('');}
   try{
    const all:Player[]=[];
    for(let from=0;;from+=1000){
     const {data,error:e}=await supabase.from('seeded_players').select('id,player_name,club_name,gender,seeded_quality').order('player_name',{ascending:true}).range(from,from+999);
     if(e)throw e;
     const batch=(data||[]) as Player[]; all.push(...batch); if(batch.length<1000)break;
    }
    if(!mountedRef.current)return;
    playersRef.current=all; setPlayers(all); setPage(1);
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(all))}catch{}
   }catch(e:any){
    console.error('[public-seeded] load failed',e);
    if(mountedRef.current&&playersRef.current.length===0)setError(e?.message||'Daftar seeded belum dapat dimuat.');
   }finally{if(mountedRef.current){setLoading(false);setRefreshing(false)}}
  })();
  requestRef.current=task; try{await task}finally{if(requestRef.current===task)requestRef.current=null}
 },[]);
 useEffect(()=>{void load(initialPlayers.length===0)},[load,initialPlayers.length]);
 const clubs=useMemo(()=>uniqueOptions(players,'club_name'),[players]);
 const genders=useMemo(()=>uniqueOptions(players,'gender'),[players]);
 const qualities=useMemo(()=>uniqueOptions(players,'seeded_quality'),[players]);
 const filtered=useMemo(()=>{
  const q=norm(query);
  return players.filter(p=>{
   const searchOk=!q||norm([p.player_name,p.club_name,p.gender,p.seeded_quality].map(text).join(' ')).includes(q);
   const clubOk=!club||norm(text(p.club_name))===norm(club);
   const genderOk=!gender||norm(text(p.gender))===norm(gender);
   const qualityOk=!quality||norm(text(p.seeded_quality))===norm(quality);
   return searchOk&&clubOk&&genderOk&&qualityOk;
  });
 },[players,query,club,gender,quality]);
 const activeFilters=Number(Boolean(query))+Number(Boolean(club))+Number(Boolean(gender))+Number(Boolean(quality));
 const clearFilters=()=>{setQuery('');setClub('');setGender('');setQuality('');setPage(1)};
 const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));
 const safePage=Math.min(page,totalPages);
 const pagePlayers=useMemo(()=>filtered.slice((safePage-1)*pageSize,safePage*pageSize),[filtered,safePage,pageSize]);
 const startIndex=filtered.length===0?0:(safePage-1)*pageSize+1;
 const endIndex=Math.min(safePage*pageSize,filtered.length);
 useEffect(()=>{setPage(1)},[query,club,gender,quality,pageSize]);
 useEffect(()=>{if(page>totalPages)setPage(totalPages)},[page,totalPages]);
 const pageNumbers=useMemo<(number|'ellipsis')[]>(()=>{if(totalPages<=7)return Array.from({length:totalPages},(_,i)=>i+1);const values:(number|'ellipsis')[]=[1];const from=Math.max(2,safePage-1);const to=Math.min(totalPages-1,safePage+1);if(from>2)values.push('ellipsis');for(let n=from;n<=to;n++)values.push(n);if(to<totalPages-1)values.push('ellipsis');values.push(totalPages);return values},[totalPages,safePage]);
 const goTo=(next:number)=>setPage(Math.max(1,Math.min(totalPages,next)));
 const selectClass='min-h-10 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-[11px] font-semibold text-slate-200 outline-none transition focus:border-blue-500 sm:text-xs';
 return <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#050b17] px-3 py-5 text-white sm:px-5 sm:py-8"><div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
  <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0b1730] via-[#0a1429] to-[#050914] p-4 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-300"><ShieldCheck size={14}/> Daftar Publik</div><h1 className="text-2xl font-black uppercase tracking-tight sm:text-4xl">Daftar Seeded Peserta</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">Daftar seeded peserta yang dapat dilihat oleh seluruh peserta turnamen.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-300"><Users size={15} className="text-blue-300"/> {players.length.toLocaleString('id-ID')} peserta</div></div></section>
  <section className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-xl sm:p-4"><div className="flex min-w-0 gap-2"><label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama pemain..." className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-xs text-white outline-none transition focus:border-blue-500 sm:text-sm"/></label><button onClick={()=>void load(false)} disabled={refreshing} aria-label="Muat ulang daftar seeded" title="Muat ulang" className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-slate-300 transition hover:border-blue-500 hover:text-blue-300 disabled:opacity-50"><RefreshCw size={16} className={refreshing?'animate-spin':''}/></button></div>
   <div className="mt-3 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3"><select aria-label="Filter PB atau klub" value={club} onChange={e=>setClub(e.target.value)} className={selectClass}><option value="">Semua PB / Klub</option>{clubs.map(v=><option key={v} value={v}>{v}</option>)}</select><select aria-label="Filter gender" value={gender} onChange={e=>setGender(e.target.value)} className={selectClass}><option value="">Semua Gender</option>{genders.map(v=><option key={v} value={v}>{v}</option>)}</select><select aria-label="Filter kualitas seeded" value={quality} onChange={e=>setQuality(e.target.value)} className={selectClass}><option value="">Semua Kualitas Seeded</option>{qualities.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
   {activeFilters>0&&<div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-blue-400/10 bg-blue-500/[.05] px-3 py-2"><span className="text-[10px] font-bold text-blue-300"><SlidersHorizontal size={13} className="mr-1 inline"/> {activeFilters} filter aktif</span><button onClick={clearFilters} className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white"><X size={13}/> Reset</button></div>}
  </section>
  <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="border-b border-white/10 px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-black uppercase tracking-wide sm:text-lg">Seeded Peserta</h2><p className="mt-1 text-[11px] text-slate-500">{filtered.length?`Menampilkan ${startIndex.toLocaleString('id-ID')}–${endIndex.toLocaleString('id-ID')} dari ${filtered.length.toLocaleString('id-ID')} data.`:'Tidak ada data yang ditampilkan.'}</p></div>{refreshing&&players.length>0&&<span className="shrink-0 text-[10px] font-bold text-blue-300">Memperbarui...</span>}</div></div>{loading&&players.length===0?<div className="flex min-h-48 items-center justify-center text-sm text-slate-400">Memuat daftar seeded...</div>:error&&players.length===0?<div className="m-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-300">{error}</div>:filtered.length===0?<div className="flex min-h-40 flex-col items-center justify-center gap-2 px-4 text-sm text-slate-500"><span>Tidak ada peserta yang sesuai filter.</span><button onClick={clearFilters} className="text-xs font-bold text-blue-300 hover:text-blue-200">Reset filter</button></div>:<>
   <div className="w-full min-w-0 overflow-hidden"><table className="w-full min-w-0 max-w-full table-fixed border-collapse text-left"><colgroup><col className="w-[8%]"/><col className="w-[28%]"/><col className="w-[28%]"/><col className="w-[12%]"/><col className="w-[24%]"/></colgroup><thead className="bg-white/[.035] text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px]"><tr><th className="break-words px-1 py-3 text-center sm:px-3">No.</th><th className="break-words px-2 py-3 sm:px-5">Nama Pemain</th><th className="break-words px-2 py-3 sm:px-5">PB / Klub</th><th className="break-words px-1 py-3 text-center sm:px-5">Gender</th><th className="break-words px-1 py-3 text-center sm:px-5">Kualitas Seeded</th></tr></thead><tbody className="divide-y divide-white/[.06]">{pagePlayers.map((p,index)=><tr key={p.id} className="transition hover:bg-blue-500/[.04]"><td className="px-1 py-3 text-center text-[10px] font-bold tabular-nums text-slate-500 sm:px-3 sm:text-xs">{((safePage-1)*pageSize+index+1).toLocaleString('id-ID')}</td><td className="max-w-0 break-words px-2 py-3 text-[11px] font-semibold leading-4 text-white sm:px-5 sm:text-sm">{text(p.player_name)||'-'}</td><td className="max-w-0 break-words px-2 py-3 text-[11px] leading-4 text-slate-300 sm:px-5 sm:text-sm">{text(p.club_name)||'-'}</td><td className="max-w-0 break-words px-1 py-3 text-center text-[10px] leading-4 text-slate-300 sm:px-5 sm:text-sm">{text(p.gender)||'-'}</td><td className="max-w-0 break-words px-1 py-3 text-center sm:px-5"><span className="inline-flex max-w-full items-center justify-center whitespace-normal break-words rounded-lg border border-amber-400/20 bg-amber-400/10 px-1.5 py-1 text-[8px] font-black leading-3 text-amber-300 sm:px-2.5 sm:text-[10px]">{text(p.seeded_quality)||'Belum ditetapkan'}</span></td></tr>)}</tbody></table></div>
   <div className="border-t border-white/10 bg-slate-950/30 px-3 py-3 sm:px-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center justify-between gap-2 text-[10px] text-slate-500 sm:justify-start sm:text-xs"><span>Halaman <strong className="text-slate-200">{safePage}</strong> dari <strong className="text-slate-200">{totalPages}</strong></span><label className="flex items-center gap-1.5">Tampil <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-[10px] font-bold text-slate-200 outline-none focus:border-blue-500"><option value={20}>20</option><option value={50}>50</option><option value={100}>100</option></select></label></div><nav aria-label="Pagination seeded peserta" className="flex min-w-0 items-center justify-center gap-1 overflow-x-auto pb-0.5"><button onClick={()=>goTo(1)} disabled={safePage===1} aria-label="Halaman pertama" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 transition hover:border-blue-500 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-30"><ChevronsLeft size={14}/></button><button onClick={()=>goTo(safePage-1)} disabled={safePage===1} aria-label="Halaman sebelumnya" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 transition hover:border-blue-500 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-30"><ChevronLeft size={14}/></button>{pageNumbers.map((item,i)=>item==='ellipsis'?<span key={`e-${i}`} className="inline-flex h-9 w-7 shrink-0 items-center justify-center text-xs text-slate-600">•••</span>:<button key={item} onClick={()=>goTo(item)} aria-current={item===safePage?'page':undefined} className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-lg border px-2 text-xs font-bold transition ${item===safePage?'border-blue-400/50 bg-blue-500/20 text-blue-300 shadow-lg shadow-blue-500/10':'border-white/10 bg-slate-900 text-slate-400 hover:border-blue-500 hover:text-blue-300'}`}>{item}</button>)}<button onClick={()=>goTo(safePage+1)} disabled={safePage===totalPages} aria-label="Halaman berikutnya" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 transition hover:border-blue-500 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-30"><ChevronRight size={14}/></button><button onClick={()=>goTo(totalPages)} disabled={safePage===totalPages} aria-label="Halaman terakhir" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-400 transition hover:border-blue-500 hover:text-blue-300 disabled:cursor-not-allowed disabled:opacity-30"><ChevronsRight size={14}/></button></nav></div></div>
  </section>
 </div></main>;
}
