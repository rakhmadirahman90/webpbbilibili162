import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { Banknote, CheckCircle2, Clock3, Edit3, FileSpreadsheet, Plus, RefreshCw, Search, Trash2, Users, X } from 'lucide-react';
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

type Linesman = { id: string; nama: string; ukuran_baju?: string | null; aktif?: boolean | null };

const today = () => new Date().toISOString().slice(0, 10);
const rupiah = (n: number) => `Rp ${new Intl.NumberFormat('id-ID').format(Number(n || 0))}`;
const emptyForm = () => ({ tanggal_pertandingan: today(), nama_linesman: '', pertandingan: 'BELUM DITENTUKAN', lapangan: '', nominal_honor: 0, status_pembayaran: 'Belum Dibayar' as HonorRow['status_pembayaran'], tanggal_pembayaran: '', metode_pembayaran: 'Tunai', keterangan: '' });

export default function AdminHonorLinesman() {
  const [rows, setRows] = useState<HonorRow[]>([]);
  const [linesmen, setLinesmen] = useState<Linesman[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [paymentsResult, linesmanResult] = await Promise.all([
        supabase.from('honor_linesman_payments').select('*').order('tanggal_pertandingan', { ascending: false }).order('nama_linesman', { ascending: true }),
        supabase.from('linesman').select('id,nama,ukuran_baju,aktif').eq('aktif', true).order('nama', { ascending: true })
      ]);
      if (paymentsResult.error) throw paymentsResult.error;
      if (linesmanResult.error) throw linesmanResult.error;
      const payments = (paymentsResult.data || []) as HonorRow[];
      const roster = (linesmanResult.data || []) as Linesman[];
      setLinesmen(roster);

      // The payment table is the source of truth. If it is temporarily empty in the browser,
      // still show the active linesman roster so the admin can immediately manage their honor.
      if (payments.length) {
        setRows(payments);
      } else {
        setRows(roster.map((person, index) => ({
          id: `roster-${person.id}`,
          tanggal_pertandingan: today(),
          nama_linesman: String(person.nama || '').toUpperCase(),
          pertandingan: 'BELUM DITENTUKAN',
          lapangan: null,
          nominal_honor: 0,
          status_pembayaran: 'Belum Dibayar',
          tanggal_pembayaran: null,
          metode_pembayaran: 'Tunai',
          keterangan: 'Linesman aktif; pembayaran honor belum diisi.',
          created_at: new Date(Date.now() + index).toISOString()
        })));
      }
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat data linesman', text: e?.message || 'Periksa koneksi database.', background: '#0F172A', color: '#fff' });
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
      const payload = { ...form, nama_linesman: form.nama_linesman.trim().toUpperCase(), pertandingan: form.pertandingan.trim().toUpperCase(), lapangan: form.lapangan.trim() || null, nominal_honor: Number(form.nominal_honor), tanggal_pembayaran: form.status_pembayaran === 'Dibayar' ? (form.tanggal_pembayaran || today()) : null, metode_pembayaran: form.metode_pembayaran || null, keterangan: form.keterangan.trim() || null };
      const isRosterPlaceholder = Boolean(editingId?.startsWith('roster-'));
      const query = editingId && !isRosterPlaceholder ? supabase.from('honor_linesman_payments').update(payload).eq('id', editingId).select().single() : supabase.from('honor_linesman_payments').insert(payload).select().single();
      const { error } = await query; if (error) throw error;
      setShowForm(false); const wasEditing = Boolean(editingId); setEditingId(null); setForm(emptyForm()); await load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: wasEditing ? 'Pembayaran honor diperbarui' : 'Pembayaran honor berhasil ditambahkan', showConfirmButton: false, timer: 1800 });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Perubahan ditolak database.', background: '#0F172A', color: '#fff' }); }
    finally { setSaving(false); }
  };

  const markPaid = async (r: HonorRow) => {
    try {
      if (r.id.startsWith('roster-')) {
        const { error } = await supabase.from('honor_linesman_payments').insert({ tanggal_pertandingan: today(), nama_linesman: r.nama_linesman.toUpperCase(), pertandingan: 'BELUM DITENTUKAN', nominal_honor: 0, status_pembayaran: 'Dibayar', tanggal_pembayaran: today(), metode_pembayaran: 'Tunai', keterangan: 'Pembayaran honor linesman' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('honor_linesman_payments').update({ status_pembayaran: 'Dibayar', tanggal_pembayaran: today() }).eq('id', r.id);
        if (error) throw error;
      }
      await load();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: `Honor ${r.nama_linesman} ditandai sudah dibayar`, showConfirmButton: false, timer: 1800 });
    } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal memperbarui status', text: e?.message || 'Coba lagi.' }); }
  };

  const remove = async (r: HonorRow) => {
    if (r.id.startsWith('roster-')) return;
    const ok = await Swal.fire({ icon: 'warning', title: 'Hapus pembayaran honor?', html: `<b>${r.nama_linesman}</b><br>${r.pertandingan}<br>${rupiah(Number(r.nominal_honor))}`, showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151', confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!ok.isConfirmed) return;
    try { const { error } = await supabase.from('honor_linesman_payments').delete().eq('id', r.id); if (error) throw error; await load(); } catch (e: any) { Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: e?.message || 'Coba lagi.' }); }
  };

  const exportExcel = () => {
    const data = filtered.map((r, i) => ({ NO: i + 1, 'TANGGAL PERTANDINGAN': r.tanggal_pertandingan, 'NAMA LINEsMAN': r.nama_linesman.toUpperCase(), PERTANDINGAN: r.pertandingan, LAPANGAN: r.lapangan || '-', 'HONOR (RP)': Number(r.nominal_honor || 0), STATUS: r.status_pembayaran, 'TANGGAL BAYAR': r.tanggal_pembayaran || '-', METODE: r.metode_pembayaran || '-', KETERANGAN: r.keterangan || '-' }));
    const ws = XLSX.utils.json_to_sheet(data); ws['!cols'] = [{ wch: 5 }, { wch: 20 }, { wch: 30 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 40 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'HONOR LINEsMAN'); XLSX.writeFile(wb, `HONOR LINEsMAN PB BILIBILI 162 ${today()}.xlsx`);
  };

  return <div className="w-full min-h-full p-3 sm:p-5 md:p-8 text-slate-200">
    <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-5">
      <div className="min-w-0"><div className="inline-flex items-center gap-2 text-amber-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2"><Banknote size={15}/> Administrasi Pertandingan</div><h1 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tight leading-tight">Pembayaran Honor Linesman</h1><p className="text-xs md:text-sm text-slate-400 mt-1 max-w-4xl">Daftar seluruh linesman aktif dan pembayaran honor per pertandingan.</p></div>
      <div className="grid grid-cols-2 sm:flex gap-2 w-full xl:w-auto"><button onClick={exportExcel} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase text-emerald-200"><FileSpreadsheet size={16}/> Export Excel</button><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white shadow-lg"><Plus size={16}/> Tambah Honor</button></div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">{[['Total Honor', rupiah(stats.total), Banknote], ['Sudah Dibayar', rupiah(stats.dibayar), CheckCircle2], ['Belum Dibayar', rupiah(stats.belum), Clock3], ['Jumlah Linesman', String(stats.orang), Users]].map(([label, value, Icon]: any) => <div key={String(label)} className="rounded-2xl border border-white/10 bg-[#0b1224]/90 p-3 sm:p-4 shadow-xl min-w-0"><div className="flex items-center justify-between gap-2"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 truncate">{label}</span><Icon size={18} className="text-amber-300 shrink-0"/></div><div className="mt-2 text-base sm:text-2xl font-black text-white truncate">{value}</div></div>)}</div>
    <div className="rounded-2xl border border-white/10 bg-[#0b1224]/90 shadow-xl overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-white/10 flex flex-col md:flex-row gap-2 justify-between"><div className="relative flex-1 min-w-0"><Search size={16} className="absolute left-3 top-3 text-slate-500"/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama linesman, pertandingan, lapangan..." className="w-full rounded-xl border border-white/10 bg-[#070d1a] py-3 pl-9 pr-3 text-xs text-white outline-none focus:border-blue-500"/></div><button onClick={() => void load()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-slate-300 shrink-0"><RefreshCw size={15}/> Refresh</button></div>
      <div className="hidden md:block overflow-x-auto"><table className="w-full min-w-[1050px] text-left"><thead className="bg-white/5"><tr>{['NO','TANGGAL','NAMA LINEsMAN','PERTANDINGAN','LAPANGAN','HONOR','STATUS','TGL BAYAR','METODE','AKSI'].map(h => <th key={h} className="px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-400">{h}</th>)}</tr></thead><tbody className="divide-y divide-white/5">{loading ? <tr><td colSpan={10} className="py-12 text-center text-xs text-slate-500">Memuat daftar linesman...</td></tr> : filtered.length === 0 ? <tr><td colSpan={10} className="py-12 text-center text-xs text-slate-500">Belum ada data pembayaran honor linesman.</td></tr> : filtered.map((r, i) => <tr key={r.id} className="hover:bg-white/[0.03]"><td className="px-3 py-3 text-xs text-slate-500">{i + 1}</td><td className="px-3 py-3 text-xs whitespace-nowrap">{r.tanggal_pertandingan}</td><td className="px-3 py-3 text-xs font-black text-white whitespace-nowrap">{r.nama_linesman.toUpperCase()}</td><td className="px-3 py-3 text-xs max-w-[220px] break-words">{r.pertandingan}</td><td className="px-3 py-3 text-xs">{r.lapangan || '-'}</td><td className="px-3 py-3 text-xs font-black text-amber-300 whitespace-nowrap">{rupiah(Number(r.nominal_honor))}</td><td className="px-3 py-3"><span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-black uppercase whitespace-nowrap ${r.status_pembayaran === 'Dibayar' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{r.status_pembayaran}</span></td><td className="px-3 py-3 text-xs whitespace-nowrap">{r.tanggal_pembayaran || '-'}</td><td className="px-3 py-3 text-xs">{r.metode_pembayaran || '-'}</td><td className="px-3 py-3"><div className="flex gap-1.5">{r.status_pembayaran !== 'Dibayar' && <button title="Tandai dibayar" onClick={() => void markPaid(r)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300"><CheckCircle2 size={15}/></button>}<button title="Edit" onClick={() => openEdit(r)} className="p-2 rounded-lg bg-blue-500/10 text-blue-300"><Edit3 size={15}/></button>{!r.id.startsWith('roster-') && <button title="Hapus" onClick={() => void remove(r)} className="p-2 rounded-lg bg-red-500/10 text-red-300"><Trash2 size={15}/></button>}</div></td></tr>)}</tbody></table></div>
      <div className="md:hidden p-3 space-y-3">{loading ? <div className="py-12 text-center text-xs text-slate-500">Memuat daftar linesman...</div> : filtered.length === 0 ? <div className="py-12 text-center text-xs text-slate-500">Belum ada data pembayaran honor linesman.</div> : filtered.map((r, i) => <div key={r.id} className="rounded-2xl border border-white/10 bg-[#070d1a] p-3.5 shadow-lg"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="text-[9px] font-black text-slate-500">#{i + 1} • {r.tanggal_pertandingan}</div><div className="mt-1 text-sm font-black text-white uppercase break-words">{r.nama_linesman}</div><div className="mt-1 text-[11px] text-slate-400 break-words">{r.pertandingan}</div></div><span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase ${r.status_pembayaran === 'Dibayar' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-amber-500/10 text-amber-300'}`}>{r.status_pembayaran}</span></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><div className="rounded-xl bg-white/[0.03] p-2"><span className="block text-slate-500 uppercase font-bold">Lapangan</span><b className="text-slate-200">{r.lapangan || '-'}</b></div><div className="rounded-xl bg-white/[0.03] p-2"><span className="block text-slate-500 uppercase font-bold">Honor</span><b className="text-amber-300">{rupiah(Number(r.nominal_honor))}</b></div><div className="rounded-xl bg-white/[0.03] p-2"><span className="block text-slate-500 uppercase font-bold">Tanggal Bayar</span><b className="text-slate-200">{r.tanggal_pembayaran || '-'}</b></div><div className="rounded-xl bg-white/[0.03] p-2"><span className="block text-slate-500 uppercase font-bold">Metode</span><b className="text-slate-200">{r.metode_pembayaran || '-'}</b></div></div><div className="mt-3 flex gap-2">{r.status_pembayaran !== 'Dibayar' && <button onClick={() => void markPaid(r)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-[10px] font-black uppercase text-emerald-300"><CheckCircle2 size={15}/> Bayar</button>}<button onClick={() => openEdit(r)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-500/10 px-3 py-2.5 text-[10px] font-black uppercase text-blue-300"><Edit3 size={15}/> Edit</button>{!r.id.startsWith('roster-') && <button onClick={() => void remove(r)} className="inline-flex items-center justify-center rounded-xl bg-red-500/10 px-3 py-2.5 text-red-300"><Trash2 size={15}/></button>}</div></div>)}</div>
    </div>
    {showForm && <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm p-2 sm:p-4 md:p-6 overflow-y-auto"><div className="mx-auto my-2 sm:my-6 w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b1224] shadow-2xl overflow-hidden"><div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-white/10"><div className="min-w-0"><h2 className="text-base sm:text-lg font-black text-white uppercase leading-tight">{editingId ? 'Edit Pembayaran Honor' : 'Tambah Pembayaran Honor'}</h2><p className="text-[10px] sm:text-xs text-slate-500 mt-1">Satu baris untuk satu linesman pada satu pertandingan.</p></div><button onClick={() => setShowForm(false)} className="p-2.5 rounded-xl bg-white/5 text-slate-400 shrink-0"><X size={18}/></button></div><form onSubmit={save} className="p-3 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tanggal Pertandingan</span><input type="date" value={form.tanggal_pertandingan} onChange={e => setForm(f => ({ ...f, tanggal_pertandingan: e.target.value }))} className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nama Linesman</span><select value={form.nama_linesman} onChange={e => setForm(f => ({ ...f, nama_linesman: e.target.value.toUpperCase() }))} className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500"><option value="">Pilih nama linesman...</option>{linesmen.map(person => <option key={person.id} value={person.nama.toUpperCase()}>{person.nama.toUpperCase()}{person.ukuran_baju ? ` • ${person.ukuran_baju}` : ''}</option>)}{form.nama_linesman && !linesmen.some(p => p.nama.toUpperCase() === form.nama_linesman.toUpperCase()) && <option value={form.nama_linesman}>{form.nama_linesman}</option>}</select></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Pertandingan</span><input value={form.pertandingan} onChange={e => setForm(f => ({ ...f, pertandingan: e.target.value }))} placeholder="Contoh: GANDA PUTRA A vs B" className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Lapangan</span><input value={form.lapangan} onChange={e => setForm(f => ({ ...f, lapangan: e.target.value }))} placeholder="Contoh: LAPANGAN 1" className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Nominal Honor</span><input type="number" min="1" value={form.nominal_honor || ''} onChange={e => setForm(f => ({ ...f, nominal_honor: Number(e.target.value) }))} placeholder="Masukkan nominal" className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tanggal Pembayaran</span><input type="date" value={form.tanggal_pembayaran} onChange={e => setForm(f => ({ ...f, tanggal_pembayaran: e.target.value }))} className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white outline-none focus:border-blue-500" /></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase text-slate-400">Status Pembayaran</span><select value={form.status_pembayaran} onChange={e => setForm(f => ({ ...f, status_pembayaran: e.target.value as HonorRow['status_pembayaran'], tanggal_pembayaran: e.target.value === 'Dibayar' ? (f.tanggal_pembayaran || today()) : '' }))} className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white"><option>Belum Dibayar</option><option>Dibayar</option></select></label>
      <label className="space-y-1.5"><span className="text-[10px] font-black uppercase text-slate-400">Metode Pembayaran</span><select value={form.metode_pembayaran} onChange={e => setForm(f => ({ ...f, metode_pembayaran: e.target.value }))} className="w-full min-h-11 rounded-xl border border-white/10 bg-[#070d1a] px-3 text-sm text-white"><option>Tunai</option><option>Transfer</option><option>QRIS</option><option>Lainnya</option></select></label>
      <label className="md:col-span-2 space-y-1.5"><span className="text-[10px] font-black uppercase text-slate-400">Keterangan</span><textarea value={form.keterangan} onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))} rows={3} placeholder="Contoh: Honor linesman pertandingan babak penyisihan" className="w-full rounded-xl border border-white/10 bg-[#070d1a] px-3 py-3 text-sm text-white outline-none focus:border-blue-500 resize-y"/></label>
      <div className="md:col-span-2 grid grid-cols-2 gap-2 pt-1"><button type="button" onClick={() => setShowForm(false)} className="min-h-11 rounded-xl border border-white/10 px-4 py-3 text-xs font-black uppercase text-slate-300">Batal</button><button disabled={saving} type="submit" className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-xs font-black uppercase text-white disabled:opacity-50">{saving ? 'Menyimpan...' : 'Simpan Pembayaran'}</button></div>
    </form></div></div>}
  </div>;
}
