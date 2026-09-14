import React, { useEffect, useMemo, useRef, useState } from 'react';
import imageCompression from 'browser-image-compression';
import { supabase } from '../supabase';
import { broadcastDataChange } from '../utils/realtimeHelper';
import { getSiteSetting, saveSiteSetting } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import {
  Plus, Trash2, Image as ImageIcon, Video, Upload, X, Loader2,
  CheckCircle2, ChevronLeft, ChevronRight, Edit3, Link as LinkIcon,
  PlayCircle, CalendarDays, Info, Send, ChevronDown
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
const IMAGE_SOURCE_MAX_SIZE = 50 * 1024 * 1024;
const IMAGE_HARD_MAX_BYTES = 5 * 1024 * 1024;
const VIDEO_MAX_SIZE = 15 * 1024 * 1024;

const splitMediaUrls = (value = '') => value.split(/\s*,\s*|\r?\n/).map(v => v.trim()).filter(Boolean);
const joinMediaUrls = (urls: string[]) => urls.filter(Boolean).join(', ');
const isSupabaseMedia = (url: string) => url.includes('supabase.co/storage/');
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const compressGalleryImage = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file;
  const options = {
    maxSizeMB: 4.5,
    maxWidthOrHeight: 4096,
    useWebWorker: false,
    initialQuality: 0.94,
    fileType: 'image/webp' as const,
    preserveExif: false,
  };
  let compressed = await imageCompression(file, options);
  if (compressed.size > IMAGE_HARD_MAX_BYTES) {
    compressed = await imageCompression(file, {
      ...options,
      maxSizeMB: 4.0,
      maxWidthOrHeight: 3840,
      initialQuality: 0.88,
    });
  }
  if (compressed.size >= file.size && file.size <= IMAGE_HARD_MAX_BYTES) return file;
  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'foto-gallery';
  return new File([compressed], `${baseName}.webp`, { type: 'image/webp', lastModified: Date.now() });
};

const uploadGalleryFile = async (file: File, path: string) => {
  let lastError: any = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await supabase.storage.from('gallery').upload(path, file, {
        upsert: false,
        cacheControl: '31536000',
        contentType: file.type || undefined,
      });
      if (!result.error) return result;
      lastError = result.error;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await sleep(700 * attempt);
  }
  return { data: null, error: lastError || new Error('Upload gagal') };
};

