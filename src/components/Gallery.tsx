import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { X, Image as ImageIcon, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Share2, Link2, Heart, Eye, Plus, Calendar, Search, PlayCircle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from './LazyImage';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { getSiteSetting } from '../utils/siteSettingsHelper';
import { DEFAULT_GALLERY } from '../data/localDatabase';

const CACHE_KEY = 'cached_gallery';
const LEGACY_CACHE_KEY = 'gallery_local_v3';
const ITEMS_PER_PAGE = 6;
const PUBLIC_DOMAIN = 'https://pbilibili162.99apps.id';

type GalleryItem = {
  id: string;
  type: 'image' | 'video';
  url: string;
  title?: string;
  category?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  thumbnail_url?: string;
};

const splitUrls = (value?: string) => value
  ? value.split(/[\s,]+/).map(url => url.trim()).filter(url => /^https?:\/\//i.test(url) || url.startsWith('/'))
  : [];

function sameGallery(a: GalleryItem[], b: GalleryItem[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const next = b[index];
    return next && `${item.id}|${item.type}|${item.url}|${item.thumbnail_url || ''}|${item.updated_at || item.created_at || ''}` === `${next.id}|${next.type}|${next.url}|${next.thumbnail_url || ''}|${next.updated_at || next.created_at || ''}`;
  });
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [sharePreviewItem, setSharePreviewItem] = useState<GalleryItem | null>(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [urlInitialized, setUrlInitialized] = useState(false);
  const lastGallerySignature = useRef('');
  const fetchInFlight = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('pb_us_liked_gallery');
      if (saved) setLikedItems(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  useEffect(() => setCurrentPage(1), [activeTab, searchQuery]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(selectedId || sharePreviewItem ? 'pb-overlay-open' : 'pb-overlay-close'));
    return () => window.dispatchEvent(new CustomEvent('pb-overlay-close'));
  }, [selectedId, sharePreviewItem]);

  const applyGallery = useCallback((incoming: GalleryItem[]) => {
    const normalized = Array.isArray(incoming) ? incoming.filter(Boolean) : [];
    const signature = normalized.map(item => `${item.id}|${item.type}|${item.url}|${item.thumbnail_url || ''}|${item.updated_at || item.created_at || ''}`).join('||');
    if (signature === lastGallerySignature.current) return;
    lastGallerySignature.current = signature;
    setGalleryItems(prev => sameGallery(prev, normalized) ? prev : normalized);
  }, []);

  const fetchGallery = useCallback(async (initial = false) => {
    if (fetchInFlight.current) return;
    fetchInFlight.current = true;
    try {
      const { data: sbData, error: sbError } = await supabase.from('gallery').select('*').order('created_at', { ascending: false });
      if (!sbError && Array.isArray(sbData) && sbData.length > 0) {
        applyGallery(sbData as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(sbData)); } catch {}
        return;
      }
      const legacy = await getSiteSetting('gallery_list');
      if (Array.isArray(legacy) && legacy.length > 0) {
        applyGallery(legacy as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(legacy)); } catch {}
        return;
      }
      if (initial) {
        try {
          const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              applyGallery(parsed as GalleryItem[]);
              return;
            }
          }
        } catch {}
        applyGallery(DEFAULT_GALLERY as GalleryItem[]);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
      if (initial) {
        try {
          const cached = localStorage.getItem(CACHE_KEY) || localStorage.getItem(LEGACY_CACHE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              applyGallery(parsed as GalleryItem[]);
              return;
            }
          }
        } catch {}
        applyGallery(DEFAULT_GALLERY as GalleryItem[]);
      }
    } finally {
      fetchInFlight.current = false;
      if (initial) setLoading(false);
    }
  }, [applyGallery]);

  useEffect(() => {
    fetchGallery(true);
    const handleUpdate = () => fetchGallery(false);
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('table_updated_gallery', handleUpdate);
    window.addEventListener('site_setting_updated', handleUpdate);
    const channel = supabase.channel('public_gallery_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchGallery(false)).subscribe();
    return () => {
      window.removeEventListener('app_data_changed', handleUpdate);
      window.removeEventListener('table_updated_gallery', handleUpdate);
      window.removeEventListener('site_setting_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [fetchGallery]);

  useEffect(() => {
    if (!galleryItems.length || urlInitialized) return;
    const urlId = searchParams.get('gallery') || searchParams.get('galleryId') || searchParams.get('photoId') || searchParams.get('videoId');
    if (urlId) {
      const found = galleryItems.find(item => item.id === urlId);
      if (found) {
        setActiveTab(found.type);
        setSelectedId(found.id);
        setActiveImgIndex(0);
      }
    }
    setUrlInitialized(true);
  }, [galleryItems, searchParams, urlInitialized]);

  useEffect(() => {
    if (!urlInitialized) return;
    const urlId = searchParams.get('gallery') || searchParams.get('galleryId') || searchParams.get('photoId') || searchParams.get('videoId');
    if (selectedId && searchParams.get('gallery') !== selectedId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.set('gallery', selectedId);
        ['galleryId', 'photoId', 'videoId'].forEach(key => next.delete(key));
        return next;
      }, { replace: true });
    } else if (!selectedId && urlId) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        ['gallery', 'galleryId', 'photoId', 'videoId'].forEach(key => next.delete(key));
        return next;
      }, { replace: true });
    }
  }, [selectedId, searchParams, setSearchParams, urlInitialized]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedId(null);
        setSharePreviewItem(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getYouTubeID = useCallback((url: string) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
    return match && match[2]?.length === 11 ? match[2] : null;
  }, []);

  const getThumbnail = useCallback((item: GalleryItem) => {
    if (!item.url) return '/placeholder-image.jpg';
    if (item.type === 'image') return splitUrls(item.url)[0] || '/placeholder-image.jpg';
    const videoId = getYouTubeID(item.url);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return item.thumbnail_url || '';
  }, [getYouTubeID]);

  const getGalleryImages = useCallback((item: GalleryItem) => item?.type === 'image' ? splitUrls(item.url) : [], []);
  const filteredMedia = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return galleryItems.filter(item => {
      if (item.type !== activeTab) return false;
      if (!query) return true;
      return item.title?.toLowerCase().includes(query) || item.category?.toLowerCase().includes(query);
    });
  }, [galleryItems, activeTab, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / ITEMS_PER_PAGE));
  const paginatedMedia = useMemo(() => filteredMedia.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [filteredMedia, currentPage]);
  const activeMedia = useMemo(() => galleryItems.find(item => item.id === selectedId) || null, [galleryItems, selectedId]);
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(totalPages); }, [currentPage, totalPages]);

  const handleLike = (event: React.MouseEvent | React.KeyboardEvent, id: string) => {
    event.stopPropagation();
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('pb_us_liked_gallery', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const getShareUrl = (item: GalleryItem) => `${PUBLIC_DOMAIN}/api/share-galeri?id=${encodeURIComponent(item.id)}&v=20`;
  const getDetailUrl = (item: GalleryItem) => `${PUBLIC_DOMAIN}/galeri?gallery=${encodeURIComponent(item.id)}`;

  const handleShare = async (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const shareUrl = getShareUrl(item);
    const title = String(item.title || 'Dokumentasi PB Bilibili 162').trim();
    const text = `*${title}*\n\n📸 ${item.type === 'video' ? 'Video' : 'Foto'} Dokumentasi PB Bilibili 162\n\n${shareUrl}`;
    if (platform === 'wa') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(item.id);
        window.setTimeout(() => setCopySuccess(null), 2000);
      } catch (error) {
        console.error('Gagal menyalin tautan galeri:', error);
      }
    }
  };

  const goToImage = (index: number, count: number) => {
    if (!count) return;
    setActiveImgIndex((index + count) % count);
  };

  return (
    <section id="gallery" className="bg-[#f8fafc] pb-24 pt-10 md:pt-14 gallery-stable">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 mb-8 md:mb-12">
          <div className="inline-flex bg-white p-1.5 rounded-full border border-slate-200/80 shadow-xs shrink-0">
            <button onClick={() => setActiveTab('image')} className={`flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-[11px] sm:text-xs tracking-wider ${activeTab === 'image' ? 'bg-[#1e293b] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><ImageIcon size={15} /> FOTO</button>
            <button onClick={() => setActiveTab('video')} className={`flex items-center gap-2 px-5 sm:px-8 py-2.5 sm:py-3.5 rounded-full font-black text-[11px] sm:text-xs tracking-wider ${activeTab === 'video' ? 'bg-[#1e293b] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}><PlayCircle size={15} /> VIDEO</button>
          </div>
          <div className="relative w-full md:max-w-xs lg:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400"><Search size={16} /></div>
            <input type="text" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder={`Cari ${activeTab === 'image' ? 'foto' : 'video'} galeri...`} className="w-full pl-11 pr-11 py-3 bg-white border border-slate-200 rounded-full text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xs" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400" aria-label="Hapus pencarian"><X size={15} /></button>}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500"><Loader2 className="mb-4 text-emerald-500" size={40} /><p className="font-bold uppercase tracking-widest text-[10px]">Sinkronisasi Galeri...</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedMedia.length > 0 ? paginatedMedia.map(item => {
              const thumbnail = getThumbnail(item);
              const photoCount = getGalleryImages(item).length;
              return (
                <article key={item.id} onClick={() => { setSelectedId(item.id); setActiveImgIndex(0); }} className="gallery-card relative isolate cursor-pointer overflow-hidden rounded-xl bg-white border border-slate-100 flex flex-col shadow-xs">
                  <div className="aspect-[1.5/1] relative isolate overflow-hidden bg-slate-100 shrink-0">
                    {item.type === 'video' && !getYouTubeID(item.url) && thumbnail ? <video src={`${item.url}#t=0.5`} poster={thumbnail} muted playsInline preload="metadata" className="w-full h-full object-cover block brightness-100 filter-none" /> : thumbnail ? <LazyImage src={thumbnail} alt={item.title || ''} containerClassName="w-full h-full" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><PlayCircle size={42} /></div>}
                    <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-sm z-10 max-w-[85%] truncate">{item.category || 'DOKUMENTASI'}</div>
                    {item.type === 'image' && photoCount > 1 && <div className="absolute bottom-4 left-4 bg-black/70 text-white px-2.5 py-1.5 rounded-full text-[10px] font-black z-10">{photoCount} FOTO</div>}
                    <button onClick={event => handleLike(event, item.id)} className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md z-10 ${likedItems.has(item.id) ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-500'}`} aria-label="Sukai"><Heart size={15} fill={likedItems.has(item.id) ? 'currentColor' : 'none'} /></button>
                    <div className="absolute bottom-[-5px] right-5 w-11 h-11 bg-[#22c55e] text-white rounded-full flex items-center justify-center shadow-lg z-10">{item.type === 'video' ? <PlayCircle size={18} /> : <Plus size={18} />}</div>
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col flex-grow">
                    <div className="text-slate-400 text-[10px] mb-2 font-extrabold uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" />{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}</div>
                    <h3 className="text-slate-900 text-base font-black leading-snug uppercase line-clamp-2 mb-4">{item.title}</h3>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.type === 'video' ? 'VIDEO MULTIMEDIA' : `${photoCount > 1 ? `${photoCount} FOTO` : 'PHOTO GALLERY'}`}</span><div className="flex items-center gap-3 text-slate-400"><span className="flex items-center gap-1"><Heart size={13} fill={likedItems.has(item.id) ? 'currentColor' : 'none'} /><span className="text-[10px] font-bold text-slate-500">{likedItems.has(item.id) ? 1 : 0}</span></span><span className="flex items-center gap-1"><Eye size={13} /><span className="text-[10px] font-bold text-slate-500">1</span></span></div></div>
                  </div>
                </article>
              );
            }) : (
              <div className="col-span-full py-20 px-6 text-center border border-slate-200 border-dashed rounded-xl bg-white shadow-xs"><div className="max-w-md mx-auto flex flex-col items-center"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100"><Search size={24} /></div><h4 className="text-slate-800 font-extrabold uppercase tracking-wider text-sm mb-2">{searchQuery ? 'Tidak Ada Hasil Ditemukan' : 'Galeri Kosong'}</h4><p className="text-slate-400 text-xs leading-relaxed">{searchQuery ? `Tidak ada ${activeTab === 'image' ? 'foto' : 'video'} dengan kata kunci "${searchQuery}".` : `Belum ada ${activeTab === 'image' ? 'foto' : 'video'} di galeri.`}</p></div></div>
            )}
          </div>
        )}

        {!loading && totalPages > 1 && <div className="flex items-center justify-center gap-2 mt-12 pb-6"><button disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} className="w-10 h-10 rounded border border-slate-200 bg-white text-xs font-bold flex items-center justify-center disabled:opacity-40"><ChevronLeft size={16} /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <button key={page} onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded text-xs font-bold ${currentPage === page ? 'bg-[#facc15] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{page}</button>)}<button disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} className="w-10 h-10 rounded border border-slate-200 bg-white text-xs font-bold flex items-center justify-center disabled:opacity-40"><ChevronRight size={16} /></button></div>}

        {activeMedia && (() => {
          const images = getGalleryImages(activeMedia);
          const count = images.length;
          const currentImage = images[activeImgIndex] || images[0] || '';
          const thumbnail = getThumbnail(activeMedia);
          return <div className="gallery-lightbox fixed inset-0 z-[110000] bg-white text-slate-900 h-[100dvh] overflow-hidden flex flex-col">
            <div className="shrink-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md"><button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-zinc-300 py-1.5 px-3 rounded-lg" aria-label="Kembali"><ArrowLeft size={20} /><span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">Kembali</span></button><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0"><img src="/logo_pb_bilibili_162.svg" alt="Logo" className="w-full h-full object-contain" /></div><span className="text-xs font-black uppercase tracking-[0.2em]">PB BILIBILI 162</span></div><div className="flex items-center gap-2"><button onClick={event => handleLike(event, activeMedia.id)} className="p-2 rounded-full text-zinc-300" aria-label="Sukai"><Heart size={18} fill={likedItems.has(activeMedia.id) ? 'currentColor' : 'none'} /></button><button onClick={() => setSharePreviewItem(activeMedia)} className="p-2 rounded-full text-zinc-300" aria-label="Bagikan"><Share2 size={18} /></button></div></div>
            <div className="flex-1 min-h-0 w-full flex flex-col overflow-hidden bg-white">
              <div className="shrink-0 w-full bg-[#030712] relative h-[38vh] sm:h-[48vh] md:h-[58vh] lg:h-[65vh] overflow-hidden flex items-center justify-center border-b border-slate-900/40">
                {activeMedia.type === 'video' ? <div className="w-full h-full flex items-center justify-center bg-black">{getYouTubeID(activeMedia.url) ? <iframe key={activeMedia.id} className="w-full h-full max-h-screen border-0" src={`https://www.youtube.com/embed/${getYouTubeID(activeMedia.url)}?autoplay=1&rel=0`} title={activeMedia.title || 'Video galeri'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video key={activeMedia.id} src={activeMedia.url} poster={thumbnail} className="w-full h-full max-h-screen object-contain" controls autoPlay playsInline preload="metadata" />}</div> : <div className="relative w-full h-full flex items-center justify-center bg-[#030712]">{currentImage && <img key={`${activeMedia.id}-${activeImgIndex}`} src={getOptimizedImageUrl(currentImage, 1400)} alt={`${activeMedia.title || 'Foto'} ${activeImgIndex + 1}`} loading="eager" decoding="async" className="max-w-full max-h-full object-contain block brightness-100 filter-none" referrerPolicy="no-referrer" />}{count > 1 && <><button onClick={() => goToImage(activeImgIndex - 1, count)} className="absolute left-3.5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/65 hover:bg-black/80 text-white z-20" aria-label="Foto sebelumnya"><ChevronLeft size={22} /></button><button onClick={() => goToImage(activeImgIndex + 1, count)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/65 hover:bg-black/80 text-white z-20" aria-label="Foto berikutnya"><ChevronRight size={22} /></button></>}{count > 0 && <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider z-20">FOTO {activeImgIndex + 1} / {count}</div>}</div>}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y"><div className="max-w-5xl mx-auto px-5 sm:px-8 pt-6 sm:pt-8 pb-4"><div className="flex items-center justify-between gap-4 mb-3"><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{activeMedia.category || 'DOKUMENTASI'}</span><button onClick={() => setSharePreviewItem(activeMedia)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366] text-white text-xs font-black uppercase"><Share2 size={13} /> Bagikan</button></div><h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight mb-3">{activeMedia.title}</h2>{activeMedia.description && <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{activeMedia.description}</p>}</div>{activeMedia.type === 'image' && count > 1 && <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-2 pb-8"><div className="flex items-center justify-between gap-3 mb-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Album Foto</p><p className="text-sm font-extrabold text-slate-800">{count} foto dokumentasi</p></div><span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">Foto {activeImgIndex + 1} dipilih</span></div><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pb-2">{images.map((img, idx) => <button key={`${activeMedia.id}-grid-${idx}`} onClick={() => setActiveImgIndex(idx)} className={`group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 border-2 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${idx === activeImgIndex ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-transparent hover:border-slate-300'}`} aria-label={`Buka foto ${idx + 1}`}><img src={getOptimizedImageUrl(img, 520)} alt={`Foto ${idx + 1} dari ${count}`} loading="lazy" decoding="async" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] brightness-100 filter-none" referrerPolicy="no-referrer" /><span className="absolute left-2 bottom-2 min-w-7 h-7 px-2 rounded-full bg-black/75 text-white text-[10px] font-black flex items-center justify-center">{idx + 1}</span>{idx === activeImgIndex && <span className="absolute top-2 right-2 bg-emerald-500 text-white px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Terpilih</span>}</button>)}</div></div>}</div>
            </div>
          </div>;
        })()}
      </div>

      <AnimatePresence>
        {sharePreviewItem && (() => {
          const item = sharePreviewItem;
          const titleClean = String(item.title || 'Dokumentasi PB Bilibili 162').trim();
          const shareUrl = getShareUrl(item);
          const detailUrl = getDetailUrl(item);
          const previewImage = getThumbnail(item);
          const dateText = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
          const mediaLabel = item.type === 'video' ? 'Video Dokumentasi' : 'Foto Dokumentasi';

          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setSharePreviewItem(null)}>
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 relative my-auto" onClick={e => e.stopPropagation()}>
                <div className="bg-[#075E54] text-white p-4 flex items-center justify-between shadow-md"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-white shadow-inner font-bold"><MessageCircle size={22} /></div><div><h3 className="font-extrabold text-sm sm:text-base leading-tight">Pratinjau Bagikan {item.type === 'video' ? 'Video' : 'Foto'}</h3><p className="text-[11px] text-emerald-100/90 font-medium">Tampilan persis seperti pratinjau berita di WhatsApp</p></div></div><button onClick={() => setSharePreviewItem(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" aria-label="Tutup Pratinjau"><X size={18} /></button></div>
                <div className="p-4 sm:p-5 bg-[#efeae2] min-h-[320px] max-h-[60vh] overflow-y-auto space-y-3 font-sans">
                  <div className="flex justify-center"><span className="bg-white/90 text-slate-600 text-[10px] font-bold px-3 py-1 rounded-md shadow-2xs border border-slate-200/60 uppercase tracking-wider">PRATINJAU PESAN WHATSAPP</span></div>
                  <div className="bg-[#dcf8c6] text-slate-900 rounded-2xl rounded-tr-none p-3.5 shadow-md border border-emerald-200/80 max-w-[96%] ml-auto relative">
                    {previewImage && <div className="mb-2.5 rounded-xl overflow-hidden border border-emerald-300/40 bg-black/5 aspect-[16/9] relative shadow-xs"><LazyImage src={getOptimizedImageUrl(previewImage, 800)} alt={titleClean} className="w-full h-full object-cover" /></div>}
                    <div className="bg-white/95 rounded-lg p-2.5 mb-2.5 border-l-4 border-[#25D366] shadow-2xs text-left"><p className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug mb-1">{titleClean}</p><p className="text-[11px] text-slate-600 leading-relaxed">{dateText ? `${dateText} — ` : ''}{mediaLabel} PB Bilibili 162</p><p className="text-[10px] text-emerald-700 font-bold mt-1.5 flex items-center gap-1"><Link2 size={11} /> pbilibili162.99apps.id</p></div>
                    <div className="text-xs sm:text-[13px] text-slate-800 space-y-1.5 leading-relaxed font-sans text-left"><p className="font-black text-slate-900">*{titleClean}*</p><p className="italic text-slate-700 text-[11.5px]">📸 _{mediaLabel} PB Bilibili 162_</p><p className="text-slate-900 font-bold text-[11px] pt-1">✨ *Lihat {item.type === 'video' ? 'Video' : 'Foto'} Selengkapnya:*</p><p className="text-blue-700 font-bold underline break-all text-[11px]">{shareUrl}</p></div>
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-500 font-medium"><span>SEKARANG</span><span className="text-[#34B7F1] font-extrabold text-xs leading-none">✓✓</span></div>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full"><button onClick={() => { handleShare(item, 'wa'); setSharePreviewItem(null); }} className="flex items-center justify-center gap-2 px-4 py-3 bg-[#25D366] hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-200 transition-all active:scale-95"><Share2 size={16} /> <span>Bagikan ke WhatsApp</span></button><button onClick={() => { handleShare(item, 'wa'); setSharePreviewItem(null); }} className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"><MessageCircle size={16} /> <span>Kirim Card Gambar WA</span></button></div>
                  <div className="flex items-center justify-between gap-2 w-full pt-1"><button onClick={() => handleShare(item, 'copy')} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs uppercase rounded-lg transition-all active:scale-95"><Link2 size={13} /><span>{copySuccess === item.id ? 'Tersalin!' : 'Salin Tautan'}</span></button><button onClick={() => setSharePreviewItem(null)} className="px-3 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold uppercase rounded-lg">Tutup</button></div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </section>
  );
}
