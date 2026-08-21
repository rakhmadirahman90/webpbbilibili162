import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabase';
import { broadcastDataChange } from '../utils/realtimeHelper';
import { getSiteSetting, saveSiteSetting } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import {
  Plus, Trash2, Image as ImageIcon, Video, Upload, X, Loader2,
  CheckCircle2, ChevronLeft, ChevronRight, Edit3, Link as LinkIcon,
  PlayCircle, Star, GripVertical
} from 'lucide-react';

interface GalleryItem {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  category: string;
  description: string;
  created_at: string;
  is_local?: boolean;
}

const ITEMS_PER_PAGE = 6;
const IMAGE_MAX_SIZE = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 15 * 1024 * 1024;

const splitMediaUrls = (value: string = '') =>
  value.split(/\s*,\s*|\r?\n/).map(v => v.trim()).filter(Boolean);

const joinMediaUrls = (urls: string[]) => urls.filter(Boolean).join(', ');

const isSupabaseMedia = (url: string) => url.includes('supabase.co/storage/');

export default function AdminGallery({ session }: { session?: any }) {
  const userRole = session?.user?.user_metadata?.role || (() => {
    const raw = localStorage.getItem('local_admin_session');
    try { return JSON.parse(raw || '{}')?.user?.user_metadata?.role || 'admin'; } catch { return 'admin'; }
  })();
  const isAdmin = userRole === 'admin';

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  const [videoInputMethod, setVideoInputMethod] = useState<'link' | 'file'>('file');
  const [formData, setFormData] = useState({
    title: '', type: 'image' as 'image' | 'video', url: '',
    category: 'Pertandingan', description: '', is_local: true
  });
  const [albumUrls, setAlbumUrls] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['Pertandingan', 'Latihan', 'Prestasi', 'Fasilitas', 'Latihan Rutin'];

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    window.setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const setting = await getSiteSetting('gallery_list');
      if (Array.isArray(setting)) {
        setItems(setting);
        localStorage.setItem('gallery_local', JSON.stringify(setting));
        return;
      }
      const { data } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      const local = JSON.parse(localStorage.getItem('gallery_local') || '[]');
      const merged = [...(data || []), ...local];
      setItems(merged);
    } catch (error) {
      console.error(error);
      setItems(JSON.parse(localStorage.getItem('gallery_local') || '[]'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGallery();
    const channel = supabase.channel('admin_gallery_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, fetchGallery)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const filteredItems = useMemo(() => items.filter(item => item.type === activeTab), [items, activeTab]);
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const resetForm = () => {
    setFormData({ title: '', type: 'image', url: '', category: 'Pertandingan', description: '', is_local: true });
    setAlbumUrls([]);
    setPreviewIndex(0);
    setEditingId(null);
    setVideoInputMethod('file');
  };

  const openCreate = () => {
    resetForm();
    setFormData(prev => ({ ...prev, type: activeTab }));
    setIsModalOpen(true);
  };

  const openEdit = (item: GalleryItem) => {
    const urls = item.type === 'image' ? splitMediaUrls(item.url) : [item.url].filter(Boolean);
    setEditingId(item.id);
    setAlbumUrls(urls);
    setPreviewIndex(0);
    setFormData({
      title: item.title || '', type: item.type, url: item.url || '',
      category: item.category || 'Pertandingan', description: item.description || '',
      is_local: item.is_local ?? true
    });
    setVideoInputMethod(item.type === 'video' && item.url.includes('youtube.com') ? 'link' : 'file');
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); resetForm(); };

  const getYouTubeID = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^#&?\s]+)/i);
    return match?.[1]?.length === 11 ? match[1] : null;
  };

  const processVideoUrl = (url: string) => {
    const id = getYouTubeID(url.trim());
    return id ? `https://www.youtube.com/embed/${id}` : url.trim();
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const expectedImage = formData.type === 'image';
        if (expectedImage && !file.type.startsWith('image/')) {
          await Swal.fire({ icon: 'warning', title: 'File bukan foto', text: `${file.name} dilewati.` });
          continue;
        }
        if (!expectedImage && !file.type.startsWith('video/')) {
          await Swal.fire({ icon: 'warning', title: 'File bukan video', text: `${file.name} dilewati.` });
          continue;
        }
        const max = expectedImage ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE;
        if (file.size > max) {
          await Swal.fire({ icon: 'warning', title: 'Ukuran terlalu besar', text: `${file.name} melebihi batas ${expectedImage ? '5MB' : '15MB'}.` });
          continue;
        }
        const ext = file.name.split('.').pop()?.toLowerCase() || (expectedImage ? 'jpg' : 'mp4');
        const fileName = `${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}-${Date.now()}.${ext}`;
        const path = `uploads/${fileName}`;
        const { error } = await supabase.storage.from('gallery').upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from('gallery').getPublicUrl(path);
        if (data.publicUrl) uploaded.push(data.publicUrl);
      }
      if (uploaded.length) {
        if (formData.type === 'image') {
          const next = [...albumUrls, ...uploaded];
          setAlbumUrls(next);
          setPreviewIndex(Math.max(0, next.length - uploaded.length));
          setFormData(prev => ({ ...prev, url: joinMediaUrls(next), is_local: true }));
        } else {
          setAlbumUrls(uploaded.slice(0, 1));
          setPreviewIndex(0);
          setFormData(prev => ({ ...prev, url: uploaded[0], is_local: true }));
        }
        showToast(`${uploaded.length} ${formData.type === 'image' ? 'foto' : 'video'} berhasil diunggah`);
      }
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Upload gagal', text: error?.message || 'Gagal mengunggah media.' });
    } finally {
      setIsUploading(false);
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => uploadFiles(Array.from(e.target.files || []));
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragActive(false); uploadFiles(Array.from(e.dataTransfer.files || [])); };

  const removeAlbumPhoto = async (index: number) => {
    const target = albumUrls[index];
    const next = albumUrls.filter((_, i) => i !== index);
    if (!next.length) {
      setAlbumUrls([]);
      setFormData(prev => ({ ...prev, url: '' }));
      setPreviewIndex(0);
    } else {
      setAlbumUrls(next);
      setFormData(prev => ({ ...prev, url: joinMediaUrls(next) }));
      setPreviewIndex(Math.min(previewIndex, next.length - 1));
    }
    if (target && isSupabaseMedia(target)) {
      const clean = target.split('?')[0];
      const marker = '/storage/v1/object/public/gallery/';
      const path = clean.includes(marker) ? clean.split(marker)[1] : '';
      if (path) await supabase.storage.from('gallery').remove([path]);
    }
  };

  const makeCover = (index: number) => {
    if (index <= 0) return;
    const next = [...albumUrls];
    const [cover] = next.splice(index, 1);
    next.unshift(cover);
    setAlbumUrls(next);
    setFormData(prev => ({ ...prev, url: joinMediaUrls(next) }));
    setPreviewIndex(0);
    showToast('Foto utama album diperbarui');
  };

  const saveItems = async (next: GalleryItem[], action: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => {
    setItems(next);
    localStorage.setItem('gallery_local', JSON.stringify(next));
    await saveSiteSetting('gallery_list', next);
    broadcastDataChange('gallery', action, payload);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return Swal.fire({ icon: 'warning', title: 'Judul belum diisi' });
    if (formData.type === 'image' && albumUrls.length === 0) return Swal.fire({ icon: 'warning', title: 'Foto belum dipilih', text: 'Upload minimal satu foto untuk aktivitas ini.' });
    if (formData.type === 'video' && !formData.url.trim()) return Swal.fire({ icon: 'warning', title: 'Video belum dipilih' });

    let finalUrl = formData.type === 'image' ? joinMediaUrls(albumUrls) : formData.url.trim();
    if (formData.type === 'video' && videoInputMethod === 'link') {
      const id = getYouTubeID(finalUrl);
      if (!id) return Swal.fire({ icon: 'warning', title: 'Link YouTube tidak valid' });
      finalUrl = processVideoUrl(finalUrl);
    }

    const payload = {
      title: formData.title.trim(), type: formData.type, url: finalUrl,
      category: formData.category, description: formData.description.trim(),
      is_local: formData.type === 'image' ? true : videoInputMethod === 'file'
    };

    try {
      const next = editingId
        ? items.map(item => item.id === editingId ? { ...item, ...payload } : item)
        : [{ ...payload, id: `gal_${Date.now()}`, created_at: new Date().toISOString() } as GalleryItem, ...items];
      await saveItems(next, editingId ? 'UPDATE' : 'INSERT', editingId ? { id: editingId, ...payload } : payload);
      showToast(editingId ? 'Album berhasil diperbarui' : 'Album berhasil dibuat');
      closeModal();
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menyimpan', text: error?.message || 'Terjadi kesalahan.' });
    }
  };

  const handleDelete = async (item: GalleryItem) => {
    const urls = item.type === 'image' ? splitMediaUrls(item.url) : [item.url];
    const result = await Swal.fire({
      title: 'Hapus aktivitas?',
      html: `<b>${item.title}</b><br><small>${item.type === 'image' ? `${urls.length} foto dalam album` : '1 video'}</small>`,
      icon: 'warning', showCancelButton: true, confirmButtonColor: '#EF4444', cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus', cancelButtonText: 'Batal', background: '#0F172A', color: '#fff'
    });
    if (!result.isConfirmed) return;
    try {
      const next = items.filter(i => i.id !== item.id);
      await saveItems(next, 'DELETE', { id: item.id });
      const storagePaths = urls.filter(isSupabaseMedia).map(url => {
        const marker = '/storage/v1/object/public/gallery/';
        return url.split('?')[0].includes(marker) ? url.split('?')[0].split(marker)[1] : '';
      }).filter(Boolean);
      if (storagePaths.length) await supabase.storage.from('gallery').remove(storagePaths);
      showToast('Aktivitas dan medianya berhasil dihapus');
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal menghapus', text: error?.message || 'Terjadi kesalahan.' });
    }
  };

  const currentPreview = albumUrls[previewIndex] || '';

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-4 sm:p-6 md:p-10 font-sans overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        {successMsg && <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-2xl"><CheckCircle2 size={17}/> {successMsg}</div>}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black italic tracking-tighter uppercase leading-none">MANAGE <span className="text-blue-600">GALLERY</span></h1>
            <div className="flex items-center gap-3 mt-4"><span className="h-px w-8 bg-blue-600"/><p className="text-zinc-500 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em]">Cloud Media Management v3.0</p></div>
          </div>
          {isAdmin && <button onClick={openCreate} className="w-full sm:w-auto flex items-center justify-center gap-3 bg-white text-black hover:bg-blue-600 hover:text-white px-7 py-4 rounded-2xl font-black uppercase text-[10px] transition-all"><Plus size={18}/> Tambah {activeTab === 'image' ? 'Foto / Album' : 'Video'}</button>}
        </div>

        <div className="flex w-full sm:w-fit gap-2 mb-8 bg-zinc-900/60 p-2 rounded-2xl border border-white/5">
          <button onClick={() => setActiveTab('image')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-8 py-4 rounded-xl font-black text-[10px] uppercase ${activeTab === 'image' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}><ImageIcon size={16}/> Photography</button>
          <button onClick={() => setActiveTab('video')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 sm:px-8 py-4 rounded-xl font-black text-[10px] uppercase ${activeTab === 'video' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}><Video size={16}/> Videography</button>
        </div>

        {loading ? <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={44}/></div> : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
              {paginatedItems.length === 0 ? <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl"><ImageIcon className="mx-auto text-zinc-600 mb-4" size={44}/><p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Belum ada {activeTab === 'image' ? 'album foto' : 'video'}</p></div> : paginatedItems.map(item => {
                const urls = item.type === 'image' ? splitMediaUrls(item.url) : [item.url];
                const cover = urls[0] || '';
                return <article key={item.id} className="overflow-hidden rounded-3xl bg-[#0d1423] border border-white/10 shadow-xl">
                  <div className="relative aspect-[4/3] bg-black overflow-hidden">
                    {item.type === 'image' && cover ? <img src={cover} alt={item.title} className="w-full h-full object-cover" loading="lazy"/> : <div className="w-full h-full flex items-center justify-center bg-zinc-900"><PlayCircle size={58} className="text-blue-500"/></div>}
                    <div className="absolute top-3 left-3 px-3 py-2 rounded-xl bg-blue-600 text-white text-[9px] font-black uppercase">{item.category}</div>
                    {item.type === 'image' && <div className="absolute bottom-3 left-3 px-3 py-2 rounded-xl bg-black/75 backdrop-blur text-white text-[10px] font-black"><ImageIcon size={13} className="inline mr-1"/>{urls.length} FOTO</div>}
                  </div>
                  <div className="p-5">
                    <h3 className="font-black text-base sm:text-lg leading-tight line-clamp-2">{item.title}</h3>
                    <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{item.description || 'Dokumentasi PB BILIBILI 162'}</p>
                    {item.type === 'image' && urls.length > 1 && <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-blue-400">Album aktivitas · {urls.length} foto terkait</p>}
                    {isAdmin && <div className="grid grid-cols-2 gap-2 mt-5"><button onClick={() => openEdit(item)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 hover:bg-blue-600 text-[9px] font-black uppercase"><Edit3 size={14}/> Kelola Album</button><button onClick={() => handleDelete(item)} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-[9px] font-black uppercase"><Trash2 size={14}/> Hapus</button></div>}
                  </div>
                </article>;
              })}
            </div>
            {totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-8"><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"><ChevronLeft size={18} className="mx-auto"/></button>{Array.from({length: totalPages}, (_, i) => i + 1).map(p => <button key={p} onClick={() => setCurrentPage(p)} className={`w-10 h-10 rounded-xl text-xs font-black ${p === currentPage ? 'bg-blue-600' : 'bg-white/5 border border-white/10'}`}>{p}</button>)}<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 disabled:opacity-30"><ChevronRight size={18} className="mx-auto"/></button></div>}
          </>
        )}
      </div>

      {isModalOpen && <div className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center py-3 sm:py-8">
          <form onSubmit={handleSubmit} className="w-full max-w-4xl rounded-3xl bg-[#0d1423] border border-white/10 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 sm:p-7 border-b border-white/10"><div><h2 className="text-xl sm:text-2xl font-black uppercase">{editingId ? 'Kelola Album' : 'Tambah Album'}</h2><p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mt-1">{formData.type === 'image' ? 'Satu aktivitas dapat memiliki banyak foto' : 'Video aktivitas PB BILIBILI 162'}</p></div><button type="button" onClick={closeModal} className="p-3 rounded-xl bg-white/5"><X size={20}/></button></div>
            <div className="p-5 sm:p-7 grid lg:grid-cols-[1fr_1.05fr] gap-7">
              <div className="space-y-5">
                <label className="block"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Judul Aktivitas</span><input value={formData.title} onChange={e => setFormData(p => ({...p, title: e.target.value}))} className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" placeholder="Contoh: Musyawarah Kota PBSI Parepare 2026"/></label>
                <div className="grid grid-cols-2 gap-3"><label><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Jenis</span><select value={formData.type} onChange={e => { const type = e.target.value as 'image'|'video'; setFormData(p => ({...p, type, url: type === 'image' ? joinMediaUrls(albumUrls) : ''})); setAlbumUrls(type === 'image' ? albumUrls : []); }} className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm"><option value="image">Foto / Album</option><option value="video">Video</option></select></label><label><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Kategori</span><select value={formData.category} onChange={e => setFormData(p => ({...p, category:e.target.value}))} className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-3 py-3 text-sm">{categories.map(c => <option key={c}>{c}</option>)}</select></label></div>
                <label className="block"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Keterangan</span><textarea value={formData.description} onChange={e => setFormData(p => ({...p, description:e.target.value}))} rows={4} className="mt-2 w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none" placeholder="Keterangan aktivitas..."/></label>

                {formData.type === 'image' ? <>
                  <div onDragOver={e => {e.preventDefault(); setDragActive(true)}} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-blue-500/60'}`}><input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileInput}/><Upload className="mx-auto mb-3 text-blue-500" size={28}/><p className="font-black text-xs uppercase">Upload Banyak Foto Sekaligus</p><p className="text-[10px] text-zinc-500 mt-1">Klik atau drag & drop · maksimal 5MB/foto</p></div>
                  <div className="rounded-2xl bg-black/20 border border-white/5 p-4"><div className="flex items-center justify-between mb-3"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Foto Album</span><span className="text-[9px] font-black text-blue-400">{albumUrls.length} FOTO</span></div>{albumUrls.length ? <div className="grid grid-cols-3 gap-2">{albumUrls.map((url, i) => <div key={`${url}-${i}`} className={`relative aspect-square rounded-xl overflow-hidden border ${i === 0 ? 'border-blue-500' : 'border-white/10'}`}><img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover"/><div className="absolute top-1 left-1 px-1.5 py-1 rounded-md bg-black/70 text-[8px] font-black">{i === 0 ? 'UTAMA' : i + 1}</div><div className="absolute bottom-1 left-1 right-1 flex gap-1"><button type="button" onClick={e => {e.stopPropagation(); makeCover(i)}} className="flex-1 bg-blue-600/90 rounded-md py-1 text-[7px] font-black">{i === 0 ? 'UTAMA' : 'JADIKAN UTAMA'}</button><button type="button" onClick={e => {e.stopPropagation(); removeAlbumPhoto(i)}} className="bg-red-600/90 rounded-md px-2 py-1"><Trash2 size={10}/></button></div></div>)}</div> : <p className="text-center py-6 text-zinc-600 text-[10px] font-black uppercase">Belum ada foto</p>}</div>
                </> : <>
                  <div className="flex gap-2 bg-black/20 p-1 rounded-xl"><button type="button" onClick={() => setVideoInputMethod('file')} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase ${videoInputMethod === 'file' ? 'bg-blue-600' : 'text-zinc-500'}`}>Upload Video</button><button type="button" onClick={() => setVideoInputMethod('link')} className={`flex-1 py-3 rounded-lg text-[9px] font-black uppercase ${videoInputMethod === 'link' ? 'bg-blue-600' : 'text-zinc-500'}`}>Link YouTube</button></div>
                  {videoInputMethod === 'file' ? <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-500/60"><input ref={fileInputRef} type="file" accept="video/*" hidden onChange={handleFileInput}/><Upload className="mx-auto mb-3 text-blue-500" size={30}/><p className="font-black text-xs uppercase">Pilih Video</p><p className="text-[10px] text-zinc-500 mt-1">Maksimal 15MB</p></div> : <div className="relative"><LinkIcon className="absolute left-3 top-3.5 text-zinc-500" size={17}/><input value={formData.url} onChange={e => setFormData(p => ({...p, url:e.target.value}))} className="w-full bg-black/30 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm" placeholder="https://youtube.com/watch?v=..."/></div>}
                  {formData.url && <div className="text-[9px] text-green-400 font-bold break-all">Video siap digunakan</div>}
                </>}
              </div>

              <div className="rounded-3xl bg-black/20 border border-white/5 p-4 sm:p-5 min-h-[300px]">
                <div className="flex items-center justify-between mb-4"><div><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Preview Landing Page</p><p className="text-xs font-bold text-white mt-1">Foto pertama = cover aktivitas</p></div>{formData.type === 'image' && albumUrls.length > 1 && <div className="text-[9px] font-black text-zinc-500">{previewIndex + 1}/{albumUrls.length}</div>}</div>
                {formData.type === 'image' && currentPreview ? <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black"><img src={currentPreview} alt="Preview" className="w-full h-full object-contain"/>{albumUrls.length > 1 && <><button type="button" onClick={() => setPreviewIndex(i => (i - 1 + albumUrls.length) % albumUrls.length)} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70"><ChevronLeft size={18}/></button><button type="button" onClick={() => setPreviewIndex(i => (i + 1) % albumUrls.length)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70"><ChevronRight size={18}/></button></>}</div> : formData.type === 'video' && formData.url ? <div className="aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center"><PlayCircle size={60} className="text-blue-500"/></div> : <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-zinc-600"><ImageIcon size={46}/><p className="mt-3 text-[10px] font-black uppercase">Preview akan tampil di sini</p></div>}
                {formData.type === 'image' && albumUrls.length > 1 && <div className="grid grid-cols-6 gap-1.5 mt-3">{albumUrls.map((url, i) => <button type="button" key={`${url}-thumb-${i}`} onClick={() => setPreviewIndex(i)} className={`aspect-square rounded-lg overflow-hidden border-2 ${i === previewIndex ? 'border-blue-500' : 'border-transparent'}`}><img src={url} alt="thumb" className="w-full h-full object-cover"/></button>)}</div>}
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 p-5 sm:p-7 border-t border-white/10"><button type="button" onClick={closeModal} className="flex-1 py-4 rounded-xl bg-white/5 text-xs font-black uppercase">Batal</button><button type="submit" disabled={isUploading} className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-black uppercase flex items-center justify-center gap-2">{isUploading ? <Loader2 className="animate-spin" size={16}/> : <CheckCircle2 size={16}/>} {editingId ? 'Simpan Perubahan' : 'Publikasikan Album'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
