import React, { useEffect, useState, useCallback } from 'react';
import { remoteSupabase } from './supabase';
import Swal from 'sweetalert2';
import { Registrant } from './types';
import { Search, Users, Trophy, Edit3, ChevronLeft, ChevronRight, Loader2, Plus, X, Save, RefreshCcw } from 'lucide-react';

export default function ManajemenAtlet() {
  const [atlets, setAtlets] = useState<Registrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAtlet, setSelectedAtlet] = useState<any | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStats, setEditingStats] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newAtlet, setNewAtlet] = useState({ nama:'', whatsapp:'', kategori:'SENIOR', domisili:'', seed:'UNSEEDED', points:0 });

  const withTimeout = <T,>(promise: Promise<T>, ms = 10000): Promise<T> =>
    Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Supabase request timeout')), ms))]);

  const fetchAtlets = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r, s] = await Promise.all([
        withTimeout(remoteSupabase.from('pendaftaran').select('*').order('nama', { ascending: true })),
        withTimeout(remoteSupabase.from('rankings').select('*').order('total_points', { ascending: false })),
        withTimeout(remoteSupabase.from('atlet_stats').select('pendaftaran_id, points, total_points, seed')),
      ]);
      if (p.error) throw p.error;
      const pendaftaran: any[] = p.data || [];
      const rankings: any[] = r.data || [];
      const stats: any[] = s.data || [];
      const statsMap = new Map(stats.map((x:any) => [x.pendaftaran_id, x]));
      const formatted = pendaftaran.map((a:any) => {
        const ranking = rankings.find((x:any) => x.pendaftaran_id === a.id || String(x.player_name || '').trim().toLowerCase() === String(a.nama || '').trim().toLowerCase());
        const stat:any = statsMap.get(a.id);
        const points = stat ? Number(stat.points || 0) + Number(stat.total_points || 0) : Number(ranking?.total_points || 0);
        return { ...a, points, seed: stat?.seed || ranking?.seed || 'UNSEEDED', rank: ranking ? rankings.indexOf(ranking) + 1 : 0, foto_url: a.foto_url || ranking?.photo_url || '' };
      });
      setAtlets(formatted);
      console.log('[ManajemenAtlet] loaded', { pendaftaran: pendaftaran.length, rankings: rankings.length, stats: stats.length });
    } catch (err:any) {
      console.error('[ManajemenAtlet] fetch error', err);
      setAtlets([]);
      Swal.fire({ icon:'error', title:'Gagal Memuat Data Atlet', text:err?.message || 'Supabase tidak dapat diakses.', confirmButtonColor:'#2563EB' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void fetchAtlets();
    const channel = remoteSupabase.channel('manajemen-atlet-ui')
      .on('postgres_changes', { event:'*', schema:'public', table:'pendaftaran' }, () => void fetchAtlets())
      .on('postgres_changes', { event:'*', schema:'public', table:'rankings' }, () => void fetchAtlets())
      .on('postgres_changes', { event:'*', schema:'public', table:'atlet_stats' }, () => void fetchAtlets())
      .subscribe();
    return () => { void remoteSupabase.removeChannel(channel); };
  }, [fetchAtlets]);

  useEffect(() => setCurrentPage(1), [searchTerm]);

  const openEdit = (a:any) => {
    setSelectedAtlet(a);
    setEditingStats({ nama:a.nama || '', kategori:a.kategori || a.kategori_atlet || 'SENIOR', seed:a.seed || 'UNSEEDED', points:Number(a.points || 0) });
    setIsEditModalOpen(true);
  };

  const handleUpdateStats = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!editingStats?.nama || isSaving) return;
    setIsSaving(true);
    try {
      const { data: person, error: findError } = await remoteSupabase.from('pendaftaran').select('id,nama').eq('nama', editingStats.nama).maybeSingle();
      if (findError) throw findError;
      if (!person) throw new Error('Data atlet tidak ditemukan di tabel pendaftaran.');
      const { error:pError } = await remoteSupabase.from('pendaftaran').update({ kategori:editingStats.kategori }).eq('id', person.id);
      if (pError) throw pError;
      const { error:rError } = await remoteSupabase.from('rankings').upsert({ pendaftaran_id:person.id, player_name:person.nama, category:editingStats.kategori, seed:editingStats.seed, total_points:Number(editingStats.points || 0) }, { onConflict:'player_name' });
      if (rError) throw rError;
      await fetchAtlets();
      setIsEditModalOpen(false);
      setSelectedAtlet(null);
      Swal.fire({ icon:'success', title:'Data Atlet Diperbarui', text:'Perubahan sudah tersimpan di Supabase.', timer:1800, showConfirmButton:false });
    } catch (err:any) {
      Swal.fire({ icon:'error', title:'Update Gagal', text:err?.message || 'Tidak dapat menyimpan perubahan.', confirmButtonColor:'#2563EB' });
    } finally { setIsSaving(false); }
  };

  const handleAdd = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!newAtlet.nama.trim() || isSaving) return;
    setIsSaving(true);
    try {
      const { data, error } = await remoteSupabase.from('pendaftaran').insert({ nama:newAtlet.nama.trim(), whatsapp:newAtlet.whatsapp, kategori:newAtlet.kategori, domisili:newAtlet.domisili, status:'verified' }).select('id,nama').single();
      if (error) throw error;
      const { error:rError } = await remoteSupabase.from('rankings').upsert({ pendaftaran_id:data.id, player_name:data.nama, category:newAtlet.kategori, seed:newAtlet.seed, total_points:Number(newAtlet.points || 0) }, { onConflict:'player_name' });
      if (rError) throw rError;
      await fetchAtlets();
      setIsAddModalOpen(false);
      setNewAtlet({ nama:'', whatsapp:'', kategori:'SENIOR', domisili:'', seed:'UNSEEDED', points:0 });
      Swal.fire({ icon:'success', title:'Atlet Ditambahkan', text:'Data berhasil tersimpan di Supabase.', timer:1800, showConfirmButton:false });
    } catch (err:any) {
      Swal.fire({ icon:'error', title:'Gagal Menambahkan Atlet', text:err?.message || 'Tidak dapat menyimpan data.', confirmButtonColor:'#2563EB' });
    } finally { setIsSaving(false); }
  };

  const filtered = atlets.filter((a:any) => String(a.nama || '').toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const topTier = atlets.filter((a:any) => ['A','B+'].includes(String(a.seed))).length;

  if (loading) return <div className="min-h-[520px] flex items-center justify-center bg-slate-950"><div className="text-center"><Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-blue-500"/><div className="text-sm font-semibold tracking-[0.25em] text-slate-300">MENGAKSES SERVER...</div></div></div>;

  return (
    <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-6 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><div className="mb-2 text-xs font-bold tracking-[0.35em] text-slate-400">PRO DATABASE SYSTEM</div><h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">MANAJEMEN <span className="text-blue-500">ATLET</span></h1></div>
          <button onClick={() => void fetchAtlets()} className="hidden rounded-xl border border-slate-700 bg-slate-900 p-3 text-slate-300 hover:bg-slate-800 sm:block" title="Refresh"><RefreshCcw size={20}/></button>
        </div>

        <button onClick={() => setIsAddModalOpen(true)} className="mb-5 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-5 text-xl font-extrabold text-white shadow-lg shadow-blue-900/30 hover:bg-blue-500"><Plus size={28}/> TAMBAH ATLET</button>

        <div className="mb-5 grid grid-cols-2 overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="border-r border-slate-200 p-5 text-center"><div className="text-xs font-bold tracking-[0.2em] text-slate-500">TOTAL ATLET</div><div className="mt-1 text-4xl font-black text-slate-900">{atlets.length}</div></div>
          <div className="p-5 text-center"><div className="text-xs font-bold tracking-[0.2em] text-slate-500">TOP TIER</div><div className="mt-1 text-4xl font-black text-blue-600">{topTier}</div></div>
        </div>

        <div className="relative mb-6"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22}/><input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="CARI NAMA ATLET..." className="w-full rounded-2xl border border-slate-200 bg-white py-5 pl-14 pr-5 text-base font-medium text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"/></div>

        {currentItems.length === 0 ? <div className="rounded-2xl bg-white py-20 text-center text-slate-500">Tidak ada data atlet.</div> : <div className="grid gap-4 sm:grid-cols-2">
          {currentItems.map((a:any) => <div key={a.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-50 text-blue-700 ring-2 ring-blue-100">{a.foto_url ? <img src={a.foto_url} alt="" className="h-full w-full object-cover"/> : <Users size={25}/>}</div>
              <div className="min-w-0 flex-1"><div className="truncate text-lg font-extrabold text-slate-900">{a.nama || 'Tanpa Nama'}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600"><span>{a.kategori || a.kategori_atlet || 'SENIOR'}</span><span>•</span><span>{Number(a.points || 0).toLocaleString('id-ID')} poin</span></div></div>
              <button onClick={()=>openEdit(a)} className="rounded-xl bg-slate-100 p-3 text-slate-700 hover:bg-blue-50 hover:text-blue-600" title="Edit atlet"><Edit3 size={18}/></button>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"><Trophy size={13}/> {a.seed || 'UNSEEDED'}</span><span className="text-xs font-semibold text-slate-400">RANK #{a.rank || '-'}</span></div>
          </div>)}
        </div>}

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-3 shadow-md"><button disabled={currentPage<=1} onClick={()=>setCurrentPage(p=>p-1)} className="rounded-xl p-3 text-slate-700 disabled:opacity-30"><ChevronLeft/></button><span className="text-sm font-bold text-slate-600">HALAMAN {currentPage} / {totalPages}</span><button disabled={currentPage>=totalPages} onClick={()=>setCurrentPage(p=>p+1)} className="rounded-xl p-3 text-slate-700 disabled:opacity-30"><ChevronRight/></button></div>
      </div>

      {isEditModalOpen && editingStats && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleUpdateStats} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">EDIT DATA ATLET</h2><button type="button" onClick={()=>setIsEditModalOpen(false)}><X className="text-slate-500"/></button></div><div className="mb-4 rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-slate-500">NAMA ATLET</div><div className="mt-1 font-extrabold text-slate-900">{editingStats.nama}</div></div><label className="mb-4 block text-sm font-bold text-slate-700">Kategori<select value={editingStats.kategori} onChange={e=>setEditingStats((v:any)=>({...v,kategori:e.target.value}))} className="mt-2 w-full rounded-xl border p-3 text-slate-900"><option>SENIOR</option><option>MUDA</option><option>Dewasa / Umum</option><option>VETERAN</option></select></label><label className="mb-4 block text-sm font-bold text-slate-700">Tier<select value={editingStats.seed} onChange={e=>setEditingStats((v:any)=>({...v,seed:e.target.value}))} className="mt-2 w-full rounded-xl border p-3 text-slate-900"><option>UNSEEDED</option><option>A</option><option>B+</option><option>B-</option><option>C</option></select></label><label className="mb-5 block text-sm font-bold text-slate-700">Total Poin<input type="number" value={editingStats.points} onChange={e=>setEditingStats((v:any)=>({...v,points:Number(e.target.value)}))} className="mt-2 w-full rounded-xl border p-3 text-slate-900"/></label><button disabled={isSaving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-extrabold text-white disabled:opacity-60">{isSaving?<Loader2 className="animate-spin"/>:<Save size={18}/>} SIMPAN PERUBAHAN</button></form></div>}

      {isAddModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"><form onSubmit={handleAdd} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-black text-slate-900">TAMBAH ATLET</h2><button type="button" onClick={()=>setIsAddModalOpen(false)}><X className="text-slate-500"/></button></div><div className="space-y-3"><input required value={newAtlet.nama} onChange={e=>setNewAtlet(v=>({...v,nama:e.target.value}))} placeholder="Nama lengkap" className="w-full rounded-xl border p-3 text-slate-900"/><input value={newAtlet.whatsapp} onChange={e=>setNewAtlet(v=>({...v,whatsapp:e.target.value}))} placeholder="WhatsApp" className="w-full rounded-xl border p-3 text-slate-900"/><input value={newAtlet.domisili} onChange={e=>setNewAtlet(v=>({...v,domisili:e.target.value}))} placeholder="Domisili" className="w-full rounded-xl border p-3 text-slate-900"/><select value={newAtlet.kategori} onChange={e=>setNewAtlet(v=>({...v,kategori:e.target.value}))} className="w-full rounded-xl border p-3 text-slate-900"><option>SENIOR</option><option>MUDA</option><option>Dewasa / Umum</option><option>VETERAN</option></select><select value={newAtlet.seed} onChange={e=>setNewAtlet(v=>({...v,seed:e.target.value}))} className="w-full rounded-xl border p-3 text-slate-900"><option>UNSEEDED</option><option>A</option><option>B+</option><option>B-</option><option>C</option></select><input type="number" value={newAtlet.points} onChange={e=>setNewAtlet(v=>({...v,points:Number(e.target.value)}))} placeholder="Poin" className="w-full rounded-xl border p-3 text-slate-900"/></div><button disabled={isSaving} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 p-4 font-extrabold text-white disabled:opacity-60">{isSaving?<Loader2 className="animate-spin"/>:<Plus size={18}/>} SIMPAN ATLET</button></form></div>}
    </div>
  );
}
