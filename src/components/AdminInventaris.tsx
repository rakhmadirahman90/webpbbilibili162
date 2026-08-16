import React, { useCallback, useEffect, useState } from 'react';
import { PackageOpen, Plus, Edit, Trash2, Box, Upload, X, Loader2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface Item {
  id: string;
  nama: string;
  kategori: string;
  jumlah_total: number;
  jumlah_baik: number;
  jumlah_rusak: number;
  keterangan: string;
  gambar?: string | null;
}

const emptyForm = { nama: '', kategori: 'Perlengkapan Latihan', jumlah_baik: 1, jumlah_rusak: 0, keterangan: '', gambar: '' };

function resolveImageUrl(value?: string | null) {
  if (!value) return '';
  const url = String(value).trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return supabase.storage.from('identitas-atlet').getPublicUrl(url).data.publicUrl;
}

export default function AdminInventaris() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('inventaris').select('*').order('kategori', { ascending: true }).order('nama', { ascending: true });
    if (error) {
      console.error('[AdminInventaris] read error:', error);
      await Swal.fire('Database Error', error.message, 'error');
      setItems([]);
    } else setItems((data || []) as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
    const channel = supabase.channel('admin-inventaris-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventaris' }, fetchItems)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchItems]);

  const openAdd = () => { setEditingId(null); setFormData({ ...emptyForm }); setShowModal(true); };
  const openEdit = (item: Item) => { setEditingId(item.id); setFormData({ nama: item.nama, kategori: item.kategori, jumlah_baik: item.jumlah_baik, jumlah_rusak: item.jumlah_rusak, keterangan: item.keterangan || '', gambar: item.gambar || '' }); setShowModal(true); };

  const uploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return Swal.fire('File terlalu besar', 'Ukuran foto maksimal 5 MB.', 'warning');
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `inventaris/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('identitas-atlet').upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      setFormData(prev => ({ ...prev, gambar: supabase.storage.from('identitas-atlet').getPublicUrl(path).data.publicUrl }));
    } catch (error: any) {
      await Swal.fire('Upload gagal', error?.message || 'Foto tidak dapat diunggah.', 'error');
    } finally { setUploading(false); event.target.value = ''; }
  };

  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving || uploading) return;
    if (!formData.nama.trim()) return Swal.fire('Perhatian', 'Nama barang wajib diisi.', 'warning');
    const baik = Math.max(0, Number(formData.jumlah_baik) || 0);
    const rusak = Math.max(0, Number(formData.jumlah_rusak) || 0);
    const payload = { nama: formData.nama.trim(), kategori: formData.kategori.trim() || 'Lainnya', jumlah_baik: baik, jumlah_rusak: rusak, jumlah_total: baik + rusak, keterangan: formData.keterangan.trim(), gambar: formData.gambar.trim() || null, updated_at: new Date().toISOString() };
    setSaving(true);
    try {
      const result = editingId
        ? await supabase.from('inventaris').update(payload).eq('id', editingId)
        : await supabase.from('inventaris').insert({ id: `inv_${Date.now()}`, ...payload });
      if (result.error) throw result.error;
      await fetchItems(); setShowModal(false);
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: editingId ? 'Inventaris diperbarui' : 'Inventaris ditambahkan', showConfirmButton: false, timer: 1600 });
    } catch (error: any) {
      await Swal.fire('Gagal menyimpan', error?.message || 'Data belum tersimpan ke Supabase.', 'error');
    } finally { setSaving(false); }
  };

  const deleteItem = async (id: string) => {
    const confirm = await Swal.fire({ title: 'Hapus Barang?', text: 'Data akan dihapus permanen dari Supabase.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', confirmButtonColor: '#ef4444' });
    if (!confirm.isConfirmed || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('inventaris').delete().eq('id', id);
      if (error) throw error;
      await fetchItems();
      await Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Terhapus', showConfirmButton: false, timer: 1400 });
    } catch (error: any) { await Swal.fire('Gagal menghapus', error?.message || 'Data belum terhapus dari Supabase.', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0b1224] p-6 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10"><h1 className="text-2xl sm:text-3xl font-black text-white italic uppercase tracking-tight flex items-center gap-3"><PackageOpen className="text-amber-500" size={28}/> Inventaris Klub</h1><p className="text-slate-400 text-sm mt-1">Sumber data: public.inventaris • realtime Supabase</p></div>
        <button onClick={openAdd} disabled={saving} className="relative z-10 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-black uppercase tracking-wider px-5 py-3 rounded-2xl disabled:opacity-50"><Plus size={18}/> Tambah Barang</button>
      </div>

      {loading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-amber-500" size={40}/></div> : items.length === 0 ? <div className="py-20 text-center text-slate-500"><Box size={48} className="mx-auto mb-2 text-slate-600"/><p className="text-sm font-bold uppercase tracking-wider">Belum Ada Data Inventaris</p><p className="text-[10px] mt-1">Tambahkan barang melalui tombol Tambah Barang.</p></div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(item => { const imageUrl = resolveImageUrl(item.gambar); return <div key={item.id} className="bg-[#0b1224] border border-white/5 rounded-2xl overflow-hidden relative group flex flex-col">
            <div className="relative h-48 bg-black/40 overflow-hidden border-b border-white/5">
              {imageUrl ? <img src={imageUrl} alt={item.nama} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer"/> : <div className="w-full h-full flex flex-col items-center justify-center text-amber-500/40"><Box size={40}/><span className="text-[10px] font-bold uppercase tracking-widest mt-2 text-slate-500">Tidak ada foto</span></div>}
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10"><span className="text-[10px] text-amber-400 font-black uppercase tracking-widest">{item.kategori}</span></div>
              <div className="absolute top-3 right-3 flex gap-1.5 bg-black/60 backdrop-blur-md p-1.5 rounded-xl border border-white/10"><button onClick={() => openEdit(item)} disabled={saving} className="p-1.5 text-blue-400 hover:bg-blue-500/20 rounded-lg"><Edit size={14}/></button><button onClick={() => deleteItem(item.id)} disabled={saving} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 size={14}/></button></div>
            </div>
            <div className="p-5"><h3 className="font-bold text-white text-lg">{item.nama}</h3><div className="grid grid-cols-3 gap-2 mt-4"><div className="bg-black/40 rounded-xl p-2 text-center"><p className="text-[10px] text-slate-500">Total</p><p className="font-black text-white">{item.jumlah_total}</p></div><div className="bg-emerald-500/10 rounded-xl p-2 text-center"><p className="text-[10px] text-emerald-500">Baik</p><p className="font-black text-emerald-400">{item.jumlah_baik}</p></div><div className="bg-red-500/10 rounded-xl p-2 text-center"><p className="text-[10px] text-red-500">Rusak</p><p className="font-black text-red-400">{item.jumlah_rusak}</p></div></div>{item.keterangan && <p className="text-xs text-slate-400 italic bg-white/5 p-2 rounded-lg mt-4">{item.keterangan}</p>}</div>
          </div>; })}
        </div>
      )}

      {showModal && <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"><div className="bg-[#0b1224] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl my-auto"><div className="flex items-center justify-between p-5 border-b border-white/10"><h2 className="text-white font-black uppercase text-sm">{editingId ? 'Edit Inventaris' : 'Tambah Inventaris'}</h2><button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-white"><X size={18}/></button></div><form onSubmit={saveItem} className="p-5 space-y-4">
        <input required value={formData.nama} onChange={e => setFormData(p => ({...p,nama:e.target.value}))} placeholder="Nama Barang" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500"/>
        <input value={formData.kategori} onChange={e => setFormData(p => ({...p,kategori:e.target.value}))} placeholder="Kategori" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-amber-500"/>
        <div className="grid grid-cols-2 gap-3"><input type="number" min="0" value={formData.jumlah_baik} onChange={e => setFormData(p => ({...p,jumlah_baik:Number(e.target.value)}))} placeholder="Jumlah Baik" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/><input type="number" min="0" value={formData.jumlah_rusak} onChange={e => setFormData(p => ({...p,jumlah_rusak:Number(e.target.value)}))} placeholder="Jumlah Rusak" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white"/></div>
        <textarea value={formData.keterangan} onChange={e => setFormData(p => ({...p,keterangan:e.target.value}))} placeholder="Keterangan" className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white min-h-24"/>
        <div className="border border-dashed border-white/10 rounded-2xl p-3"><div className="flex gap-3 items-center">{formData.gambar ? <img src={resolveImageUrl(formData.gambar)} alt="Preview" className="w-20 h-20 rounded-xl object-cover"/> : <div className="w-20 h-20 rounded-xl bg-white/5 flex items-center justify-center"><Box size={24} className="text-slate-500"/></div>}<div className="flex-1"><p className="text-xs text-white font-bold">Foto Inventaris</p><p className="text-[9px] text-slate-500 mt-1">Upload ke Supabase Storage</p><label className="inline-flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-[9px] font-black uppercase cursor-pointer">{uploading ? <Loader2 size={13} className="animate-spin"/> : <Upload size={13}/>} {uploading ? 'Uploading...' : 'Pilih Foto'}<input type="file" accept="image/*" className="hidden" onChange={uploadImage} disabled={uploading || saving}/></label></div>{formData.gambar && <button type="button" onClick={() => setFormData(p => ({...p,gambar:''}))} className="p-2 text-red-400"><X size={15}/></button>}</div></div>
        <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} disabled={saving} className="flex-1 py-3 rounded-xl bg-white/5 text-white font-black text-[10px] uppercase">Batal</button><button type="submit" disabled={saving || uploading} className="flex-1 py-3 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase flex items-center justify-center gap-2">{saving ? <><Loader2 size={16} className="animate-spin"/> Menyimpan...</> : 'Simpan ke Supabase'}</button></div>
      </form></div></div>}
    </div>
  );
}
