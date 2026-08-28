import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, ShieldCheck, RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';

type Player = { id:number; player_name:string|null; club_name:string|null; gender:string|null; seeded_quality:string|null };
const text=(v:unknown)=>String(v??'').trim();
const norm=(v:string)=>v.toLocaleLowerCase('id-ID').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const CACHE_KEY='public_seeded_players_v1';

export default function PublicSeededPeserta(){
 const [players,setPlayers]=useState<Player[]>(()=>{
  try{const raw=sessionStorage.getItem(CACHE_KEY);const parsed=raw?JSON.parse(raw):[];return Array.isArray(parsed)?parsed:[];}catch{return []}
 });
 const [query,setQuery]=useState('');
 const [loading,setLoading]=useState(()=>{
  try{return !sessionStorage.getItem(CACHE_KEY)}catch{return true}
 });
 const [refreshing,setRefreshing]=useState(false);
 const [error,setError]=useState('');
 const requestRef=useRef<Promise<void>|null>(null);

 const load=useCallback(async(forceLoading=false)=>{
  if(requestRef.current)return requestRef.current;
  const task=(async()=>{
   if(forceLoading && players.length===0)setLoading(true);
   setRefreshing(true);setError('');
   try{
    const all:Player[]=[];
    for(let from=0;;from+=1000){
     const {data,error:e}=await supabase.from('seeded_players').select('id,player_name,club_name,gender,seeded_quality').order('player_name',{ascending:true}).range(from,from+999);
     if(e)throw e;
     const batch=(data||[]) as Player[];all.push(...batch);
     if(batch.length<1000)break;
    }
    setPlayers(all);
    try{sessionStorage.setItem(CACHE_KEY,JSON.stringify(all));}catch{}
   }catch(e:any){
    console.error('[public-seeded] load failed',e);
    if(players.length===0)setError(e?.message||'Daftar seeded belum dapat dimuat.');
   }finally{
    setLoading(false);setRefreshing(false);
   }
  })();
  requestRef.current=task;
  try{await task}finally{requestRef.current=null}
 },[players.length]);

 useEffect(()=>{void load(players.length===0)},[load]);
 const filtered=useMemo(()=>{const q=norm(query);return q?players.filter(p=>norm([p.player_name,p.club_name,p.gender,p.seeded_quality].map(text).join(' ')).includes(q)):players},[players,query]);

 return <main className="min-h-screen w-full min-w-0 overflow-x-hidden bg-[#050b17] px-3 py-5 text-white sm:px-5 sm:py-8"><div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
  <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0b1730] via-[#0a1429] to-[#050914] p-4 shadow-2xl sm:rounded-3xl sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="min-w-0"><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-blue-300"><ShieldCheck size={14}/> Daftar Publik</div><h1 className="text-2xl font-black uppercase tracking-tight sm:text-4xl">Daftar Seeded Peserta</h1><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-400 sm:text-sm">Daftar seeded peserta yang dapat dilihat oleh seluruh peserta turnamen.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-xs font-bold text-slate-300"><Users size={15} className="text-blue-300"/> {players.length.toLocaleString('id-ID')} peserta</div></div></section>
  <section className="w-full min-w-0 rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-xl sm:p-4"><div className="flex min-w-0 gap-2"><label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari nama, PB/klub, gender, kualitas seeded..." className="min-h-11 w-full min-w-0 rounded-xl border border-white/10 bg-slate-950 px-10 py-2.5 text-xs text-white outline-none transition focus:border-blue-500 sm:text-sm"/></label><button onClick={()=>void load(false)} disabled={refreshing} aria-label="Muat ulang daftar seeded" title="Muat ulang" className="inline-flex min-h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950 text-slate-300 transition hover:border-blue-500 hover:text-blue-300 disabled:opacity-50"><RefreshCw size={16} className={refreshing?'animate-spin':''}/></button></div></section>
  <section className="w-full min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="border-b border-white/10 px-4 py-4 sm:px-5"><div className="flex items-center justify-between gap-3"><div className="min-w-0"><h2 className="text-base font-black uppercase tracking-wide sm:text-lg">Seeded Peserta</h2><p className="mt-1 text-[11px] text-slate-500">Menampilkan {filtered.length.toLocaleString('id-ID')} dari {players.length.toLocaleString('id-ID')} data.</p></div>{refreshing&&players.length>0&&<span className="shrink-0 text-[10px] font-bold text-blue-300">Memperbarui...</span>}</div></div>{loading&&players.length===0?<div className="flex min-h-48 items-center justify-center text-sm text-slate-400">Memuat daftar seeded...</div>:error&&players.length===0?<div className="m-4 rounded-xl border border-red-400/20 bg-red-500/10 p-4 text-xs text-red-300">{error}</div>:filtered.length===0?<div className="flex min-h-40 items-center justify-center px-4 text-sm text-slate-500">Tidak ada peserta yang sesuai pencarian.</div>:<div className="w-full min-w-0 overflow-hidden"><table className="w-full min-w-0 max-w-full table-fixed border-collapse text-left"><colgroup><col className="w-[32%]"/><col className="w-[30%]"/><col className="w-[12%]"/><col className="w-[26%]"/></colgroup><thead className="bg-white/[.035] text-[9px] font-black uppercase tracking-wide text-slate-400 sm:text-[10px]"><tr><th className="break-words px-2 py-3 sm:px-5">Nama Pemain</th><th className="break-words px-2 py-3 sm:px-5">PB / Klub</th><th className="break-words px-1 py-3 text-center sm:px-5">Gender</th><th className="break-words px-1 py-3 text-center sm:px-5">Kualitas Seeded</th></tr></thead><tbody className="divide-y divide-white/[.06]">{filtered.map(p=><tr key={p.id} className="transition hover:bg-blue-500/[.04]"><td className="max-w-0 break-words px-2 py-3 text-[11px] font-semibold leading-4 text-white sm:px-5 sm:text-sm">{text(p.player_name)||'-'}</td><td className="max-w-0 break-words px-2 py-3 text-[11px] leading-4 text-slate-300 sm:px-5 sm:text-sm">{text(p.club_name)||'-'}</td><td className="max-w-0 break-words px-1 py-3 text-center text-[10px] leading-4 text-slate-300 sm:px-5 sm:text-sm">{text(p.gender)||'-'}</td><td className="max-w-0 break-words px-1 py-3 text-center sm:px-5"><span className="inline-flex max-w-full items-center justify-center whitespace-normal break-words rounded-lg border border-amber-400/20 bg-amber-400/10 px-1.5 py-1 text-[8px] font-black leading-3 text-amber-300 sm:px-2.5 sm:text-[10px]">{text(p.seeded_quality)||'Belum ditetapkan'}</span></td></tr>)}</tbody></table></div>}</section>
 </div></main>;
}
