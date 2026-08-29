import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Search, RefreshCw, Eye, Pencil, Trash2, CheckCircle2, XCircle, Clock3, Trophy, Users, CreditCard, Filter, X, Save, ExternalLink } from 'lucide-react';

type Registration = {
  id: string | number;
  created_at?: string;
  kode_pendaftaran?: string;
  kategori?: string;
  nama_pemain_1?: string;
  nama_pemain_2?: string;
  whatsapp?: string;
  email?: string | null;
  asal_pb?: string;
  domisili?: string;
  biaya_pendaftaran?: number;
  status_pembayaran?: string;
  status_pendaftaran?: string;
  bukti_pembayaran_url?: string | null;
  nik_pemain_1?: string | null;
  nik_pemain_2?: string | null;
  wilayah_nik_pemain_1?: string | null;
  wilayah_nik_pemain_2?: string | null;
  foto_pemain_1_url?: string | null;
  foto_pemain_2_url?: string | null;
  ktp_pemain_1_url?: string | null;
  ktp_pemain_2_url?: string | null;
  verifikasi_nik_status?: string | null;
  verifikasi_nik_detail?: string | null;
  [key: string]: any;
};

const clean = (v: unknown) => String(v ?? '').trim();
const statusReg = (v?: string) => {
  const s = clean(v).toLowerCase();
  if (['diterima','approved','terverifikasi','lolos'].includes(s)) return 'diterima';
  if (['ditolak','rejected'].includes(s)) return 'ditolak';
  return 'pending';
};
const statusPay = (v?: string) => clean(v).toLowerCase().includes('terver') || clean(v).toLowerCase().includes('lunas') || clean(v).toLowerCase().includes('diterima') ? 'terverifikasi' : 'menunggu';
const rupiah = (n?: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n || 0));
const dateId = (v?: string) => v ? new Date(v).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