export default function AdminGallery({ session }: { session?: any }) {
  const userRole = session?.user?.user_metadata?.role || (() => {
    try {
      const raw = localStorage.getItem('local_admin_session');
      return JSON.parse(raw || '{}')?.user?.user_metadata?.role || 'admin';
    } catch { return 'admin'; }
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
      setItems([...(data || []), ...local]);
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

  useEffect(() => setCurrentPage(1), [activeTab]);

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
    setDragActive(false);
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
    setVideoInputMethod(item.type === 'video' && /youtube\.com|youtu\.be/i.test(item.url) ? 'link' : 'file');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isUploading) return;
    setIsModalOpen(false);
    resetForm();
  };

  const getYouTubeID = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^#&?\s]+)/i);
    return match?.[1]?.length === 11 ? match[1] : null;
  };

  const processVideoUrl = (url: string) => {
    const id = getYouTubeID(url.trim());
    return id ? `https://www.youtube.com/embed/${id}` : url.trim();
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    try {
      const uploaded: string[] = [];
      const failed: string[] = [];
      for (const file of files) {
        const expectedImage = formData.type === 'image';
        if (expectedImage && !file.type.startsWith('image/')) { failed.push(`${file.name}: bukan foto`); continue; }
        if (!expectedImage && !file.type.startsWith('video/')) { failed.push(`${file.name}: bukan video`); continue; }
        let uploadFile = file;
        if (expectedImage) {
          if (file.size > IMAGE_SOURCE_MAX_SIZE) { failed.push(`${file.name}: melebihi 50MB`); continue; }
          try { uploadFile = await compressGalleryImage(file); }
          catch (error) { console.error('Gallery compression error', error); failed.push(`${file.name}: kompresi gagal`); continue; }
          if (uploadFile.size > IMAGE_HARD_MAX_BYTES) { failed.push(`${file.name}: hasil kompresi masih >5MB`); continue; }
        } else if (file.size > VIDEO_MAX_SIZE) {
          failed.push(`${file.name}: melebihi 15MB`); continue;
        }
        const ext = uploadFile.type === 'image/webp'
          ? 'webp'
          : uploadFile.name.split('.').pop()?.toLowerCase() || (expectedImage ? 'jpg' : 'mp4');
        const id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const path = `uploads/${id}.${ext}`;
        const result = await uploadGalleryFile(uploadFile, path);
        if (result.error) { failed.push(`${file.name}: ${result.error.message || 'upload gagal'}`); continue; }
        const { data } = supabase.storage.from('gallery').getPublicUrl(path);
        if (data?.publicUrl) uploaded.push(data.publicUrl);
      }

      if (uploaded.length) {
        if (formData.type === 'image') {
          const next = [...albumUrls, ...uploaded];
          setAlbumUrls(next);
          setPreviewIndex(Math.max(0, next.length - uploaded.length));
          setFormData(prev => ({ ...prev, url: joinMediaUrls(next), is_local: true }));
          showToast(`${uploaded.length} foto berhasil dikompresi & diunggah`);
        } else {
          setAlbumUrls(uploaded.slice(0, 1));
          setPreviewIndex(0);
          setFormData(prev => ({ ...prev, url: uploaded[0], is_local: true }));
          showToast('Video berhasil diunggah');
        }
      }

      if (failed.length) {
        await Swal.fire({
          icon: uploaded.length ? 'warning' : 'error',
          title: uploaded.length ? 'Sebagian upload berhasil' : 'Upload gagal',
          html: `<div style="text-align:left;font-size:13px">${failed.map(v => `<div>• ${v}</div>`).join('')}</div>`,
        });
      } else if (!uploaded.length) {
        await Swal.fire({ icon: 'error', title: 'Upload gagal', text: 'Tidak ada media yang berhasil diproses.' });
      }
    } catch (error: any) {
      console.error('Gallery upload failed', error);
      await Swal.fire({ icon: 'error', title: 'Upload gagal', text: error?.message || 'Gagal mengunggah media. Periksa koneksi internet dan coba lagi.' });
    } finally {
      setIsUploading(false);
      setDragActive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => uploadFiles(Array.from(e.target.files || []));

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    uploadFiles(Array.from(e.dataTransfer.files || []));
  };

  const removeAlbumPhoto = async (index: number) => {
    const target = albumUrls[index];
    const next = albumUrls.filter((_, i) => i !== index);
    setAlbumUrls(next);
    setFormData(prev => ({ ...prev, url: joinMediaUrls(next) }));
    setPreviewIndex(next.length ? Math.min(previewIndex, next.length - 1) : 0);
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
      if (!getYouTubeID(finalUrl)) return Swal.fire({ icon: 'warning', title: 'Link YouTube tidak valid' });
      finalUrl = processVideoUrl(finalUrl);
    }

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      url: finalUrl,
      category: formData.category,
      description: formData.description.trim(),
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
  const previewCount = formData.type === 'image' ? albumUrls.length : formData.url ? 1 : 0;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070d1a] p-4 font-sans text-white sm:p-6 md:p-10">
      <div className="mx-auto max-w-7xl">
        {successMsg && (
          <div className="fixed left-1/2 top-5 z-[400] flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-[10px] font-black uppercase text-white shadow-2xl">
            <CheckCircle2 size={17} /> <span className="truncate">{successMsg}</span>
          </div>
        )}

        <div className="mb-8 flex flex-col items-start justify-between gap-6 md:mb-10 lg:flex-row lg:items-end">
          <div className="min-w-0">
            <h1 className="text-4xl font-black italic uppercase leading-none tracking-tighter sm:text-5xl md:text-6xl">MANAGE <span className="text-blue-600">GALLERY</span></h1>
            <div className="mt-4 flex items-center gap-3"><span className="h-px w-8 bg-blue-600" /><p className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 sm:text-[10px]">Cloud Media Management v5</p></div>
          </div>
          {isAdmin && <button onClick={openCreate} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-7 py-4 text-[10px] font-black uppercase text-black transition hover:bg-blue-600 hover:text-white sm:w-auto"><Plus size={18} /> Tambah {activeTab === 'image' ? 'Foto / Album' : 'Video'}</button>}
        </div>

        <div className="mb-8 flex w-full gap-2 rounded-2xl border border-white/5 bg-zinc-900/60 p-2 sm:w-fit">
          <button onClick={() => setActiveTab('image')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-4 text-[10px] font-black uppercase sm:flex-none sm:px-8 ${activeTab === 'image' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}><ImageIcon size={16} /> Photography</button>
          <button onClick={() => setActiveTab('video')} className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-5 py-4 text-[10px] font-black uppercase sm:flex-none sm:px-8 ${activeTab === 'video' ? 'bg-blue-600 text-white' : 'text-zinc-500'}`}><Video size={16} /> Videography</button>
        </div>

        {loading ? <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={44} /></div> : <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 md:gap-7">
            {paginatedItems.length === 0 ? <div className="col-span-full rounded-3xl border border-dashed border-white/10 py-20 text-center"><ImageIcon className="mx-auto mb-4 text-zinc-600" size={44} /><p className="text-xs font-black uppercase tracking-widest text-zinc-500">Belum ada {activeTab === 'image' ? 'album foto' : 'video'}</p></div> : paginatedItems.map(item => {
              const urls = item.type === 'image' ? splitMediaUrls(item.url) : [item.url];
              const cover = urls[0] || '';
              return <article key={item.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#0d1423] shadow-xl">
                <div className="relative aspect-[4/3] overflow-hidden bg-black">{item.type === 'image' && cover ? <img src={cover} alt={item.title} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full w-full items-center justify-center bg-zinc-900"><PlayCircle size={58} className="text-blue-500" /></div>}<div className="absolute left-3 top-3 rounded-xl bg-blue-600 px-3 py-2 text-[9px] font-black uppercase text-white">{item.category}</div>{item.type === 'image' && <div className="absolute bottom-3 left-3 rounded-xl bg-black/75 px-3 py-2 text-[10px] font-black text-white"><ImageIcon size={13} className="mr-1 inline" />{urls.length} FOTO</div>}</div>
                <div className="p-5"><h3 className="line-clamp-2 text-base font-black leading-tight sm:text-lg">{item.title}</h3><p className="mt-2 line-clamp-2 text-xs text-zinc-500">{item.description || 'Dokumentasi PB BILIBILI 162'}</p>{item.type === 'image' && urls.length > 1 && <p className="mt-3 text-[9px] font-black uppercase tracking-widest text-blue-400">Album aktivitas · {urls.length} foto terkait</p>}{isAdmin && <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => openEdit(item)} className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[9px] font-black uppercase hover:bg-blue-600"><Edit3 size={14} /> Kelola Album</button><button onClick={() => handleDelete(item)} className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 py-3 text-[9px] font-black uppercase text-red-400 hover:bg-red-600 hover:text-white"><Trash2 size={14} /> Hapus</button></div>}</div>
              </article>;
            })}
          </div>
          {totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-2"><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="h-10 w-10 rounded-xl bg-white/5 disabled:opacity-30"><ChevronLeft size={18} className="mx-auto" /></button>{Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <button key={p} onClick={() => setCurrentPage(p)} className={`h-10 w-10 rounded-xl text-xs font-black ${p === currentPage ? 'bg-blue-600' : 'border border-white/10 bg-white/5'}`}>{p}</button>)}<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="h-10 w-10 rounded-xl bg-white/5 disabled:opacity-30"><ChevronRight size={18} className="mx-auto" /></button></div>}
        </>}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[250] overflow-hidden bg-black/80 backdrop-blur-md">
          <div className="flex h-[100dvh] w-full items-center justify-center p-0 sm:p-3 md:p-5">
            <form onSubmit={handleSubmit} className="flex h-full max-h-[100dvh] w-full min-w-0 flex-col overflow-hidden rounded-none border border-white/10 bg-[#0b1424] shadow-2xl sm:h-[calc(100dvh-24px)] sm:max-h-[900px] sm:max-w-[1400px] sm:rounded-3xl md:h-[calc(100dvh-40px)]">
              <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 bg-[#0d1729] px-4 py-4 sm:px-6 sm:py-5 md:px-7 md:py-6">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 sm:h-12 sm:w-12"><ImageIcon size={22} /></div>
                  <div className="min-w-0"><h2 className="truncate text-xl font-black uppercase tracking-tight sm:text-2xl">{editingId ? 'Kelola Album' : 'Tambah Album'}</h2><p className="mt-1 truncate text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500 sm:text-[9px]">{formData.type === 'image' ? 'Foto otomatis dikompresi sebelum upload' : 'Video aktivitas PB BILIBILI 162'}</p></div>
                </div>
                <button type="button" onClick={closeModal} disabled={isUploading} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40 sm:h-11 sm:w-11"><X size={20} /></button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="grid min-w-0 grid-cols-1 gap-5 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,.92fr)] lg:p-7">
                  <section className="min-w-0 space-y-5">
                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                      <label className="block min-w-0 sm:col-span-2"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Judul Aktivitas <b className="text-blue-500">*</b></span><input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} className="mt-2 block h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#08111f] px-4 text-sm outline-none transition focus:border-blue-500" placeholder="Contoh: Musyawarah Kota PBSI Parepare 2026" /></label>

                      <label className="block min-w-0"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Jenis <b className="text-blue-500">*</b></span><div className="relative mt-2"><ImageIcon size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" /><select value={formData.type} onChange={e => { const type = e.target.value as 'image' | 'video'; setFormData(p => ({ ...p, type, url: type === 'image' ? joinMediaUrls(albumUrls) : '' })); if (type !== 'image') setAlbumUrls([]); }} className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-white/10 bg-[#08111f] pl-10 pr-10 text-sm outline-none focus:border-blue-500"><option value="image">Foto / Album</option><option value="video">Video</option></select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" /></div></label>

                      <label className="block min-w-0"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Kategori <b className="text-blue-500">*</b></span><div className="relative mt-2"><select value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} className="block h-12 w-full min-w-0 appearance-none rounded-xl border border-white/10 bg-[#08111f] px-4 pr-10 text-sm outline-none focus:border-blue-500">{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500" /></div></label>
                    </div>

                    <label className="block"><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Keterangan Aktivitas</span><span className="text-[10px] text-zinc-600">{formData.description.length}/500</span></div><textarea maxLength={500} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={4} className="mt-2 block min-h-[120px] w-full resize-none rounded-xl border border-white/10 bg-[#08111f] px-4 py-3 text-sm outline-none focus:border-blue-500" placeholder="Tuliskan keterangan aktivitas..." /></label>

                    <section className="min-w-0">
                      <div className="mb-2 flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Unggah Media <b className="text-blue-500">*</b></span>{isUploading && <span className="flex items-center gap-2 text-[9px] font-black uppercase text-blue-400"><Loader2 size={13} className="animate-spin" /> Memproses...</span>}</div>

                      {formData.type === 'image' ? <>
                        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07101d] p-1"><button type="button" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-black text-white"><ImageIcon size={15} /> Foto</button><button type="button" onClick={() => setFormData(p => ({ ...p, type: 'video', url: '' }))} className="flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black text-zinc-400 hover:bg-white/5 hover:text-white"><Video size={15} /> Video</button></div>
                        <div onDragOver={e => { e.preventDefault(); if (!isUploading) setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => !isUploading && fileInputRef.current?.click()} className={`flex min-h-[155px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition sm:min-h-[170px] ${dragActive ? 'border-blue-400 bg-blue-500/10' : 'border-blue-500/60 bg-blue-500/[0.03] hover:bg-blue-500/[0.07]'} ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500"><Upload size={28} /></div>
                          <p className="text-sm font-black uppercase">Pilih atau seret & lepas foto di sini</p>
                          <p className="mt-1 max-w-lg text-xs text-zinc-400">Upload banyak foto sekaligus (JPG, JPEG, PNG, WEBP)</p>
                          <p className="mt-1 text-[10px] text-zinc-600">Otomatis kompres kualitas tinggi · Maksimal 50MB/foto</p>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={handleFileInput} />

                        {albumUrls.length > 0 && <div className="mt-3 flex min-w-0 gap-3 overflow-x-auto pb-1">
                          {albumUrls.map((url, index) => <div key={`${url}-${index}`} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black sm:h-24 sm:w-24"><button type="button" onClick={() => setPreviewIndex(index)} className="absolute inset-0 z-10" aria-label={`Preview foto ${index + 1}`} /><img src={url} alt={`Foto ${index + 1}`} className={`h-full w-full object-cover ${previewIndex === index ? 'ring-2 ring-blue-500' : ''}`} /><button type="button" onClick={e => { e.stopPropagation(); removeAlbumPhoto(index); }} className="absolute right-1 top-1 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-white hover:bg-red-600"><X size={13} /></button>{index === 0 && <span className="absolute bottom-1 left-1 z-20 rounded bg-blue-600 px-1.5 py-1 text-[7px] font-black uppercase">Cover</span>}<button type="button" onClick={e => { e.stopPropagation(); makeCover(index); }} className={`absolute bottom-1 right-1 z-20 rounded bg-black/70 px-1.5 py-1 text-[7px] font-black uppercase text-white ${index === 0 ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`}>Cover</button></div>)}
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-[8px] font-black uppercase text-zinc-400 hover:border-blue-500 hover:text-blue-400 sm:h-24 sm:w-24"><Plus size={22} /><span className="mt-1">Tambah Foto</span></button>
                        </div>}
                      </> : <>
                        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#07101d] p-1"><button type="button" onClick={() => setFormData(p => ({ ...p, type: 'image', url: joinMediaUrls(albumUrls) }))} className="flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-black text-zinc-400 hover:bg-white/5 hover:text-white"><ImageIcon size={15} /> Foto</button><button type="button" className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-xs font-black text-white"><Video size={15} /> Video</button></div>
                        <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-white/[0.03] p-1"><button type="button" onClick={() => setVideoInputMethod('file')} className={`flex h-9 items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase ${videoInputMethod === 'file' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><Upload size={13} /> Upload File</button><button type="button" onClick={() => setVideoInputMethod('link')} className={`flex h-9 items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase ${videoInputMethod === 'link' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}><LinkIcon size={13} /> Link YouTube</button></div>

                        {videoInputMethod === 'file' ? <>
                          <div onDragOver={e => { e.preventDefault(); if (!isUploading) setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={handleDrop} onClick={() => !isUploading && fileInputRef.current?.click()} className={`flex min-h-[155px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition sm:min-h-[170px] ${dragActive ? 'border-blue-400 bg-blue-500/10' : 'border-blue-500/60 bg-blue-500/[0.03] hover:bg-blue-500/[0.07]'} ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-500"><Video size={28} /></div>
                            <p className="text-sm font-black uppercase">Pilih atau seret & lepas video</p>
                            <p className="mt-1 text-xs text-zinc-400">MP4, MOV, WEBM · Maksimal 15MB</p>
                          </div>
                          <input ref={fileInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleFileInput} />
                        </> : <div><div className="relative"><LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} /><input value={formData.url} onChange={e => setFormData(p => ({ ...p, url: e.target.value, is_local: false }))} className="h-12 w-full rounded-xl border border-white/10 bg-[#08111f] pl-10 pr-4 text-sm outline-none focus:border-blue-500" placeholder="https://www.youtube.com/watch?v=..." /></div><p className="mt-2 text-[10px] text-zinc-600">Link YouTube akan otomatis diubah menjadi embed saat disimpan.</p></div>}

                        {formData.type === 'video' && formData.url && videoInputMethod === 'file' && <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black"><video src={formData.url} controls className="max-h-56 w-full object-contain" /></div>}
                      </>}
                    </section>
                  </section>

                  <aside className="min-w-0 lg:sticky lg:top-0 lg:self-start">
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#07101d]">
                      <div className="border-b border-white/10 px-4 py-4 sm:px-5"><p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Preview Landing Page</p><p className="mt-1 text-sm font-black">Foto pertama = cover aktivitas</p></div>
                      <div className="p-4 sm:p-5">
                        {formData.type === 'image' ? <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
                          <div className="relative aspect-[16/10] w-full bg-[#0d1729]">{currentPreview ? <img src={currentPreview} alt="Preview" className="h-full w-full object-cover" /> : <div className="flex h-full w-full flex-col items-center justify-center text-zinc-600"><ImageIcon size={44} /><span className="mt-2 text-[10px] font-black uppercase tracking-widest">Preview akan tampil di sini</span></div>}{currentPreview && <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1.5 text-[9px] font-black uppercase">{formData.category}</div>}{previewCount > 0 && <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-full bg-black/75 px-3 py-1.5 text-[9px] font-black"><ImageIcon size={12} /> {previewCount} foto</div>}</div>
                          <div className="p-4 sm:p-5"><h3 className="line-clamp-2 text-lg font-black leading-tight">{formData.title || 'Judul aktivitas Anda'}</h3><p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-400">{formData.description || 'Keterangan aktivitas akan tampil di halaman utama setelah album disimpan.'}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] font-bold uppercase tracking-wide text-zinc-500"><span className="flex items-center gap-1.5"><ImageIcon size={13} /> Foto / Album</span><span className="flex items-center gap-1.5"><CalendarDays size={13} /> {new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div></div>
                        </div> : <div className="overflow-hidden rounded-2xl border border-white/10 bg-black"><div className="aspect-video w-full bg-black">{formData.url && videoInputMethod === 'link' && getYouTubeID(formData.url) ? <iframe title="Preview video" src={processVideoUrl(formData.url)} className="h-full w-full" allowFullScreen /> : formData.url ? <video src={formData.url} controls className="h-full w-full object-contain" /> : <div className="flex h-full w-full flex-col items-center justify-center text-zinc-600"><PlayCircle size={46} /><span className="mt-2 text-[10px] font-black uppercase tracking-widest">Preview video akan tampil di sini</span></div>}</div><div className="p-4 sm:p-5"><h3 className="line-clamp-2 text-lg font-black">{formData.title || 'Judul video Anda'}</h3><p className="mt-2 line-clamp-3 text-xs text-zinc-400">{formData.description || 'Keterangan video akan tampil di halaman utama.'}</p></div></div>}

                        <div className="mt-4 flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-3 text-[10px] leading-relaxed text-zinc-400"><Info size={16} className="mt-0.5 shrink-0 text-blue-400" /><span>{formData.type === 'image' ? 'Foto pertama digunakan sebagai cover aktivitas. Anda dapat mengubah cover dengan tombol Cover pada thumbnail.' : 'Video dapat berasal dari file lokal atau link YouTube. Pastikan media sudah ter-upload/terhubung sebelum menyimpan.'}</span></div>
                      </div>
                    </div>
                  </aside>
                </div>
              </div>

              <footer className="shrink-0 border-t border-white/10 bg-[#0b1424] p-3 sm:px-6 sm:py-4 md:px-7">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={closeModal} disabled={isUploading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-6 text-xs font-black uppercase text-zinc-300 hover:bg-white/10 disabled:opacity-40 sm:w-auto"><X size={16} /> Batal</button>
                  <button type="submit" disabled={isUploading} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 text-xs font-black uppercase text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><Send size={16} /> {isUploading ? 'Memproses...' : editingId ? 'Simpan Perubahan' : 'Simpan Album'}</button>
                </div>
                <div className="mt-3 hidden items-center gap-2 rounded-xl bg-white/[0.025] px-4 py-2 text-[9px] text-zinc-500 sm:flex"><Info size={14} className="shrink-0 text-blue-400" /> Tips: Pilih banyak foto sekaligus. Foto akan dikompresi otomatis agar ukuran lebih ringan tanpa mengganggu kualitas secara signifikan.</div>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
