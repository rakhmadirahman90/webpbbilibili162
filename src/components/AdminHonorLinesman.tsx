import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Banknote, CheckCircle2, Clock3, Download, Edit3, FileSpreadsheet, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
import * as XLSX from 'xlsx';

type HonorRow = {
  id: string;
  tanggal_pertandingan: string;
  nama_linesman: string;
  pertandingan: string;
  lapangan: string | null;
  nominal_honor: number;
  status_pembayaran: 'Belum Dibayar' | 'Dibayar';
  tanggal_pembayaran: string | null;
  metode_pembayaran: string | null;
  keterangan: string | null;
  created_at: string;
};

const today = () => new Date().toISOString().slice(0, 10);
const rupiah = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(Number(n || 0))}`;
const emptyForm = () => ({ tanggal_pertandingan: today(), nama_linesman: '', pertandingan: '', lapangan: '', nominal_honor: 0, status_pembayaran: 'Belum Dibayar' as HonorRow['status_pembayaran'], tanggal_pembayaran: '', metode_pembayaran: 'Tunai', keterangan: '' });

export default function AdminHonorLinesman() {
  const [rows, setRows] = useState<HonorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('honor_linesman_payments').select('*').order('tanggal_pertandingan', { ascending: false }).order('nama_linesman', { ascending: true });
      if (error) throw error;
      setRows((data || []) as HonorRow[]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat pembayaran honor linesman', text: e?.message || 'Periksa koneksi database.', background: '#0F172A', color: '#fff' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase.channel('honor-linesman-live').on('postgres_changes', { event: '*', schema: 'public', table: 'honor_linesman_payments' }, () => void load()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => [r.nama_linesman, r.pertandingan, r.lapangan, r.status_pembayaran, r.metode_pembayaran, r.keterangan].map(v => String(v || '')).join(' ').toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => ({
    total: rows.reduce((s, r) => s + Number(r.nominal_honor || 0), 0),
    dibayar: rows.filter(r => r.status_pembayaran === 'Dibayar').reduce((s, r) => s + Number(r.nominal_honor || 0), 0),
    belum: rows.filter(r => r.status_pembayaran !== 'Dibayar').reduce((s, r) => s + Number(r.nominal_honor || 0), 0),
    orang: new Set(rows.map(r => r.nama_linesman.trim().toLowerCase()).filter(Boolean)).size
  }), [rows]);

  const openAdd = () => { setEditingId(null); setForm(emptyForm()); setShowForm(true); };
  const openEdit = (r: HonorRow) => { setEditingId(r.id); setForm({ tanggal_pertandingan: r.tanggal_pertandingan || today(), nama_linesman: r.nama_linesman || '', pertandingan: r.pertandingan || '', lapangan: r.lapangan || '', nominal_honor: Number(r.nominal_honor || 0), status_pembayaran: r.status_pembayaran, tanggal_pembayaran: r.tanggal_pembayaran || '', metode_pembayaran: r.metode_pembayaran || 'Tunai', keterangan: r.keterangan || '' }); setShowForm(true); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nama_linesman.trim() || !form.pertandingan.trim() || Number(form.nominal_honor) <= 0) {
      await Swal.fire({ icon: 'warning', title: 'Data belum lengkap', text: 'Nama linesman, pertandingan, dan nominal honor wajib diisi.', background: '#0F172A', color: '#fff' }); return;
    }
    setSaving(true);
    try {
      const payload = { ...form, nama_linesman: form.nama_linesman.trim(), pertandingan: form.pertandingan.trim(), lapangan: form.lapangan.trim() || null, nominal_honor: Number(form.nominal_honor), tanggal_pembayaran: form.status_pembayaran === 'Dibayar' ? (form.tanggal_pembayaran || today()) : null, metode_pembayaran: form.metode_pembayaran || null, keterangan: form.keterangan.trim() || null };
      const query = editingId ? supabase.from('honor_linesman_payments').update(payload).eq('id', editingId).select().single() : supabase.from('honor_linesman_payments').insert(payload).select().single();
      const { error } = await query; if (error) throw error;
      setShowForm(false); setEditingId(null); setForm(emptyForm()); await load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: editingId ? 'Pembayaran honor diperbarui' : 'Pembayaran honor berhasil ditambahkan', showConfirmButton: false, timer: 1800 });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' }); }
    finally { setSaving(false); }
  };

  const markPaid = async (r: HonorRow) => {
    try {
      const { error } = await supabase.from('honor_linesman_payments').update({ status_pembayaran: 'Dibayar', tanggal_pembayaran: today() }).eq('id', r.id);
      if (error) throw error; await load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Honor ${r.nama_linesman} ditandai sudah dibayar`, showConfirmButton: false, timer: 1800 });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memperbarui status', text: e?.message || 'Coba lagi.' }); }
  };

  const remove = async (r: HonorRow) => {
    const ok = await Swal.fire({ icon: 'warning', title: 'Hapus pembayaran honor?', html: `<b>${r.nama_linesman}</b><br>${r.pertandingan}<br>${rupiah(Number(r.nominal_honor))}`, showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!ok.isConfirmed) return;
    try { const { error } = await supabase.from('honor_linesman_payments').delete().eq('id', r.id); if (error) throw error; await load(); } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: e?.message || 'Coba lagi.' }); }
  };

  const exportExcel = () => {
    const data = filtered.map((r, i) => ({ NO: i + 1, 'TANGGAL PERTANDINGAN': r.tanggal_pertandingan, 'NAMA LINEsMAN': r.nama_linesman, PERTANDINGAN: r.pertandingan, LAPANGAN: r.lapangan || '-', 'HONOR (RP)': Number(r.nominal_honor || 0), STATUS: r.status_pembayaran, 'TANGGAL BAYAR': r.tanggal_pembayaran || '-', METODE: r.metode_pembayaran || '-', KETERANGAN: r.keterangan || '-' }));
    const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 28 }, { wch: 25 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 35 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'HONOR LINEsMAN'); XLSX.writeFile(wb, `HONOR LINEsMAN PB BILIBILI 162 ${today()}.xlsx`);
  };

  return <div className="w-full min-h-full p-3 sm:p-5 md:p-8 text-slate-200">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
      <div><div className="inline-flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2"><Banknote size={15}/> Administrasi Pertandingan</div><h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight">Pembayaran Honor Linesman</h1><p className="text-xs md:text-sm text-slate-400 mt-1">Kelola honor linesman pertandingan secara lengkap berdasarkan nama, pertandingan, nominal, dan status pembayaran.</p></div>
      <div className="flex gap-2"><button onClick={exportExcel} className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-black uppercase text-emerald-200"><FileSpreadsheet size={16}/> Export Excel</button><button onClick={openAdd} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase text-white shadow-lg"><Plus size={16}/> Tambah Honor</button></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {[['Total Honor', rupiah(stats.total), Banknote], ['Sudah Dibayar', rupiah(stats.dibayar), CheckCircle2], ['Belum Dibayar', rupiah(stats.belum), Clock3], ['Jumlah Linesman', String(stats.orang), Users]].map(([label, value, Icon]: any) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0b1224]/90 p-4 shadow-xl"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</span><Icon size={18} className="text-amber-300"/></div><div className="mt-2 text-lg sm:text-2xl font-black text-white">{value}</div></div>)}
    </div>
    <div className="rounded-2xl border border-white/10 bg-[#0b1224]/90 shadow-xl overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col sm:flex-row gap-2 justify-between"><div className="relative flex-1 max-w-xl"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama linesman, pertandingan, lapangan..." className="w-full rounded-xl border border-white/10 bg-[#070d1a] py-2.5 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500"/></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300"><RefreshCw size={15}/> Refresh</button></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="bg-white/5"><tr>{['NO','TANGGAL','NAMA LINEsMAN','PERTANDINGAN','LAPANGAN','HONOR','STATUS','TGL BAYAR','METODE','AKSI'].map(h => <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={10} className="py-12 text-center text-xs text-slate-500">Memuat data...</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="py-12 text-center text-xs text-slate-500">Belum ada data pembayaran honor linesman.</td></tr> : filtered.map((r, i) => <tr key={r.id} className="hover:bg-white/[0.03]"><td className="px-3 py-3 text-xs text-slate-500">{i + 1}</td><td className="px-3 py-3 text-xs">{r.tanggal_pertandingan}</td><td className="px-3 py-3 text-xs font-black text-white">{r.nama_linesman}</td><td className="px-3 py-3 text-xs">{r.pertandingan}</td><td className="px-3 py-3 text-xs">{r.lapangan || '-'}</td><td className="px-3 py-3 text-xs font-black text-amber-300">{rupiah(Number(r.nominal_honor))}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase ${r.status_pembayaran === 'Dibayar' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{r.status_pembayaran}</span></td><td className="px-3 py-3 text-xs">{r.tanggal_pembayaran || '-'}</td><td className="px-3 py-3 text-xs">{r.metode_pembayaran || '-'}</td><td className="px-3 py-3"><div className="flex gap-1.5">{r.status_pembayaran !== 'Dibayar' && <button title="Tandai dibayar" onClick={() => void markPaid(r)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300"><CheckCircle2 size={15}/></button>}<button title="Edit" onClick={() => openEdit(r)} className="p-2 rounded-lg bg-blue-500/10 text-blue-300"><Edit3 size={15}/></button><button title="Hapus" onClick={() => void remove(r)} className="p-2 rounded-lg bg-red-500/10 text-red-300"><Trash2 size={15}/></button></div></td></tr>)}</tbody></table></div>
    </div>
    {showForm && <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto"><div className="mx-auto mt-4 max-w-2xl rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl"><div className="flex items-center justify-between p-4 border-b border-white/10"><div><h2 className="text-base font-black text-white uppercase">{editingId ? 'Edit Pembayaran Honor' : 'Tambah Pembayaran Honor'}</h2><p className="text-[10px] text-slate-500 mt-1">Satu baris untuk satu linesman pada satu pertandingan.</p></div><button onClick={() => setShowForm(false)} className="p-2 rounded-lg bg-white/5 text-slate-400"><X size={18}/></button></div><form onSubmit={save} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {([['tanggal_pertandingan','Tanggal Pertandingan','date'],['nama_linesman','Nama Linesman','text'],['pertandingan','Pertandingan','text'],['lapangan','Lapangan','text'],['nominal_honor','Nominal Honor','number'],['tanggal_pembayaran','Tanggal Pembayaran','date']] as const).map(([key,label,type]) => <label key={key} className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><input type={type} value={String(form[key])} onChange={e => setForm(f => ({ ...f, [key]: type === 'number' ? Number(e.target.value) : e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" /></label>)}
      <label className="space-y-1"><span className="text-[10px] font-black uppercase text-slate-400">Status Pembayaran</span><select value={form.status_pembayaran} onChange={e => setForm(f => ({ ...f, status_pembayaran: e.target.value as HonorRow['status_pembayaran'], tanggal_pembayaran: e.target.value === 'Dibayar' ? (f.tanggal_pembayaran || today()) : '' }))} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-2.5 text-sm text-white"><option>Belum Dibayar</option><option>Dibayar</option></select></label>
      <label className="space-y-1"><span className="text-[10px] font-black uppercase text-slate-400">Metode Pembayaran</span><select value={form.metode_pembayaran} onChange={e => setForm(f => ({ ...f, metode_pembayaran: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-2.5 text-sm text-white"><option>Tunai</option><option>Transfer</option><option>QRIS</option><option>Lainnya</option></select></label>
      <label className="sm:col-span-2 space-y-1"><span className="text-[10px] font-black uppercase text-slate-400">Keterangan</span><textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} rows={3} placeholder="Contoh: Honor linesman pertandingan babak penyisihan" className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"/></label>
      <div className="sm:col-span-2 flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-black uppercase text-slate-300">Batal</button><button disabled={saving} type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</button></div>
    </form></div></div>}
  </div>;
}