export default function AdminPendaftaranTurnamen() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Semua');
  const [registrationStatus, setRegistrationStatus] = useState('Semua');
  const [paymentStatus, setPaymentStatus] = useState('Semua');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Registration | null>(null);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [saving, setSaving] = useState(false);
  const pageSize = 10;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('pendaftaran_turnamen').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setRows((data || []) as Registration[]);
    } catch (e: any) {
      console.error(e);
      await Swal.fire({ icon: 'error', title: 'Data pendaftaran tidak dapat dimuat', text: e?.message || 'Periksa koneksi database dan hak akses admin.', confirmButtonColor: '#2563eb' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const onChange = () => void load();
    window.addEventListener('app_data_changed', onChange);
    window.addEventListener('table_updated_pendaftaran_turnamen', onChange);
    const channel = supabase.channel('admin_pendaftaran_turnamen_sync').on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran_turnamen' }, () => void load()).subscribe();
    return () => { window.removeEventListener('app_data_changed', onChange); window.removeEventListener('table_updated_pendaftaran_turnamen', onChange); supabase.removeChannel(channel); };
  }, [load]);

  const categories = useMemo(() => ['Semua', ...Array.from(new Set(rows.map(r => clean(r.kategori)).filter(Boolean)))], [rows]);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return rows.filter(r => {
      const hay = [r.kode_pendaftaran, r.nama_pemain_1, r.nama_pemain_2, r.whatsapp, r.email, r.asal_pb, r.domisili, r.kategori].map(clean).join(' ').toLowerCase();
      return (!q || hay.includes(q)) && (category === 'Semua' || clean(r.kategori) === category) && (registrationStatus === 'Semua' || statusReg(r.status_pendaftaran) === registrationStatus) && (paymentStatus === 'Semua' || statusPay(r.status_pembayaran) === paymentStatus);
    });
  }, [rows, query, category, registrationStatus, paymentStatus]);

  useEffect(() => setPage(1), [query, category, registrationStatus, paymentStatus]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const stats = useMemo(() => ({ total: rows.length, pending: rows.filter(r => statusReg(r.status_pendaftaran) === 'pending').length, accepted: rows.filter(r => statusReg(r.status_pendaftaran) === 'diterima').length, rejected: rows.filter(r => statusReg(r.status_pendaftaran) === 'ditolak').length, paid: rows.filter(r => statusPay(r.status_pembayaran) === 'terverifikasi').length }), [rows]);

  const updateStatus = async (row: Registration, nextReg: 'Diterima' | 'Ditolak') => {
    let note = '';
    if (nextReg === 'Ditolak') {
      const result = await Swal.fire({ title: 'Tolak pendaftaran?', text: `Pendaftaran ${row.kode_pendaftaran || ''} akan ditandai ditolak.`, input: 'textarea', inputPlaceholder: 'Alasan penolakan (opsional)...', showCancelButton: true, confirmButtonText: 'Tolak', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
      if (!result.isConfirmed) return;
      note = clean(result.value);
    } else {
      const result = await Swal.fire({ icon: 'question', title: 'Terima pendaftaran?', text: `${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}`, showCancelButton: true, confirmButtonText: 'Ya, Terima', cancelButtonText: 'Batal', confirmButtonColor: '#16a34a' });
      if (!result.isConfirmed) return;
    }
    try {
      const payload: any = { status_pendaftaran: nextReg };
      if (note) payload.catatan_verifikasi = note;
      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', row.id);
      if (error) throw error;
      await load();
      Swal.fire({ icon: 'success', title: 'Status diperbarui', timer: 1100, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memperbarui status', text: e?.message || 'Perubahan ditolak database.' }); }
  };

  const verifyPayment = async (row: Registration) => {
    const result = await Swal.fire({ icon: 'question', title: 'Verifikasi pembayaran?', html: `<b>${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}</b><br>${rupiah(row.biaya_pendaftaran)}`, showCancelButton: true, confirmButtonText: 'Verifikasi', cancelButtonText: 'Batal', confirmButtonColor: '#2563eb' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('pendaftaran_turnamen').update({ status_pembayaran: 'Terverifikasi' }).eq('id', row.id);
      if (error) throw error;
      await load();
      Swal.fire({ icon: 'success', title: 'Pembayaran terverifikasi', timer: 1100, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memverifikasi pembayaran', text: e?.message || 'Perubahan ditolak database.' }); }
  };

  const deleteRow = async (row: Registration) => {
    const result = await Swal.fire({ icon: 'warning', title: 'Hapus pendaftaran?', html: `<b>${clean(row.nama_pemain_1)} & ${clean(row.nama_pemain_2)}</b><br><span style="opacity:.7">${clean(row.kode_pendaftaran)}</span><br><br>Data pendaftaran akan dihapus permanen.`, showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626' });
    if (!result.isConfirmed) return;
    try { const { error } = await supabase.from('pendaftaran_turnamen').delete().eq('id', row.id); if (error) throw error; await load(); Swal.fire({ icon: 'success', title: 'Pendaftaran dihapus', timer: 1000, showConfirmButton: false }); }
    catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: e?.message || 'Periksa relasi database dan hak akses admin.' }); }
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editing) return; setSaving(true);
    try {
      const payload = { kategori: editing.kategori, nama_pemain_1: editing.nama_pemain_1, nama_pemain_2: editing.nama_pemain_2, whatsapp: editing.whatsapp, email: editing.email || null, asal_pb: editing.asal_pb, domisili: editing.domisili };
      const { error } = await supabase.from('pendaftaran_turnamen').update(payload).eq('id', editing.id); if (error) throw error;
      setEditing(null); await load(); Swal.fire({ icon: 'success', title: 'Data peserta diperbarui', timer: 1100, showConfirmButton: false });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Periksa kolom database.' }); }
    finally { setSaving(false); }
  };

  const reset = () => { setQuery(''); setCategory('Semua'); setRegistrationStatus('Semua'); setPaymentStatus('Semua'); };
  const badge = (value: string, type: 'green'|'red'|'amber'|'blue'='blue') => <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase ${type === 'green' ? 'bg-emerald-500/15 text-emerald-300' : type === 'red' ? 'bg-rose-500/15 text-rose-300' : type === 'amber' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>{value}</span>;

  return <div className="min-h-full bg-[#050b17] p-3 text-white sm:p-5 md:p-8"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#07152d] via-[#0b1730] to-[#050914] p-5 shadow-2xl sm:p-7"><div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-amber-300"><Trophy size={13}/> Bilibili 162 Cup I 2026</div><h1 className="mt-3 text-2xl font-black italic uppercase tracking-tight sm:text-4xl">Pendaftaran Peserta Turnamen</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">Kelola seluruh pasangan yang mendaftar: pencarian, filter, detail dokumen, verifikasi pembayaran, verifikasi pendaftaran, edit, hapus, dan sinkronisasi realtime.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase hover:bg-white/10"><RefreshCw size={15}/> Muat Ulang</button></div></header>

    <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><Stat label="Total Peserta" value={stats.total} icon={<Users size={16}/>} /><Stat label="Menunggu" value={stats.pending} icon={<Clock3 size={16}/>} /><Stat label="Diterima" value={stats.accepted} icon={<CheckCircle2 size={16}/>} /><Stat label="Ditolak" value={stats.rejected} icon={<XCircle size={16}/>} /><Stat label="Pembayaran OK" value={stats.paid} icon={<CreditCard size={16}/>} /></section>

    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-xl sm:p-5"><div className="flex flex-col gap-2 lg:flex-row"><label className="relative min-w-0 flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari kode, nama pemain, PB/klub, WhatsApp, domisili..." className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-10 text-xs outline-none focus:border-blue-500 sm:text-sm"/></label><div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><Select value={category} onChange={setCategory} options={categories} label="Kategori"/><Select value={registrationStatus} onChange={setRegistrationStatus} options={['Semua','pending','diterima','ditolak']} label="Status Pendaftaran"/><Select value={paymentStatus} onChange={setPaymentStatus} options={['Semua','menunggu','terverifikasi']} label="Pembayaran"/></div><button onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] font-black uppercase text-slate-300 hover:text-white"><Filter size={15}/> Reset</button></div></section>

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="bg-slate-950/80 text-[9px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-4 py-3">No</th><th className="px-4 py-3">Peserta / Kode</th><th className="px-4 py-3">Kategori</th><th className="px-4 py-3">PB / Domisili</th><th className="px-4 py-3">Pembayaran</th><th className="px-4 py-3">Pendaftaran</th><th className="px-4 py-3">Tanggal</th><th className="px-4 py-3 text-right">Aksi</th></tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={8} className="px-4 py-14 text-center text-xs text-slate-500">Memuat data peserta...</td></tr> : visible.length === 0 ? <tr><td colSpan={8} className="px-4 py-14 text-center"><Users className="mx-auto mb-3 text-slate-600" size={30}/><p className="text-sm font-bold text-slate-400">Tidak ada pendaftaran ditemukan</p><p className="mt-1 text-[10px] text-slate-600">Coba ubah kata kunci atau filter.</p></td></tr> : visible.map((r,i) => { const rs=statusReg(r.status_pendaftaran); const ps=statusPay(r.status_pembayaran); return <tr key={String(r.id)} className="hover:bg-white/[.025]"><td className="px-4 py-4 text-xs text-slate-500">{(safePage-1)*pageSize+i+1}</td><td className="px-4 py-4"><div className="font-black text-sm text-white">{clean(r.nama_pemain_1) || '-'} <span className="text-slate-500">&</span> {clean(r.nama_pemain_2) || '-'}</div><div className="mt-1 font-mono text-[9px] text-amber-300">{clean(r.kode_pendaftaran) || `ID ${r.id}`}</div></td><td className="px-4 py-4 text-[10px] font-bold text-slate-300">{clean(r.kategori)||'-'}</td><td className="px-4 py-4"><div className="text-[10px] font-bold text-slate-300">{clean(r.asal_pb)||'-'}</div><div className="mt-1 text-[9px] text-slate-500">{clean(r.domisili)||'-'}</div></td><td className="px-4 py-4">{ps==='terverifikasi'?badge('Terverifikasi','green'):badge('Menunggu','amber')}</td><td className="px-4 py-4">{rs==='diterima'?badge('Diterima','green'):rs==='ditolak'?badge('Ditolak','red'):badge('Pending','amber')}</td><td className="whitespace-nowrap px-4 py-4 text-[9px] text-slate-500">{dateId(r.created_at)}</td><td className="px-4 py-4"><div className="flex justify-end gap-1.5"><button title="Detail" onClick={()=>setSelected(r)} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10"><Eye size={14}/></button><button title="Edit" onClick={()=>setEditing({...r})} className="rounded-lg border border-white/10 p-2 text-blue-300 hover:bg-blue-500/10"><Pencil size={14}/></button>{ps!=='terverifikasi'&&<button title="Verifikasi pembayaran" onClick={()=>void verifyPayment(r)} className="rounded-lg border border-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/10"><CreditCard size={14}/></button>}{rs==='pending'&&<><button title="Terima" onClick={()=>void updateStatus(r,'Diterima')} className="rounded-lg border border-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/10"><CheckCircle2 size={14}/></button><button title="Tolak" onClick={()=>void updateStatus(r,'Ditolak')} className="rounded-lg border border-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/10"><XCircle size={14}/></button></>}<button title="Hapus" onClick={()=>void deleteRow(r)} className="rounded-lg border border-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/10"><Trash2 size={14}/></button></div></td></tr> })}</tbody></table></div><div className="flex flex-col gap-2 border-t border-white/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-slate-500">Menampilkan {visible.length} dari {filtered.length} data hasil filter.</p><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] disabled:opacity-30">Sebelumnya</button><span className="text-[10px] font-bold text-slate-400">Halaman {safePage} / {totalPages}</span><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded-lg border border-white/10 px-3 py-2 text-[10px] disabled:opacity-30">Berikutnya</button></div></div></section>

    {selected && <Modal title="Detail Pendaftaran" onClose={()=>setSelected(null)}><div className="grid gap-4 sm:grid-cols-2">{[['Kode',selected.kode_pendaftaran],['Kategori',selected.kategori],['Pemain 1',selected.nama_pemain_1],['Pemain 2',selected.nama_pemain_2],['WhatsApp',selected.whatsapp],['Email',selected.email],['Asal PB/Klub',selected.asal_pb],['Domisili',selected.domisili],['NIK Pemain 1',selected.nik_pemain_1],['NIK Pemain 2',selected.nik_pemain_2],['Wilayah NIK P1',selected.wilayah_nik_pemain_1],['Wilayah NIK P2',selected.wilayah_nik_pemain_2],['Status NIK',selected.verifikasi_nik_status],['Tanggal Daftar',dateId(selected.created_at)]].map(([k,v])=><div key={k} className="rounded-xl border border-white/10 bg-white/[.03] p-3"><div className="text-[9px] font-black uppercase tracking-wider text-slate-500">{k}</div><div className="mt-1 break-words text-xs font-bold text-slate-200">{clean(v)||'-'}</div></div>)}</div><div className="mt-4 grid gap-2 sm:grid-cols-3">{selected.bukti_pembayaran_url&&<a href={selected.bukti_pembayaran_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-3 text-[10px] font-black uppercase">Bukti Pembayaran <ExternalLink size={13}/></a>}{selected.foto_pemain_1_url&&<a href={selected.foto_pemain_1_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-[10px] font-black uppercase">Foto Pemain 1 <ExternalLink size={13}/></a>}{selected.foto_pemain_2_url&&<a href={selected.foto_pemain_2_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-[10px] font-black uppercase">Foto Pemain 2 <ExternalLink size={13}/></a>}</div></Modal>}

    {editing && <Modal title="Edit Data Peserta" onClose={()=>{if(!saving)setEditing(null)}}><form onSubmit={saveEdit} className="space-y-4"><Field label="Kategori" value={editing.kategori} onChange={v=>setEditing({...editing,kategori:v})}/><div className="grid gap-3 sm:grid-cols-2"><Field label="Nama Pemain 1" value={editing.nama_pemain_1} onChange={v=>setEditing({...editing,nama_pemain_1:v})}/><Field label="Nama Pemain 2" value={editing.nama_pemain_2} onChange={v=>setEditing({...editing,nama_pemain_2:v})}/><Field label="WhatsApp" value={editing.whatsapp} onChange={v=>setEditing({...editing,whatsapp:v})}/><Field label="Email" value={editing.email||''} onChange={v=>setEditing({...editing,email:v})}/><Field label="Asal PB / Klub" value={editing.asal_pb} onChange={v=>setEditing({...editing,asal_pb:v})}/><Field label="Domisili" value={editing.domisili} onChange={v=>setEditing({...editing,domisili:v})}/></div><button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black uppercase disabled:opacity-50"><Save size={15}/>{saving?'Menyimpan...':'Simpan Perubahan'}</button></form></Modal>}
  </div></div>;
}

function Stat({label,value,icon}:{label:string,value:number,icon:React.ReactNode}) { return <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-lg sm:p-4"><div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500">{icon}{label}</div><div className="mt-1 text-2xl font-black text-white">{value}</div></div>; }
function Select({value,onChange,options,label}:{value:string,onChange:(v:string)=>void,options:string[],label:string}) { return <label className="block"><span className="mb-1 block text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</span><select value={value} onChange={e=>onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-[10px] text-white outline-none"><option value="Semua">Semua</option>{options.filter(x=>x!=='Semua').map(x=><option key={x} value={x}>{x}</option>)}</select></label>; }
function Field({label,value,onChange}:{label:string,value:any,onChange:(v:string)=>void}) { return <label className="block"><span className="mb-1.5 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span><input value={value||''} onChange={e=>onChange(e.target.value)} className="min-h-11 w-full rounded-xl border border-white/10 bg-slate-950 px-3 text-xs text-white outline-none focus:border-blue-500"/></label>; }
function Modal({title,onClose,children}:{title:string,onClose:()=>void,children:React.ReactNode}) { return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm"><div className="max-h-[90dvh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b1324] p-4 shadow-2xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-base font-black uppercase text-white sm:text-lg">{title}</h2><button type="button" onClick={onClose} className="rounded-xl border border-white/10 p-2 text-slate-400 hover:text-white"><X size={17}/></button></div>{children}</div></div>; }
