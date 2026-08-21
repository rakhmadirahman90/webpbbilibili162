import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import { X, Image as ImageIcon, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Share2, Link2, Heart, Eye, Plus, Calendar, Search, PlayCircle } from 'lucide-react';
import LazyImage from './LazyImage';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';
import { getSiteSetting } from '../utils/siteSettingsHelper';
import { DEFAULT_GALLERY } from '../data/localDatabase';

const CACHE_KEY = 'cached_gallery';
const LEGACY_CACHE_KEY = 'gallery_local_v3';
const ITEMS_PER_PAGE = 6;

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

function sameGallery(a: GalleryItem[], b: GalleryItem[]) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const next = b[index];
    return next && `${item.id}|${item.type}|${item.url}|${item.thumbnail_url || ''}|${item.updated_at || item.created_at || ''}` ===
      `${next.id}|${next.type}|${next.url}|${next.thumbnail_url || ''}|${next.updated_at || next.created_at || ''}`;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(selectedId ? 'pb-overlay-open' : 'pb-overlay-close'));
    return () => window.dispatchEvent(new CustomEvent('pb-overlay-close'));
  }, [selectedId]);

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
      const data = await getSiteSetting('gallery_list');
      if (Array.isArray(data) && data.length > 0) {
        applyGallery(data as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {}
        return;
      }

      const { data: sbData, error } = await supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(sbData) && sbData.length > 0) {
        applyGallery(sbData as GalleryItem[]);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(sbData)); } catch {}
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
            if (Array.isArray(parsed) && parsed.length > 0) applyGallery(parsed as GalleryItem[]);
          }
        } catch {}
        if (lastGallerySignature.current === '') applyGallery(DEFAULT_GALLERY as GalleryItem[]);
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

    const channel = supabase
      .channel('public_gallery_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchGallery(false))
      .subscribe();

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
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const getYouTubeID = useCallback((url: string) => {
    if (!url) return null;
    const match = url.match(/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/);
    return match && match[2]?.length === 11 ? match[2] : null;
  }, []);

  const getEmbedUrl = useCallback((url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const id = getYouTubeID(url);
    return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url;
  }, [getYouTubeID]);

  const getThumbnail = useCallback((item: GalleryItem) => {
    if (!item.url) return '/placeholder-image.jpg';
    if (item.type === 'image') return item.url.split(/[\s,]+/)[0];
    const videoId = getYouTubeID(item.url);
    if (videoId) return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    return item.thumbnail_url || '';
  }, [getYouTubeID]);

  const getGalleryImages = useCallback((item: GalleryItem) => {
    if (!item?.url || item.type !== 'image') return [];
    return item.url.split(/[\s,]+/).map(url => url.trim()).filter(Boolean);
  }, []);

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

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handleLike = (event: React.MouseEvent | React.KeyboardEvent, id: string) => {
    event.stopPropagation();
    setLikedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem('pb_us_liked_gallery', JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const handleShare = (item: GalleryItem, platform: 'wa' | 'fb' | 'copy') => {
    const currentUrl = `${window.location.origin}?gallery=${encodeURIComponent(item.id)}`;
    const shareText = `Lihat dokumentasi "${item.title || 'PB Bilibili 162'}" dari PB Bilibili 162: ${currentUrl}`;
    if (platform === 'wa') window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    if (platform === 'fb') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
    if (platform === 'copy') {
      navigator.clipboard?.writeText(currentUrl).then(() => {
        setCopySuccess(item.id);
        window.setTimeout(() => setCopySuccess(null), 2000);
      });
    }
  };

  const changeMedia = (direction: -1 | 1) => {
    if (!activeMedia || filteredMedia.length < 2) return;
    const currentIndex = filteredMedia.findIndex(item => item.id === activeMedia.id);
    const nextIndex = (currentIndex + direction + filteredMedia.length) % filteredMedia.length;
    setSelectedId(filteredMedia[nextIndex].id);
    setActiveImgIndex(0);
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
              return (
                <article key={item.id} onClick={() => { setSelectedId(item.id); setActiveImgIndex(0); }} className="gallery-card group relative cursor-pointer overflow-hidden rounded-xl bg-white border border-slate-100 flex flex-col shadow-xs">
                  <div className="aspect-[1.5/1] relative overflow-hidden bg-slate-100 shrink-0">
                    {item.type === 'video' && !getYouTubeID(item.url) && thumbnail ? (
                      <video src={`${item.url}#t=0.5`} poster={thumbnail} muted playsInline preload="metadata" className="w-full h-full object-cover block" />
                    ) : thumbnail ? (
                      <LazyImage src={thumbnail} alt={item.title || ''} containerClassName="w-full h-full" className="w-full h-full object-cover" onError={(event: any) => {
                        const videoId = getYouTubeID(item.url);
                        if (videoId) event.currentTarget.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                      }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400"><PlayCircle size={42} /></div>
                    )}
                    <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-sm z-10 max-w-[85%] truncate">{item.category || 'DOKUMENTASI'}</div>
                    <button onClick={event => handleLike(event, item.id)} className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md z-10 ${likedItems.has(item.id) ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-500'}`} aria-label="Sukai"><Heart size={15} fill={likedItems.has(item.id) ? 'currentColor' : 'none'} /></button>
                    <div className="absolute bottom-[-5px] right-5 w-11 h-11 bg-[#22c55e] text-white rounded-full flex items-center justify-center shadow-lg z-10">{item.type === 'video' ? <PlayCircle size={18} /> : <Plus size={18} />}</div>
                  </div>
                  <div className="p-6 sm:p-7 flex flex-col flex-grow">
                    <div className="text-slate-400 text-[10px] mb-2 font-extrabold uppercase tracking-widest flex items-center gap-1.5"><Calendar size={12} className="text-slate-300" />{item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}</div>
                    <h3 className="text-slate-900 text-base font-black leading-snug uppercase line-clamp-2 mb-4">{item.title}</h3>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between"><span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.type === 'video' ? 'VIDEO MULTIMEDIA' : 'PHOTO GALLERY'}</span><div className="flex items-center gap-3 text-slate-400"><span className="flex items-center gap-1"><Heart size={13} fill={likedItems.has(item.id) ? 'currentColor' : 'none'} /><span className="text-[10px] font-bold text-slate-500">{likedItems.has(item.id) ? 1 : 0}</span></span><span className="flex items-center gap-1"><Eye size={13} /><span className="text-[10px] font-bold text-slate-500">1</span></span></div></div>
                  </div>
                </article>
              );
            }) : (
              <div className="col-span-full py-20 px-6 text-center border border-slate-200 border-dashed rounded-xl bg-white shadow-xs"><div className="max-w-md mx-auto flex flex-col items-center"><div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100"><Search size={24} /></div><h4 className="text-slate-800 font-extrabold uppercase tracking-wider text-sm mb-2">{searchQuery ? 'Tidak Ada Hasil Ditemukan' : 'Galeri Kosong'}</h4><p className="text-slate-400 text-xs leading-relaxed">{searchQuery ? `Tidak ada ${activeTab === 'image' ? 'foto' : 'video'} dengan kata kunci "${searchQuery}".` : `Belum ada ${activeTab === 'image' ? 'foto' : 'video'} di galeri.`}</p>{searchQuery && <button onClick={() => setSearchQuery('')} className="mt-4 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold">Reset Pencarian</button>}</div></div>
            )}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 pb-6">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))} className="w-10 h-10 rounded border border-slate-200 bg-white text-xs font-bold flex items-center justify-center disabled:opacity-40"><ChevronLeft size={16} /></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => <button key={page} onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded text-xs font-bold ${currentPage === page ? 'bg-[#facc15] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{page}</button>)}
            <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))} className="w-10 h-10 rounded border border-slate-200 bg-white text-xs font-bold flex items-center justify-center disabled:opacity-40"><ChevronRight size={16} /></button>
          </div>
        )}

        {activeMedia && (() => {
          const images = getGalleryImages(activeMedia);
          const currentImage = images[activeImgIndex] || images[0] || '';
          return (
            <div className="gallery-lightbox fixed inset-0 z-[110000] bg-white text-slate-900 overflow-y-auto flex flex-col">
              <div className="sticky top-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md">
                <button onClick={() => setSelectedId(null)} className="flex items-center gap-2 text-zinc-300 py-1.5 px-3 rounded-lg" aria-label="Kembali"><ArrowLeft size={20} /><span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">Kembali</span></button>
                <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shrink-0"><img src="/logo_pb_bilibili_162.svg" alt="Logo" className="w-full h-full object-contain" /></div><span className="text-xs font-black uppercase tracking-[0.2em]">PB BILIBILI 162</span></div>
                <div className="flex items-center gap-2"><button onClick={event => handleLike(event, activeMedia.id)} className="p-2 rounded-full text-zinc-300" aria-label="Sukai"><Heart size={18} fill={likedItems.has(activeMedia.id) ? 'currentColor' : 'none'} /></button><button onClick={() => handleShare(activeMedia, 'wa')} className="p-2 rounded-full text-zinc-300" aria-label="Bagikan"><Share2 size={18} /></button></div>
              </div>
              <div className="w-full flex-grow bg-white pb-20">
                <div className="w-full bg-[#030712] relative h-[38vh] sm:h-[48vh] md:h-[58vh] lg:h-[65vh] overflow-hidden flex items-center justify-center border-b border-slate-900/40">
                  {activeMedia.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-black">
                      {getYouTubeID(activeMedia.url) ? <iframe key={activeMedia.id} className="w-full h-full max-h-screen border-0" src={getEmbedUrl(activeMedia.url)} title={activeMedia.title || 'Video galeri'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /> : <video key={activeMedia.id} src={activeMedia.url} className="w-full h-full max-h-screen object-contain" controls autoPlay playsInline preload="metadata" />}
                    </div>
                  ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-[#030712]">
                      {currentImage && <img key={currentImage} src={getOptimizedImageUrl(currentImage, 1200)} alt={activeMedia.title || ''} loading="eager" decoding="async" className="max-w-full max-h-full object-contain block" referrerPolicy="no-referrer" />}
                      {images.length > 1 && <><button onClick={() => setActiveImgIndex(index => index === 0 ? images.length - 1 : index - 1)} className="absolute left-3.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white z-20" aria-label="Foto sebelumnya"><ChevronLeft size={18} /></button><button onClick={() => setActiveImgIndex(index => index === images.length - 1 ? 0 : index + 1)} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white z-20" aria-label="Foto berikutnya"><ChevronRight size={18} /></button><div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/30 px-3 py-1.5 rounded-full">{images.map((_, index) => <button key={index} onClick={() => setActiveImgIndex(index)} aria-label={`Foto ${index + 1}`} className={`h-1.5 rounded-full ${activeImgIndex === index ? 'w-6 bg-blue-500' : 'w-1.5 bg-white/50'}`} />)}</div></>}
                    </div>
                  )}
                  {filteredMedia.length > 1 && <><button onClick={() => changeMedia(-1)} className="absolute left-3.5 bottom-3.5 py-2 px-3 rounded-lg bg-black/60 text-white z-30 flex items-center gap-1 text-[10px] font-black uppercase" aria-label="Media sebelumnya"><ChevronLeft size={15} /><span className="hidden sm:inline">Sebelumnya</span></button><button onClick={() => changeMedia(1)} className="absolute right-3.5 bottom-3.5 py-2 px-3 rounded-lg bg-black/60 text-white z-30 flex items-center gap-1 text-[10px] font-black uppercase" aria-label="Media selanjutnya"><span className="hidden sm:inline">Selanjutnya</span><ChevronRight size={15} /></button></>}
                </div>
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
                  <div className="flex flex-wrap gap-2 mb-4"><span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xs">GALERI DOKUMENTASI</span><span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-xs">{activeMedia.category || 'DOKUMENTASI'}</span></div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] mb-4 uppercase leading-tight">{activeMedia.title}</h1>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-gray-100 pb-4 mb-6"><span>{activeMedia.created_at ? new Date(activeMedia.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}</span><span>|</span><span>{activeMedia.type}</span><span>|</span><button onClick={event => handleLike(event, activeMedia.id)} className="flex items-center gap-1.5"><Heart size={14} fill={likedItems.has(activeMedia.id) ? 'currentColor' : 'none'} />{likedItems.has(activeMedia.id) ? 'DISUKAI' : 'SUKAI'}</button></div>
                  <div className="bg-slate-50 border-l-4 border-blue-600 p-5 rounded-r-2xl mb-8"><p className="text-slate-700 text-sm sm:text-base leading-relaxed italic font-medium">"{activeMedia.description || 'Tidak ada deskripsi tambahan.'}"</p></div>
                  {images.length > 1 && <div className="mt-8 pt-6 border-t border-gray-100"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4">SEMUA FOTO DALAM ALBUM INI</h3><div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">{images.map((img, index) => <button key={img + index} onClick={() => setActiveImgIndex(index)} className={`group relative aspect-[4/3] sm:aspect-[3/2] rounded-xl overflow-hidden border ${activeImgIndex === index ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100/60'}`}><img src={getOptimizedImageUrl(img, 400)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover block" referrerPolicy="no-referrer" /><span className="absolute bottom-2 right-2 bg-black/65 text-white text-[9px] font-black px-1.5 py-0.5 rounded">FOTO {index + 1}</span></button>)}</div></div>}
                  <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4"><div className="text-center sm:text-left"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Bagikan Dokumentasi Ini</p><p className="text-xs text-slate-500 font-medium">Bagikan momen luar biasa klub PB Bilibili 162 ini kepada kerabat Anda</p></div><div className="flex flex-wrap gap-2"><button onClick={() => handleShare(activeMedia, 'wa')} className="w-9 h-9 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-md" title="WhatsApp"><Share2 size={16} /></button><button onClick={() => handleShare(activeMedia, 'fb')} className="w-9 h-9 bg-[#1877F2] text-white rounded-full flex items-center justify-center font-extrabold text-sm" title="Facebook">f</button><button onClick={() => handleShare(activeMedia, 'copy')} className="flex items-center gap-2 px-4 h-9 bg-white text-slate-700 rounded-full border border-slate-200 text-xs font-bold uppercase"><Link2 size={14} />{copySuccess === activeMedia.id ? 'Salin Berhasil!' : 'Salin Tautan'}</button></div></div>
                  <div className="mt-16 pb-10"><button onClick={() => setSelectedId(null)} className="w-full sm:w-auto px-6 py-3 bg-[#0b1224] text-white rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"><ArrowLeft size={16} /> Kembali ke Galeri</button></div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </section>
  );
}
