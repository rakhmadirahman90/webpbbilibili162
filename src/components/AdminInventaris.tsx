import React, { useEffect, useState } from 'react';
import { PackageOpen, Plus, Edit, Trash2, Box, Upload, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';
import InventoryImage from './InventoryImage';

interface Item { id: string; nama: string; kategori: string; jumlah_total: number; jumlah_baik: number; jumlah_rusak: number; keterangan: string; gambar?: string | null; created_at?: string; updated_at?: string; }
type FormData = { nama: string; kategori: string; jumlah_baik: number; jumlah_rusak: number; keterangan: string; gambar: string; };
const emptyForm: FormData = { nama: '', kategori: 'Perlengkapan Latihan', jumlah_baik: 1, jumlah_rusak: 0, keterangan: '', gambar: '' };
const INVENTORY_IMAGE_BUCKET = 'uploads';

export default function AdminInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<FormData>({ ...emptyForm });
  const [gambarFile, setGambarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const { data, error } = await supabase.from('inventaris').select('*').order('kategori', { ascending: true }).order('nama', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as Item[];
      setItems(rows);
      localStorage.setItem('inventaris_local_v5', JSON.stringify(rows));
    } catch (error) {
      console.error('Gagal mengambil inventaris dari Supabase:', error);
      try {
        const cached = JSON.parse(localStorage.getItem('inventaris_local_v5') || localStorage.getItem('inventaris_local_v4') || localStorage.getItem('inventaris_local_v3') || '[]');
        setItems(Array.isArray(cached) ? cached : []);
      } catch { setItems([]); }
    } finally { setLoading(false); }
  };

  useEffect(() => {
    void fetchItems();
    const channel = supabase.channel('inventaris-admin-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'inventaris' }, () => void fetchItems()).subscribe();
    const refresh = () => void fetchItems();
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm });
    setGambarFile(null);
    setShowModal(true);
  };

  const openEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({ nama: item.nama, kategori: item.kategori, jumlah_baik: item.jumlah_baik, jumlah_rusak: item.jumlah_rusak, keterangan: item.keterangan || '', gambar: item.gambar || '' });
    setGambarFile(null);
    setShowModal(true);
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      void Swal.fire({ icon: 'error', title: 'File bukan gambar', text: 'Silakan pilih foto JPG, PNG, WEBP, atau format gambar lainnya.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      void Swal.fire({ icon: 'error', title: 'File terlalu besar', text: 'Ukuran foto maksimal 5MB.' });
      return;
    }
    setGambarFile(file);
    setFormData(prev => ({ ...prev, gambar: URL.createObjectURL(file) }));
  };

  const uploadInventoryImage = async (file: File, itemId: string) => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    const path = `inventaris/${itemId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(INVENTORY_IMAGE_BUCKET).upload(path, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from(INVENTORY_IMAGE_BUCKET).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('URL foto inventaris tidak berhasil dibuat.');
    return data.publicUrl;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nama = formData.nama.trim();
    const baik = Math.max(0, Number(formData.jumlah_baik) || 0);
    const rusak = Math.max(0, Number(formData.jumlah_rusak) || 0);
    if (!nama) {
      void Swal.fire({ icon: 'warning', title: 'Nama barang wajib diisi' });
      return;
    }

    setSaving(true);
    try {
      let itemId = editingItem?.id || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let imageUrl = formData.gambar || null;

      // IMPORTANT: never save a local data/blob URL into PostgreSQL.
      // Upload the selected File to Supabase Storage first, then save its public URL.
      if (gambarFile) {
        imageUrl = await uploadInventoryImage(gambarFile, itemId);
      } else if (imageUrl && (/^(blob:|data:)/i.test(imageUrl))) {
        imageUrl = editingItem?.gambar || null;
      }

      const payload = {
        nama,
        kategori: formData.kategori || 'Perlengkapan Latihan',
        jumlah_baik: baik,
        jumlah_rusak: rusak,
        jumlah_total: baik + rusak,
        keterangan: formData.keterangan.trim(),
        gambar: imageUrl,
      };

      if (editingItem) {
        const { error } = await supabase.from('inventaris').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('inventaris').insert({ id: itemId, ...payload });
        if (error) throw error;
      }

      setShowModal(false);
      setGambarFile(null);
      setFormData({ ...emptyForm });
      await fetchItems();
      void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: editingItem ? 'Inventaris diperbarui' : 'Inventaris ditambahkan', showConfirmButton: false, timer: 1600 });
    } catch (error: any) {
      console.error('Gagal menyimpan inventaris:', error);
      void Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: error?.message || 'Foto/data tidak dapat disimpan ke Supabase.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Item) => {
    const result = await Swal.fire({ title: 'Hapus barang?', text: `${item.nama} akan dihapus permanen dari database.`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#475569', confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal' });
    if (!result.isConfirmed) return;
    try {
      const { error } = await supabase.from('inventaris').delete().eq('id', item.id);
      if (error) throw error;
      await fetchItems();
      void Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Inventaris dihapus', showConfirmButton: false, timer: 1600 });
    } catch (error: any) {
      console.error('Gagal menghapus inventaris:', error);
      void Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Data tidak dapat dihapus dari Supabase.' });
    }
  };

  const total = (Number(formData.jumlah_baik) || 0) + (Number(formData.jumlah_rusak) || 0);

  return <div className="space-y-6 pb-20">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden"><div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" /><div className="relative z-10"><h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3"><PackageOpen className="text-amber-500" size={28} />Inventaris Klub</h1><p className="text-slate-400 text-sm mt-1">Supabase sebagai sumber data utama • realtime aktif</p></div><button onClick={openAdd} className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl shadow-lg shadow-amber-600/30 active:scale-95 transition-all"><Plus size={18} />Tambah Barang</button></div>
    {loading ? <div className="text-center text-slate-500 py-16">Memuat data inventaris…</div> : items.length === 0 ? <div className="text-center text-slate-500 py-16"><Box size={48} className="mx-auto mb-3 opacity-40" /><p>Belum ada data inventaris.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{items.map(item => <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group flex flex-col h-full"><div className="relative h-52 bg-black/40 overflow-hidden border-b border-white/5">{item.gambar ? <InventoryImage src={item.gambar} alt={item.nama} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/40"><Box size={40} /><span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">Tidak ada foto</span></div>}<div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"><span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{item.kategori}</span></div><div className="absolute top-3 right-3 flex gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10"><button onClick={() => openEdit(item)} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg" title="Edit Barang"><Edit size={14} /></button><button onClick={() => void handleDelete(item)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg" title="Hapus Barang"><Trash2 size={14} /></button></div></div><div className="p-5 flex flex-col flex-grow"><h3 className="font-bold text-white leading-tight text-lg mb-4">{item.nama}</h3><div className="grid grid-cols-3 gap-2 mb-4"><div className="bg-black/40 rounded-xl p-2 text-center border border-white/5"><p className="text-[10px] text-slate-500">Total</p><p className="font-black text-white">{item.jumlah_total}</p></div><div className="bg-emerald-500/10 rounded-xl p-2 text-center border border-emerald-500/20"><p className="text-[10px] text-emerald-500">Baik</p><p className="font-black text-emerald-400">{item.jumlah_baik}</p></div><div className="bg-red-500/10 rounded-xl p-2 text-center border border-red-500/20"><p className="text-[10px] text-red-500">Rusak</p><p className="font-black text-red-400">{item.jumlah_rusak}</p></div></div>{item.keterangan && <p className="text-xs text-slate-400 italic bg-white/5 p-2 rounded-lg mt-auto">{item.keterangan}</p>}</div></div>)}</div>}
    {showModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"><div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl my-auto"><div className="flex items-center justify-between p-5 border-b border-white/10"><h2 className="text-lg font-black text-white uppercase">{editingItem ? 'Edit Inventaris' : 'Tambah Inventaris'}</h2><button type="button" onClick={() => { setShowModal(false); setGambarFile(null); }} className="p-2 text-slate-400 hover:text-white"><X size={20} /></button></div><form onSubmit={handleSave} className="p-5 space-y-4"><label className="block"><span className="text-xs font-bold text-slate-400">Nama Barang</span><input required value={formData.nama} onChange={e => setFormData(prev => ({ ...prev, nama: e.target.value }))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" placeholder="Contoh: Raket Yonex" /></label><label className="block"><span className="text-xs font-bold text-slate-400">Kategori</span><select value={formData.kategori} onChange={e => setFormData(prev => ({ ...prev, kategori: e.target.value }))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500"><option>Perlengkapan Latihan</option><option>Peralatan</option><option>Fasilitas</option><option>Seragam</option><option>Lainnya</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="text-xs font-bold text-emerald-400">Jumlah Baik</span><input type="number" min="0" value={formData.jumlah_baik} onChange={e => setFormData(prev => ({ ...prev, jumlah_baik: Number(e.target.value) }))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" /></label><label className="block"><span className="text-xs font-bold text-red-400">Jumlah Rusak</span><input type="number" min="0" value={formData.jumlah_rusak} onChange={e => setFormData(prev => ({ ...prev, jumlah_rusak: Number(e.target.value) }))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" /></label></div><div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-slate-300">Total otomatis: <strong className="text-white">{total}</strong></div><label className="block"><span className="text-xs font-bold text-slate-400">Keterangan</span><textarea rows={3} value={formData.keterangan} onChange={e => setFormData(prev => ({ ...prev, keterangan: e.target.value }))} className="mt-1 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500" placeholder="Keterangan barang..." /></label><div><span className="text-xs font-bold text-slate-400">Foto Barang</span><label className="mt-1 flex items-center justify-center gap-2 cursor-pointer border border-dashed border-white/15 rounded-xl p-4 text-slate-400 hover:text-white hover:border-amber-500"><Upload size={18} />Pilih Foto<input type="file" accept="image/*" onChange={handleImageChange} className="hidden" /></label>{formData.gambar && <div className="mt-3 relative h-32 rounded-xl overflow-hidden"><InventoryImage src={formData.gambar} alt="Preview" className="w-full h-full object-cover" /><button type="button" onClick={() => { setGambarFile(null); setFormData(prev => ({ ...prev, gambar: '' })); }} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-lg"><X size={16} /></button></div>}</div><div className="flex gap-3 pt-2"><button type="button" onClick={() => { setShowModal(false); setGambarFile(null); }} className="flex-1 rounded-xl bg-white/5 text-slate-300 py-3 font-bold">Batal</button><button disabled={saving} type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 font-black disabled:opacity-50">{saving ? 'Mengunggah & Menyimpan…' : editingItem ? 'Simpan Perubahan' : 'Tambah Barang'}</button></div></form></div></div>}
  </div>;
}
