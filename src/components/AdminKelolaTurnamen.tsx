import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronRight, Edit3, Filter, Link2, Plus, RefreshCw, Save, Search, Trash2, Trophy, Users, XCircle, Database, ShieldCheck, ClipboardList } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

type Tournament = {
  id: number;
  name: string;
  organizer: string | null;
  event_start: string | null;
  event_end: string | null;
  venue: string | null;
  registration_fee: number | null;
  registration_deadline: string | null;
  technical_meeting: string | null;
  match_system: string | null;
  contact_registration: string | null;
  email_website: string | null;
  description: string | null;
  status: string;
  is_active: boolean;
  created_at: string;
};

type Registration = {
  id: string;
  tournament_id: number | null;
  kode_pendaftaran: string;
  nama_pemain_1: string;
  nama_pemain_2: string;
  kategori: string;
  asal_pb: string | null;
  domisili: string | null;
  whatsapp: string;
  biaya_pendaftaran: number;
  status_pembayaran: string;
  status_pendaftaran: string;
  created_at: string;
};

const blank: Omit<Tournament, 'id' | 'created_at'> = {
  name: '', organizer: '', event_start: '', event_end: '', venue: '', registration_fee: 0,
  registration_deadline: '', technical_meeting: '', match_system: '', contact_registration: '',
  email_website: '', description: '', status: 'draft', is_active: false
};
const text = (v: unknown) => String(v ?? '').trim();
const money = (v: unknown) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(v || 0));
const date = (v?: string | null) => v ? new Date(`${v}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export default function AdminKelolaTurnamen() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<'tournament' | 'participants'>('tournament');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [status, setStatus] = useState('Semua');
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        supabase.from('seeded_tournaments').select('*').order('is_active', { ascending: false }).order('event_start', { ascending: false, nullsFirst: false }),
        supabase.from('pendaftaran_turnamen').select('id,tournament_id,kode_pendaftaran,nama_pemain_1,nama_pemain_2,kategori,asal_pb,domisili,whatsapp,biaya_pendaftaran,status_pembayaran,status_pendaftaran,created_at').order('created_at', { ascending: false })
      ]);
      if (t.error) throw t.error;
      if (r.error) throw r.error;
      const ts = (t.data || []) as Tournament[];
      setTournaments(ts);
      setRegistrations((r.data || []) as Registration[]);
      setSelectedId(prev => prev && ts.some(x => x.id === prev) ? prev : ts.find(x => x.is_active)?.id ?? ts[0]?.id ?? null);
    } catch (e: any) {
      await Swal.fire({ icon: 'error', title: 'Data turnamen gagal dimuat', text: e?.message || 'Periksa koneksi database.', confirmButtonColor: '#2563eb' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); const c = supabase.channel('admin_tournament_manager').on('postgres_changes', { event: '*', schema: 'public', table: 'seeded_tournaments' }, () => void load()).on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load()).subscribe(); return () => { supabase.removeChannel(c); }; }, [load]);

  const selected = useMemo(() => tournaments.find(t => t.id === selectedId) || null, [tournaments, selectedId]);
  const linked = useMemo(() => registrations.filter(r => r.tournament_id === selectedId), [registrations, selectedId]);
  const categories = useMemo(() => ['Semua', ...Array.from(new Set(linked.map(r => text(r.kategori)).filter(Boolean))).sort()], [linked]);
  const filtered = useMemo(() => { const q = text(query).toLowerCase(); return linked.filter(r => { const hay = [r.kode_pendaftaran,r.nama_pemain_1,r.nama_pemain_2,r.kategori,r.asal_pb,r.domisili,r.whatsapp].map(text).join(' ').toLowerCase(); return (!q || hay.includes(q)) && (category === 'Semua' || text(r.kategori) === category) && (status === 'Semua' || text(r.status_pendaftaran).toLowerCase() === status.toLowerCase()); }); }, [linked, query, category, status]);
  const stats = useMemo(() => ({ total: linked.length, accepted: linked.filter(r => text(r.status_pendaftaran).toLowerCase() === 'diterima').length, paid: linked.filter(r => text(r.status_pembayaran).toLowerCase().includes('terver')).length, unpaid: linked.filter(r => !text(r.status_pembayaran).toLowerCase().includes('terver')).length }), [linked]);
  const unlinked = registrations.filter(r => !r.tournament_id).length;

  const openCreate = () => { setEditing(null); setForm(blank); setFormOpen(true); };
  const openEdit = (t: Tournament) => { setEditing(t.id); setForm({ name:t.name||'', organizer:t.organizer||'', event_start:t.event_start||'', event_end:t.event_end||'', venue:t.venue||'', registration_fee:Number(t.registration_fee||0), registration_deadline:t.registration_deadline||'', technical_meeting:t.technical_meeting||'', match_system:t.match_system||'', contact_registration:t.contact_registration||'', email_website:t.email_website||'', description:t.description||'', status:t.status||'draft', is_active:!!t.is_active }); setFormOpen(true); };
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!text(form.name)) return Swal.fire({ icon:'warning', title:'Nama turnamen wajib diisi' }); setSaving(true); try {
    if (form.is_active) await supabase.from('seeded_tournaments').update({ is_active:false }).neq('id', editing ?? -1);
    const payload = { ...form, name:text(form.name), organizer:text(form.organizer)||null, venue:text(form.venue)||null, registration_fee:Number(form.registration_fee||0), registration_deadline:text(form.registration_deadline)||null, technical_meeting:text(form.technical_meeting)||null, match_system:text(form.match_system)||null, contact_registration:text(form.contact_registration)||null, email_website:text(form.email_website)||null, description:text(form.description)||null };
    const result = editing ? await supabase.from('seeded_tournaments').update(payload).eq('id', editing) : await supabase.from('seeded_tournaments').insert(payload);
    if (result.error) throw result.error;
    setFormOpen(false); await load(); await Swal.fire({ icon:'success', title:'Data turnamen tersimpan', timer:1000, showConfirmButton:false });
  } catch(e:any) { Swal.fire({ icon:'error', title:'Gagal menyimpan turnamen', text:e?.message||'Database menolak perubahan.' }); } finally { setSaving(false); } };

  const activate = async (t: Tournament) => { const c = await Swal.fire({ icon:'question', title:'Jadikan turnamen aktif?', text:t.name, showCancelButton:true, confirmButtonText:'Ya, Aktifkan', cancelButtonText:'Batal', confirmButtonColor:'#16a34a' }); if(!c.isConfirmed)return; try { const a=await supabase.from('seeded_tournaments').update({is_active:false}); if(a.error)throw a.error; const b=await supabase.from('seeded_tournaments').update({is_active:true,status:'berlangsung'}).eq('id',t.id); if(b.error)throw b.error; await load(); } catch(e:any){ Swal.fire({icon:'error',title:'Gagal mengaktifkan',text:e?.message||'Perubahan ditolak database.'}); } };
  const assignUnlinked = async () => { if(!selectedId || !unlinked)return; const c=await Swal.fire({icon:'warning',title:`Hubungkan ${unlinked} pendaftaran?`,text:`Semua pendaftaran yang belum memiliki turnamen akan dikaitkan ke ${selected?.name||'turnamen ini'}.`,showCancelButton:true,confirmButtonText:'Hubungkan',cancelButtonText:'Batal',confirmButtonColor:'#2563eb'}); if(!c.isConfirmed)return; try { const {error}=await supabase.from('pendaftaran_turnamen').update({tournament_id:selectedId}).is('tournament_id',null); if(error)throw error; await load(); Swal.fire({icon:'success',title:'Pendaftaran terhubung',timer:1000,showConfirmButton:false}); } catch(e:any){ Swal.fire({icon:'error',title:'Gagal menghubungkan',text:e?.message||'Perubahan ditolak database.'}); } };
  const removeTournament = async (t:Tournament) => { if(t.is_active)return Swal.fire({icon:'info',title:'Turnamen aktif tidak dapat dihapus',text:'Aktifkan turnamen lain terlebih dahulu.'}); const c=await Swal.fire({icon:'warning',title:'Hapus turnamen?',text:t.name,showCancelButton:true,confirmButtonText:'Ya, Hapus',cancelButtonText:'Batal',confirmButtonColor:'#dc2626'}); if(!c.isConfirmed)return; try { const {error}=await supabase.from('seeded_tournaments').delete().eq('id',t.id); if(error)throw error; await load(); } catch(e:any){ Swal.fire({icon:'error',title:'Gagal menghapus',text:e?.message||'Turnamen masih memiliki relasi data.'}); } };

  const input = (key: keyof typeof blank, label: string, type='text') => <label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><input type={type} value={String(form[key] ?? '')} onChange={e=>setForm(f=>({...f,[key]:type==='number'?Number(e.target.value):e.target.value}))} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500 sm:text-sm" /></label>;

  return <div className="min-h-full bg-[#050b17] p-3 text-white sm:p-5 md:p-8"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="overflow-hidden rounded-[28px] border border-blue-400/20 bg-gradient-to-br from-[#07152d] via-[#0b1730] to-[#050914] p-5 shadow-2xl sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300"><Trophy size={14}/> Pusat Data Turnamen</span><h1 className="mt-3 text-2xl font-black uppercase tracking-tight sm:text-4xl">Kelola Data Turnamen</h1><p className="mt-2 max-w-4xl text-xs leading-5 text-slate-300 sm:text-sm">Satu pusat pengelolaan turnamen, pendaftaran peserta, pembayaran, seeded, dan data pertandingan yang terhubung ke database.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase"><RefreshCw size={15}/> Muat Ulang</button><button onClick={openCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase shadow-lg"><Plus size={15}/> Turnamen Baru</button></div></div></header>
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Stat label="Turnamen" value={tournaments.length} icon={<Trophy size={17}/>} /><Stat label="Peserta Terhubung" value={stats.total} icon={<Users size={17}/>} /><Stat label="Diterima" value={stats.accepted} icon={<CheckCircle2 size={17}/>} /><Stat label="Pembayaran OK" value={stats.paid} icon={<ShieldCheck size={17}/>} /></section>
    <section className="grid gap-4 lg:grid-cols-[330px_minmax(0,1fr)]"><aside className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 shadow-xl"><div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-black uppercase tracking-wider text-slate-300">Daftar Turnamen</h2><span className="rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black text-blue-300">{tournaments.length}</span></div><div className="space-y-2">{tournaments.map(t=><button key={t.id} onClick={()=>setSelectedId(t.id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedId===t.id?'border-blue-500/60 bg-blue-500/10':'border-white/5 bg-slate-950/50 hover:border-white/15'}`}><div className="flex items-start gap-2"><Trophy size={16} className={t.is_active?'text-amber-300':'text-slate-500'}/><div className="min-w-0 flex-1"><p className="text-xs font-black leading-4">{t.name}</p><p className="mt-1 text-[10px] text-slate-500">{date(t.event_start)} — {date(t.event_end)}</p>{t.is_active&&<span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-300">Turnamen Aktif</span>}</div><ChevronRight size={15} className="shrink-0 text-slate-600"/></div></button>)}</div></aside>
      <main className="min-w-0 rounded-2xl border border-white/10 bg-slate-900/80 shadow-xl"><div className="flex flex-wrap border-b border-white/10"><button onClick={()=>setTab('tournament')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${tab==='tournament'?'border-b-2 border-blue-500 text-blue-300':'text-slate-500'}`}>Data Turnamen</button><button onClick={()=>setTab('participants')} className={`px-4 py-3 text-[10px] font-black uppercase tracking-wider ${tab==='participants'?'border-b-2 border-blue-500 text-blue-300':'text-slate-500'}`}>Pendaftaran Terhubung ({linked.length})</button></div>
      {!selected ? <div className="p-8 text-center text-sm text-slate-500">Belum ada turnamen. Tambahkan turnamen baru.</div> : tab==='tournament' ? <div className="p-4 sm:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black sm:text-2xl">{selected.name}</h2>{selected.is_active?<span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-emerald-300">Berlangsung</span>:<span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-slate-400">{selected.status}</span>}</div><p className="mt-2 text-xs text-slate-400">ID Turnamen: {selected.id} • Dibuat {new Date(selected.created_at).toLocaleDateString('id-ID')}</p></div><div className="flex flex-wrap gap-2"><button onClick={()=>openEdit(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 px-3 text-[10px] font-black uppercase"><Edit3 size={14}/> Edit</button>{!selected.is_active&&<button onClick={()=>void activate(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-[10px] font-black uppercase"><CheckCircle2 size={14}/> Jadikan Aktif</button>}<button onClick={()=>void removeTournament(selected)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-500/20 px-3 text-[10px] font-black uppercase text-red-300"><Trash2 size={14}/> Hapus</button></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Penyelenggara',selected.organizer],['Tanggal',`${date(selected.event_start)} — ${date(selected.event_end)}`],['Lokasi',selected.venue],['Biaya Pendaftaran',money(selected.registration_fee)],['Batas Pendaftaran',selected.registration_deadline],['Technical Meeting',selected.technical_meeting],['Sistem Pertandingan',selected.match_system],['Kontak',selected.contact_registration],['Email / Website',selected.email_website]].map(([k,v])=><div key={k} className="rounded-xl border border-white/5 bg-slate-950/60 p-3"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{k}</p><p className="mt-1 whitespace-pre-wrap text-xs font-bold leading-5 text-slate-200">{text(v)||'-'}</p></div>)}</div>{selected.description&&<div className="mt-3 rounded-xl border border-white/5 bg-slate-950/60 p-3"><p className="text-[8px] font-black uppercase text-slate-500">Deskripsi</p><p className="mt-1 text-xs leading-5 text-slate-300">{selected.description}</p></div>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Mini label="Total Pendaftaran" value={stats.total} icon={<ClipboardList size={16}/>} /><Mini label="Diterima" value={stats.accepted} icon={<CheckCircle2 size={16}/>} /><Mini label="Pembayaran OK" value={stats.paid} icon={<ShieldCheck size={16}/>} /><Mini label="Belum Bayar" value={stats.unpaid} icon={<XCircle size={16}/>} /></div>
      {unlinked>0&&<div className="mt-5 flex flex-col gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black text-amber-200">{unlinked} pendaftaran belum memiliki relasi turnamen</p><p className="mt-1 text-[10px] text-slate-400">Hubungkan hanya data yang belum memiliki tournament_id.</p></div><button onClick={()=>void assignUnlinked()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black uppercase"><Link2 size={14}/> Hubungkan ke turnamen ini</button></div>}
      </div> : <div className="p-4 sm:p-6"><div className="mb-4 grid gap-2 lg:grid-cols-[1fr_180px_180px_auto]"><label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kode, pemain, PB, kategori..." className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-10 text-xs text-white outline-none focus:border-blue-500"/></label><select value={category} onChange={e=>setCategory(e.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white"><option value="Semua">Semua Kategori</option>{categories.filter(x=>x!=='Semua').map(x=><option key={x}>{x}</option>)}</select><select value={status} onChange={e=>setStatus(e.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white"><option value="Semua">Semua Status</option><option value="diterima">Diterima</option><option value="pending">Pending</option><option value="ditolak">Ditolak</option></select><button onClick={()=>{setQuery('');setCategory('Semua');setStatus('Semua')}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-[10px] font-black uppercase"><Filter size={14}/> Reset</button></div><div className="overflow-x-auto rounded-xl border border-white/5"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-slate-950 text-[9px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-3 py-3">Kode</th><th className="px-3 py-3">Pasangan</th><th className="px-3 py-3">Kategori</th><th className="px-3 py-3">PB / Domisili</th><th className="px-3 py-3">Pendaftaran</th><th className="px-3 py-3">Pembayaran</th><th className="px-3 py-3">Tanggal</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map(r=><tr key={r.id} className="hover:bg-white/[.02]"><td className="px-3 py-3 font-mono text-blue-300">{r.kode_pendaftaran}</td><td className="px-3 py-3"><div className="font-bold">{r.nama_pemain_1}</div><div className="text-slate-500">& {r.nama_pemain_2}</div></td><td className="px-3 py-3 text-slate-300">{r.kategori}</td><td className="px-3 py-3"><div>{r.asal_pb||'-'}</div><div className="text-slate-500">{r.domisili||'-'}</div></td><td className="px-3 py-3"><span className={text(r.status_pendaftaran).toLowerCase()==='diterima'?'text-emerald-300':'text-amber-300'}>{r.status_pendaftaran}</span></td><td className="px-3 py-3"><div>{r.status_pembayaran}</div><div className="text-slate-500">{money(r.biaya_pendaftaran)}</div></td><td className="px-3 py-3 text-slate-500">{new Date(r.created_at).toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'})}</td></tr>)}</tbody></table>{!filtered.length&&<div className="p-8 text-center text-xs text-slate-500">Tidak ada pendaftaran sesuai filter.</div>}</div><div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500"><Database size={14}/> Menampilkan {filtered.length} dari {linked.length} pendaftaran yang terhubung ke turnamen ini.</div></div>}
      </main></section>
    {formOpen&&<div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"><form onSubmit={save} className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0b1324] p-4 shadow-2xl sm:rounded-3xl sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-black uppercase">{editing?'Edit Turnamen':'Turnamen Baru'}</h2><p className="text-[10px] text-slate-500">Semua perubahan tersimpan ke master turnamen.</p></div><button type="button" onClick={()=>setFormOpen(false)} className="rounded-xl border border-white/10 p-2"><X size={17}/></button></div><div className="grid gap-3 sm:grid-cols-2">{input('name','Nama Turnamen','text')}{input('organizer','Penyelenggara')}{input('event_start','Tanggal Mulai','date')}{input('event_end','Tanggal Selesai','date')}{input('venue','Lokasi / Venue')}{input('registration_fee','Biaya Pendaftaran','number')}{input('registration_deadline','Batas Pendaftaran')}{input('technical_meeting','Technical Meeting')}{input('match_system','Sistem Pertandingan')}{input('contact_registration','Kontak Pendaftaran')}{input('email_website','Email / Website')}<label className="block"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Status</span><select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white"><option value="draft">Draft</option><option value="dibuka">Pendaftaran Dibuka</option><option value="berlangsung">Berlangsung</option><option value="selesai">Selesai</option><option value="ditutup">Ditutup</option></select></label><label className="flex min-h-11 items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3"><input type="checkbox" checked={form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/><span className="text-xs font-black">Jadikan turnamen aktif</span></label><label className="sm:col-span-2 block"><span className="mb-1 block text-[9px] font-black uppercase tracking-wider text-slate-400">Deskripsi</span><textarea value={form.description||''} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={4} className="w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-xs text-white outline-none focus:border-blue-500"/></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={()=>setFormOpen(false)} className="min-h-11 rounded-xl border border-white/10 px-4 text-xs font-black uppercase">Batal</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black uppercase disabled:opacity-50"><Save size={15}/>{saving?'Menyimpan...':'Simpan Turnamen'}</button></div></form></div>}
  </div></div>;
}

function Stat({label,value,icon}:{label:string,value:number,icon:React.ReactNode}) { return <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3 shadow-xl"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><span className="text-blue-300">{icon}</span></div><b className="mt-2 block text-2xl font-black">{value}</b></div>; }
function Mini({label,value,icon}:{label:string,value:number,icon:React.ReactNode}) { return <div className="rounded-xl border border-white/5 bg-slate-950/60 p-3"><div className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-500">{icon}{label}</div><b className="mt-1 block text-lg font-black">{value}</b></div>; }
