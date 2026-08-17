import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import { ChevronDown, ChevronUp, Edit3, Image as ImageIcon, Loader2, Power, PowerOff, Trash2, Upload, X } from 'lucide-react';

interface PopupConfig { id: string; url_gambar: string; judul: string; deskripsi: string; is_active: boolean; urutan: number; file_url?: string | null; }

export default function AdminPopup() {
  const [popups, setPopups] = useState<PopupConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [form, setForm] = useState({ judul: '', deskripsi: '', url_gambar: '', file_url: '' });

  const resetForm = () => { setEditingId(null); setPreview(null); setForm({ judul: '', deskripsi: '', url_gambar: '', file_url: '' }); };

  const loadPopups = async () => {
    try {
      const { data, error } = await supabase.from('konfigurasi_popup').select('*').order('urutan', { ascending: true }).order('created_at', { ascending: false });
      if (error) throw error;
      setPopups((data || []) as PopupConfig[]);
    } catch (error: any) {
      console.error('[AdminPopup] load failed:', error);
      Swal.fire('Gagal memuat', error?.message || 'Data pop-up tidak dapat dimuat dari Supabase.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadPopups();
    const channel = supabase.channel('admin-popup-db').on('postgres_changes', { event: '*', schema: 'public', table: 'konfigurasi_popup' }, () => loadPopups()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const path = `promosi/popup-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('identitas-atlet').upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('identitas-atlet').getPublicUrl(path);
      setForm(prev => ({ ...prev, url_gambar: data.publicUrl })); setPreview(data.publicUrl);
    } catch (error: any) { Swal.fire('Upload gagal', error?.message || 'Gambar gagal diunggah.', 'error'); }
    finally { setUploading(false); }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.judul.trim()) return Swal.fire('Perhatian', 'Judul pop-up wajib diisi.', 'warning');
    if (!form.url_gambar.trim()) return Swal.fire('Perhatian', 'Poster/gambar wajib diunggah.', 'warning');
    if (saving) return;

    setSaving(true);
    const targetId = editingId ? String(editingId).trim() : '';
    const wasEditing = Boolean(targetId);

    try {
      const payload = {
        judul: form.judul.trim(),
        deskripsi: form.deskripsi.trim(),
        url_gambar: form.url_gambar.trim(),
        file_url: form.file_url.trim() || null,
      };

      if (wasEditing) {
        // IMPORTANT: Supabase/PostgREST UPDATE must always contain an explicit WHERE filter.
        // Never use update(payload) by itself.
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .update(payload)
          .eq('id', targetId)
          .select('*')
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error(`Pop-up dengan ID ${targetId} tidak ditemukan di Supabase. Perubahan tidak disimpan.`);
      } else {
        // Do not call the legacy RPC create function: direct INSERT avoids an old
        // function implementation that can issue an unfiltered UPDATE.
        const nextOrder = popups.length ? Math.min(...popups.map(p => Number(p.urutan) || 0)) - 1 : 0;
        const insertPayload = {
          id: `popup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ...payload,
          is_active: true,
          urutan: nextOrder,
        };
        const { data, error } = await supabase
          .from('konfigurasi_popup')
          .insert(insertPayload)
          .select('*')
          .single();
        if (error) throw error;
        if (!data) throw new Error('Supabase tidak mengembalikan pop-up baru setelah INSERT.');
      }

      await loadPopups();
      resetForm();
      await Swal.fire({
        title: 'Berhasil',
        text: wasEditing ? 'Pop-up berhasil diperbarui dan tersimpan di Supabase.' : 'Pop-up baru berhasil disimpan di Supabase.',
        icon: 'success',
        background: '#0F172A',
        color: '#fff'
      });
    } catch (error: any) {
      console.error('[AdminPopup] save failed:', error);
      await Swal.fire({
        title: 'Gagal menyimpan',
        text: error?.message || 'Pop-up tidak tersimpan ke database Supabase.',
        icon: 'error',
        background: '#0F172A',
        color: '#fff'
      });
    } finally { setSaving(false); }
  };

  const movePopup = async (item: PopupConfig, direction: 'up' | 'down') => {
    if (movingId || saving) return;
    setMovingId(item.id);
    try {
      const currentIndex = popups.findIndex(p => p.id === item.id);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= popups.length) return;
      const target = popups[targetIndex];

      // Both UPDATE requests are explicitly scoped by primary key.
      const first = await supabase.from('konfigurasi_popup').update({ urutan: target.urutan }).eq('id', item.id);
      if (first.error) throw first.error;
      const second = await supabase.from('konfigurasi_popup').update({ urutan: item.urutan }).eq('id', target.id);
      if (second.error) throw second.error;
      await loadPopups();
    } catch (error: any) {
      await Swal.fire('Gagal mengubah urutan', error?.message || 'Urutan pop-up tidak dapat diubah.', 'error');
    } finally { setMovingId(null); }
  };

  const editPopup = (item: PopupConfig) => { setEditingId(String(item.id)); setForm({ judul: item.judul || '', deskripsi: item.deskripsi || '', url_gambar: item.url_gambar || '', file_url: item.file_url || '' }); setPreview(item.url_gambar || null); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const togglePopup = async (item: PopupConfig) => {
    if (saving || movingId) return;
    try {
      const { error } = await supabase.from('konfigurasi_popup').update({ is_active: !item.is_active }).eq('id', String(item.id));
      if (error) throw error;
      await loadPopups();
    } catch (error: any) { Swal.fire('Gagal', error?.message || 'Status pop-up gagal diubah.', 'error'); }
  };

  const deletePopup = async (item: PopupConfig) => {
    const result = await Swal.fire({ title: 'Hapus Pop-up?', text: 'Data akan dihapus permanen dari Supabase dan urutan setelahnya akan dirapikan.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff' });
    if (!result.isConfirmed || saving || movingId) return;
    try {
      // Explicit WHERE filter; no unscoped DELETE.
      const { error } = await supabase.from('konfigurasi_popup').delete().eq('id', String(item.id));
      if (error) throw error;

      // Normalize remaining order with one explicitly scoped UPDATE per row.
      const remaining = popups.filter(p => String(p.id) !== String(item.id)).sort((a, b) => (Number(a.urutan) || 0) - (Number(b.urutan) || 0));
      for (let index = 0; index < remaining.length; index += 1) {
        const desired = index;
        if (Number(remaining[index].urutan) !== desired) {
          const { error: orderError } = await supabase.from('konfigurasi_popup').update({ urutan: desired }).eq('id', String(remaining[index].id));
          if (orderError) throw orderError;
        }
      }

      await loadPopups();
      if (editingId === item.id) resetForm();
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Pop-up dihapus dari Supabase', showConfirmButton: false, timer: 1600 });
    } catch (error: any) { Swal.fire('Gagal menghapus', error?.message || 'Data tidak dapat dihapus.', 'error'); }
  };

  return <div className="min-h-screen bg-[#070d1a] text-white p-3 sm:p-6 overflow-y-auto"><div className="max-w-7xl mx-auto space-y-6">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl sm:text-3xl font-black uppercase italic">Kelola <span className="text-blue-500">Pop-up Promo</span></h1><p className="text-white/40 text-xs mt-1">Supabase `konfigurasi_popup` adalah sumber data utama. Semua UPDATE sekarang memiliki filter ID eksplisit.</p></div>{editingId && <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30">Batal Edit</button>}</div>
    <form onSubmit={handleSave} className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 sm:p-7"><div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
      <div className="lg:col-span-2 min-h-[260px] rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden relative">{preview ? <><img src={preview} alt="Preview" className="w-full h-full object-contain max-h-[460px]"/><button type="button" onClick={() => {setPreview(null);setForm(prev=>({...prev,url_gambar:''}));}} className="absolute top-3 right-3 p-2 rounded-full bg-rose-600"><X size={16}/></button></> : <label className="cursor-pointer flex flex-col items-center gap-3 p-8 text-center"><Upload size={32} className="text-blue-500"/><span className="font-bold text-sm">Unggah Poster Pop-up</span><input type="file" accept="image/*" className="hidden" disabled={uploading||saving} onChange={e=>{const f=e.target.files?.[0];if(f)uploadImage(f)}}/></label>}{uploading&&<div className="absolute inset-0 bg-black/70 flex items-center justify-center"><Loader2 className="animate-spin"/></div>}</div>
      <div className="lg:col-span-3 space-y-4"><input required value={form.judul} onChange={e=>setForm({...form,judul:e.target.value})} placeholder="Judul Promosi" className="w-full rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500"/><textarea value={form.deskripsi} onChange={e=>setForm({...form,deskripsi:e.target.value})} placeholder="Deskripsi informasi" className="w-full h-40 rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500 resize-none"/><input value={form.file_url} onChange={e=>setForm({...form,file_url:e.target.value})} placeholder="URL lampiran dokumen (opsional)" className="w-full rounded-2xl bg-black/30 border border-white/10 p-4 outline-none focus:border-blue-500"/><button type="submit" disabled={saving||uploading} className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-black uppercase flex items-center justify-center gap-2">{saving?<Loader2 className="animate-spin"/>:<>{editingId?<Edit3 size={17}/>:<ImageIcon size={17}/>} {editingId?'PERBARUI POP-UP':'SIMPAN POP-UP BARU'}</>}</button></div>
    </div></form>
    <div className="flex items-center justify-between"><div><h2 className="font-black uppercase tracking-widest text-sm text-white/60">Data Pop-up di Supabase</h2><p className="text-[11px] text-white/30 mt-1">Urutan 1 = tampil pertama. Gunakan tombol ↑ ↓ untuk mengatur urutan.</p></div><button onClick={()=>{setLoading(true);loadPopups()}} className="text-xs text-blue-400">Refresh</button></div>
    {loading?<div className="py-16 flex justify-center"><Loader2 className="animate-spin text-blue-500" size={36}/></div>:popups.length===0?<div className="py-16 text-center text-white/30 border border-dashed border-white/10 rounded-3xl">Belum ada pop-up di database Supabase.</div>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">{popups.map((item,index)=><div key={item.id} className="bg-[#0F172A] border border-white/10 rounded-3xl overflow-hidden"><div className="aspect-[4/5] bg-black"><img src={item.url_gambar} alt={item.judul} className="w-full h-full object-cover"/></div><div className="p-5 space-y-3"><div className="flex items-center justify-between gap-2"><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${item.is_active?'bg-emerald-500/20 text-emerald-400':'bg-white/10 text-white/40'}`}>{item.is_active?'AKTIF':'NON-AKTIF'}</span><span className="text-sm font-black text-blue-400">URUTAN {index+1}</span></div><h3 className="font-black uppercase text-sm line-clamp-2">{item.judul||'Tanpa judul'}</h3><p className="text-xs text-white/40 line-clamp-3">{item.deskripsi}</p><div className="grid grid-cols-5 gap-2"><button type="button" disabled={index===0||movingId===item.id} onClick={()=>movePopup(item,'up')} className="py-3 rounded-xl bg-white/5 hover:bg-blue-600 disabled:opacity-25 flex justify-center" title="Naik satu urutan"><ChevronUp size={16}/></button><button type="button" disabled={index===popups.length-1||movingId===item.id} onClick={()=>movePopup(item,'down')} className="py-3 rounded-xl bg-white/5 hover:bg-blue-600 disabled:opacity-25 flex justify-center" title="Turun satu urutan"><ChevronDown size={16}/></button><button type="button" disabled={saving||movingId===item.id} onClick={()=>togglePopup(item)} className="py-3 rounded-xl bg-white/5 hover:bg-blue-600 flex justify-center" title={item.is_active?'Nonaktifkan':'Aktifkan'}>{item.is_active?<Power size={16}/>:<PowerOff size={16}/>}</button><button type="button" disabled={saving||movingId===item.id} onClick={()=>editPopup(item)} className="py-3 rounded-xl bg-blue-600 flex justify-center" title="Edit"><Edit3 size={16}/></button><button type="button" disabled={saving||movingId===item.id} onClick={()=>deletePopup(item)} className="py-3 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white flex justify-center" title="Hapus"><Trash2 size={16}/></button></div></div></div>)}</div>}
  </div></div>;
}