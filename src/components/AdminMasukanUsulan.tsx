import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Archive, CheckCircle2, Clock3, ExternalLink, FileText, Filter, Loader2, Mail, MessageSquareText, RefreshCw, Search, Send, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

const STATUS = ['Semua', 'Baru', 'Diproses', 'Diterima', 'Ditolak', 'Selesai'];

type Item = {
  id: string; nama: string; organisasi?: string | null; whatsapp?: string | null; email?: string | null;
  jenis: string; perihal: string; isi: string; lampiran_url?: string | null; lampiran_nama?: string | null;
  lampiran_type?: string | null; lampiran_size?: number | null; status: string; catatan_admin?: string | null;
  arsip_surat_id?: string | null; created_at: string; updated_at: string;
};

const fmtDate = (v: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));
const bytes = (n?: number | null) => !n ? '' : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;

export default function AdminMasukanUsulan() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Semua');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('masukan_usulan_tamu').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data || []) as Item[]);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal memuat masukan', text: e?.message || 'Database tidak dapat diakses.', background: '#0f172a', color: '#fff' });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase.channel('admin-masukan-usulan').on('postgres_changes', { event: '*', schema: 'public', table: 'masukan_usulan_tamu' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const filtered = useMemo(() => items.filter(item => {
    const q = query.trim().toLowerCase();
    const matchStatus = status === 'Semua' || item.status === status;
    const matchQuery = !q || [item.nama, item.organisasi, item.jenis, item.perihal, item.isi].some(v => String(v || '').toLowerCase().includes(q));
    return matchStatus && matchQuery;
  }), [items, status, query]);

  const updateItem = async (item: Item, patch: Partial<Item>) => {
    setSaving(true);
    try {
      const { data, error } = await supabase.from('masukan_usulan_tamu').update(patch).eq('id', item.id).select('*').single();
      if (error) throw error;
      setItems(prev => prev.map(x => x.id === item.id ? data as Item : x));
      setSelected(data as Item);
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: e?.message || 'Perubahan tidak tersimpan.', background: '#0f172a', color: '#fff' });
    } finally { setSaving(false); }
  };

  const archiveAsIncomingLetter = async (item: Item) => {
    if (item.arsip_surat_id) {
      Swal.fire({ icon: 'info', title: 'Sudah terhubung', text: 'Masukan ini sudah terhubung dengan arsip surat.', background: '#0f172a', color: '#fff' });
      return;
    }
    const confirm = await Swal.fire({ icon: 'question', title: 'Arsipkan ke Kelola Surat?', text: 'Data pengajuan akan dibuat sebagai surat masuk di arsip_surat dan tetap ditautkan ke masukan ini.', showCancelButton: true, confirmButtonText: 'Ya, Arsipkan', cancelButtonText: 'Batal', background: '#0f172a', color: '#fff' });
    if (!confirm.isConfirmed) return;
    setSaving(true);
    try {
      const date = new Date(item.created_at);
      const nomor = `MASUK/${date.getFullYear()}/${item.id.slice(0, 8).toUpperCase()}`;
      const { data: surat, error: suratError } = await supabase.from('arsip_surat').insert({
        nomor_surat: nomor,
        jenis_surat: 'MASUK',
        perihal: item.perihal,
        tujuan_instansi: 'PB Bilibili 162',
        tujuan_yth: item.nama,
        jabatan_tujuan: item.organisasi || 'Tamu / Pengusul',
        isi_surat: item.isi,
        tanggal_surat: date.toISOString().slice(0, 10),
        file_lampiran: item.lampiran_url || null,
        source_file_url: item.lampiran_url || null,
        source_file_name: item.lampiran_nama || null,
        source_file_type: item.lampiran_type || null,
        source_file_size: item.lampiran_size || null,
        status: 'Masuk'
      }).select('id').single();
      if (suratError) throw suratError;
      const { data: updated, error: updateError } = await supabase.from('masukan_usulan_tamu').update({ arsip_surat_id: surat.id, status: 'Diproses' }).eq('id', item.id).select('*').single();
      if (updateError) throw updateError;
      setItems(prev => prev.map(x => x.id === item.id ? updated as Item : x));
      setSelected(updated as Item);
      Swal.fire({ icon: 'success', title: 'Berhasil diarsipkan', text: 'Masukan sekarang terhubung dengan Kelola Surat sebagai surat masuk.', background: '#0f172a', color: '#fff', timer: 1800, showConfirmButton: false });
    } catch (e: any) {
      Swal.fire({ icon: 'error', title: 'Gagal mengarsipkan', text: e?.message || 'Silakan coba kembali.', background: '#0f172a', color: '#fff' });
    } finally { setSaving(false); }
  };

  const remove = async (item: Item) => {
    const confirm = await Swal.fire({ icon: 'warning', title: 'Hapus masukan?', text: 'Data pengajuan akan dihapus dari inbox.', showCancelButton: true, confirmButtonText: 'Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#dc2626', background: '#0f172a', color: '#fff' });
    if (!confirm.isConfirmed) return;
    const { error } = await supabase.from('masukan_usulan_tamu').delete().eq('id', item.id);
    if (error) return Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error.message, background: '#0f172a', color: '#fff' });
    setItems(prev => prev.filter(x => x.id !== item.id));
    setSelected(null);
  };

  return (
    <div className="min-h-full bg-[#070d1a] text-white p-3 sm:p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        <header className="rounded-2xl md:rounded-3xl border border-white/10 bg-gradient-to-r from-slate-900 to-[#0b1224] p-4 sm:p-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center"><MessageSquareText className="text-blue-400" size={22}/></div>
              <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-blue-400">Inbox Publik</p><h1 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase">Masukan, Saran & Usulan</h1><p className="text-[10px] sm:text-xs text-slate-400 mt-1">Kelola masukan tamu serta usulan Mabar/Sparing dan hubungkan lampiran ke Kelola Surat.</p></div>
            </div>
            <button onClick={load} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-black uppercase"><RefreshCw size={14}/> Refresh</button>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {['Baru', 'Diproses', 'Diterima', 'Selesai'].map(s => <button key={s} onClick={() => setStatus(s)} className={`rounded-xl border p-3 text-left ${status === s ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 bg-slate-900/60'}`}><div className="text-[9px] font-black uppercase text-slate-400">{s}</div><div className="text-xl font-black mt-1">{items.filter(x => x.status === s).length}</div></button>)}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0b1224]/90 p-3 sm:p-4 flex flex-col md:flex-row gap-2">
          <div className="relative flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari nama, klub, jenis, perihal..." className="w-full bg-slate-950/60 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white outline-none focus:border-blue-500"/></div>
          <div className="flex items-center gap-2"><Filter size={14} className="text-slate-500"/><select value={status} onChange={e => setStatus(e.target.value)} className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white outline-none">{STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
        </div>

        <div className="space-y-2">
          {loading ? <div className="py-16 text-center"><Loader2 className="animate-spin mx-auto text-blue-400" size={30}/><p className="text-xs text-slate-500 mt-3">Memuat inbox...</p></div> : filtered.length === 0 ? <div className="py-16 text-center rounded-2xl border border-dashed border-white/10 bg-slate-900/30"><Mail className="mx-auto text-slate-600" size={34}/><p className="text-sm font-bold text-slate-400 mt-3">Belum ada masukan sesuai filter.</p></div> : filtered.map(item => (
            <button key={item.id} onClick={() => { setSelected(item); setNote(item.catatan_admin || ''); }} className="w-full text-left rounded-2xl border border-white/10 bg-[#0b1224]/90 hover:border-blue-500/30 p-3 sm:p-4 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0"><MessageSquareText size={18} className="text-blue-400"/></div>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-black uppercase tracking-wider text-blue-400">{item.jenis}</span><span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{item.status}</span>{item.arsip_surat_id && <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">Terhubung Surat</span>}</div><h3 className="text-sm sm:text-base font-black text-white mt-1 truncate">{item.perihal}</h3><p className="text-[10px] text-slate-400 mt-0.5">{item.nama}{item.organisasi ? ` • ${item.organisasi}` : ''} • {fmtDate(item.created_at)}</p></div>
                {item.lampiran_url && <FileText size={17} className="text-amber-400 shrink-0"/>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selected && <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm p-2 sm:p-4 flex items-end sm:items-center justify-center" onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="w-full max-w-3xl max-h-[94dvh] overflow-y-auto rounded-2xl md:rounded-3xl border border-white/10 bg-[#0b1224] shadow-2xl p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-widest text-blue-400">{selected.jenis} • {selected.status}</p><h2 className="text-lg sm:text-2xl font-black text-white mt-1">{selected.perihal}</h2></div><button onClick={() => setSelected(null)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700"><X size={18}/></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5"><div className="rounded-xl bg-slate-950/60 border border-white/5 p-3"><b className="text-[9px] uppercase text-slate-500">Pengusul</b><p className="text-sm text-white font-bold mt-1">{selected.nama}</p><p className="text-[10px] text-slate-400">{selected.organisasi || 'Tamu / umum'}</p></div><div className="rounded-xl bg-slate-950/60 border border-white/5 p-3"><b className="text-[9px] uppercase text-slate-500">Kontak</b><p className="text-xs text-slate-300 mt-1">{selected.whatsapp || '-'}{selected.email ? ` • ${selected.email}` : ''}</p></div></div>
          <div className="mt-4 rounded-xl bg-slate-950/60 border border-white/5 p-4"><b className="text-[9px] uppercase text-slate-500">Isi Masukan / Usulan</b><p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed mt-2">{selected.isi}</p></div>
          {selected.lampiran_url && <a href={selected.lampiran_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 hover:bg-amber-500/10"><span className="flex items-center gap-2 min-w-0"><FileText size={17} className="text-amber-400 shrink-0"/><span className="truncate text-xs font-bold text-slate-200">{selected.lampiran_nama || 'Lampiran surat'} <small className="text-slate-500">{bytes(selected.lampiran_size)}</small></span></span><ExternalLink size={15} className="text-amber-400 shrink-0"/></a>}
          <div className="mt-4"><label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Catatan Admin</label><textarea value={note} onChange={e => setNote(e.target.value)} rows={3} className="mt-1 w-full rounded-xl bg-slate-950/60 border border-white/10 p-3 text-xs text-white outline-none focus:border-blue-500" placeholder="Catatan tindak lanjut..."/></div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2"><button disabled={saving} onClick={() => updateItem(selected, { status: 'Diproses', catatan_admin: note })} className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-[10px] font-black uppercase">Proses</button><button disabled={saving} onClick={() => updateItem(selected, { status: 'Diterima', catatan_admin: note })} className="px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[10px] font-black uppercase">Terima</button><button disabled={saving} onClick={() => updateItem(selected, { status: 'Ditolak', catatan_admin: note })} className="px-3 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-[10px] font-black uppercase">Tolak</button><button disabled={saving} onClick={() => updateItem(selected, { status: 'Selesai', catatan_admin: note })} className="px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-[10px] font-black uppercase">Selesai</button></div>
          <div className="mt-3 flex flex-col sm:flex-row gap-2"><button disabled={saving || !!selected.arsip_surat_id} onClick={() => archiveAsIncomingLetter(selected)} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-[10px] font-black uppercase"><Archive size={14}/> {selected.arsip_surat_id ? 'Sudah di Kelola Surat' : 'Arsipkan ke Kelola Surat'}</button>{selected.whatsapp && <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-[10px] font-black uppercase"><Send size={14}/> Hubungi WhatsApp</a>}<button onClick={() => remove(selected)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 border border-rose-500/20 text-rose-300 text-[10px] font-black uppercase"><Trash2 size={14}/> Hapus</button></div>
          {selected.arsip_surat_id && <p className="mt-3 text-[9px] text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Tertaut ke arsip surat: {selected.arsip_surat_id}</p>}
        </div>
      </div>}
    </div>
  );
}
