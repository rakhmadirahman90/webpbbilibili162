import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Image as ImageIcon,
  Loader2,
  PlayCircle,
  Search,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GalleryItem {
  id: string;
  title?: string | null;
  type?: string | null;
  url?: string | null;
  thumbnail_url?: string | null;
  category?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
}

const LOAD_TIMEOUT_MS = 12000;
const ITEMS_PER_PAGE = 6;

function normalizeType(value: unknown): 'image' | 'video' | null {
  const type = String(value ?? '').trim().toLowerCase();
  if (type === 'image' || type === 'photo' || type === 'foto') return 'image';
  if (type === 'video') return 'video';
  return null;
}

function splitUrls(value: unknown): string[] {
  if (!value) return [];
  return String(value)
    .split(/[\s,]+/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([^#&?\s/]+)/i,
  );
  return match?.[1]?.length === 11 ? match[1] : null;
}

function getPreviewUrl(item: GalleryItem): string | null {
  const type = normalizeType(item.type);
  const urls = splitUrls(item.url);
  if (type === 'video') {
    const youtubeId = getYouTubeId(urls[0] ?? '');
    if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    return item.thumbnail_url || urls[0] || null;
  }
  return urls[0] || item.thumbnail_url || null;
}

function getImageUrls(item: GalleryItem): string[] {
  return splitUrls(item.url).filter((url) => !/^https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(url));
}

export default function Gallery() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  const fetchGallery = async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const queryPromise = supabase
        .from('gallery')
        .select('*')
        .order('created_at', { ascending: false });

      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('Waktu tunggu koneksi galeri habis.')), LOAD_TIMEOUT_MS);
      });

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) throw error;

      const rows = Array.isArray(data) ? (data as GalleryItem[]) : [];
      const normalizedRows = rows.filter((item) => normalizeType(item.type) !== null && Boolean(item.url));
      setGalleryItems(normalizedRows);
    } catch (error) {
      console.error('[Gallery] direct public.gallery load failed:', error);
      setGalleryItems([]);
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Galeri gagal dimuat dari database.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem('pb_us_liked_gallery');
      if (savedLikes) setLikedItems(new Set(JSON.parse(savedLikes)));
    } catch {
      // Ignore malformed local likes.
    }

    fetchGallery();

    const handleUpdate = () => fetchGallery();
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('table_updated_gallery', handleUpdate);

    const channel = supabase
      .channel('public_gallery_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gallery' },
        () => fetchGallery(),
      )
      .subscribe();

    return () => {
      window.removeEventListener('app_data_changed', handleUpdate);
      window.removeEventListener('table_updated_gallery', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    const urlId = searchParams.get('gallery') || searchParams.get('galleryId') || searchParams.get('photoId') || searchParams.get('videoId');
    if (!urlId) return;
    const found = galleryItems.find((item) => item.id === urlId);
    if (found) {
      const type = normalizeType(found.type);
      if (type) setActiveTab(type);
      setSelectedId(found.id);
      setActiveImgIndex(0);
    }
  }, [galleryItems, searchParams]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    if (selectedId) {
      window.dispatchEvent(new CustomEvent('pb-overlay-open'));
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('gallery', selectedId);
        ['galleryId', 'photoId', 'videoId'].forEach((key) => next.delete(key));
        return next;
      }, { replace: true });
    } else {
      window.dispatchEvent(new CustomEvent('pb-overlay-close'));
      if (searchParams.get('gallery') || searchParams.get('galleryId') || searchParams.get('photoId') || searchParams.get('videoId')) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          ['gallery', 'galleryId', 'photoId', 'videoId'].forEach((key) => next.delete(key));
          return next;
        }, { replace: true });
      }
    }
  }, [selectedId]);

  const toggleLike = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    const next = new Set(likedItems);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLikedItems(next);
    localStorage.setItem('pb_us_liked_gallery', JSON.stringify(Array.from(next)));
  };

  const filteredMedia = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return galleryItems.filter((item) => {
      if (normalizeType(item.type) !== activeTab) return false;
      if (!query) return true;
      return (
        String(item.title ?? '').toLowerCase().includes(query) ||
        String(item.category ?? '').toLowerCase().includes(query)
      );
    });
  }, [galleryItems, activeTab, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredMedia.length / ITEMS_PER_PAGE));
  const paginatedMedia = filteredMedia.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const activeMedia = selectedId ? galleryItems.find((item) => item.id === selectedId) : null;
  const activeImages = activeMedia ? getImageUrls(activeMedia) : [];

  return (
    <section id="gallery" className="bg-[#f8fafc] pb-24 pt-10 md:pt-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-5 mb-8 md:mb-12">
          <div className="inline-flex bg-white p-1.5 rounded-full border border-slate-200/80 shadow-sm shrink-0">
            <button
              onClick={() => setActiveTab('image')}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full font-black text-xs tracking-wider transition-all ${activeTab === 'image' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <ImageIcon size={16} /> FOTO
            </button>
            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-6 sm:px-8 py-3 rounded-full font-black text-xs tracking-wider transition-all ${activeTab === 'video' ? 'bg-[#1e293b] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <PlayCircle size={16} /> VIDEO
            </button>
          </div>

          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Cari ${activeTab === 'image' ? 'foto' : 'video'} galeri...`}
              className="w-full pl-11 pr-10 py-3.5 bg-white border border-slate-200 rounded-full text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="animate-spin mb-4 text-emerald-500" size={40} />
            <p className="font-bold uppercase tracking-widest text-[10px]">Memuat Galeri dari Database...</p>
            <p className="mt-2 text-[11px] text-slate-400">public.gallery</p>
          </div>
        ) : loadError ? (
          <div className="py-20 px-6 text-center border border-rose-200 border-dashed rounded-xl bg-white">
            <h4 className="text-slate-800 font-extrabold uppercase tracking-wider text-sm mb-2">Galeri Gagal Dimuat</h4>
            <p className="text-slate-500 text-xs mb-5">{loadError}</p>
            <button onClick={fetchGallery} className="px-5 py-2.5 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-700">
              Coba Lagi
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence mode="popLayout">
                {paginatedMedia.length > 0 ? paginatedMedia.map((item, index) => {
                  const preview = getPreviewUrl(item);
                  const liked = likedItems.has(item.id);
                  const type = normalizeType(item.type);
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      onClick={() => { setSelectedId(item.id); setActiveImgIndex(0); }}
                      className="group relative cursor-pointer overflow-hidden rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col shadow-sm"
                    >
                      <div className="aspect-[1.5/1] relative overflow-hidden bg-slate-100">
                        {preview ? (
                          <img
                            src={preview}
                            alt={String(item.title ?? 'Galeri PB Bilibili 162')}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            onError={(event) => {
                              const youtubeId = getYouTubeId(String(item.url ?? ''));
                              if (youtubeId && event.currentTarget.src.includes('hqdefault')) {
                                event.currentTarget.src = `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <ImageIcon size={36} />
                          </div>
                        )}
                        <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-sm">
                          {String(item.category ?? 'DOKUMENTASI')}
                        </div>
                        <button
                          onClick={(event) => toggleLike(event, item.id)}
                          className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md z-10 ${liked ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-500 hover:text-rose-500'}`}
                          aria-label="Sukai galeri"
                        >
                          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
                        </button>
                        <div className="absolute bottom-3 right-4 w-11 h-11 bg-[#22c55e] text-white rounded-full flex items-center justify-center shadow-lg">
                          {type === 'video' ? <PlayCircle size={19} /> : <ImageIcon size={18} />}
                        </div>
                      </div>
                      <div className="p-6 flex flex-col flex-grow">
                        <div className="text-slate-400 text-[10px] mb-2 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                          <Calendar size={12} />
                          {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}
                        </div>
                        <h3 className="text-slate-900 text-base font-black leading-snug uppercase line-clamp-2 mb-4 group-hover:text-[#22c55e] transition-colors">
                          {String(item.title ?? 'Dokumentasi PB Bilibili 162')}
                        </h3>
                        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            {type === 'video' ? 'VIDEO MULTIMEDIA' : 'PHOTO GALLERY'}
                          </span>
                          <div className="flex items-center gap-3 text-slate-400">
                            <div className="flex items-center gap-1"><Heart size={13} fill={liked ? 'currentColor' : 'none'} className={liked ? 'text-rose-500' : ''} /><span className="text-[10px] font-bold">{liked ? 1 : 0}</span></div>
                            <div className="flex items-center gap-1"><Eye size={13} /><span className="text-[10px] font-bold">1</span></div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : (
                  <div className="col-span-full py-20 px-6 text-center border border-slate-200 border-dashed rounded-xl bg-white">
                    <div className="w-16 h-16 mx-auto rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                      <Search size={24} />
                    </div>
                    <h4 className="text-slate-800 font-extrabold uppercase tracking-wider text-sm mb-2">
                      {searchQuery ? 'Tidak Ada Hasil Ditemukan' : `Belum Ada ${activeTab === 'image' ? 'Foto' : 'Video'}`}
                    </h4>
                    <p className="text-slate-400 text-xs">Data ditampilkan langsung dari tabel <b>public.gallery</b>.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12 pb-6">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} className="w-10 h-10 rounded border border-slate-200 bg-white disabled:opacity-40 flex items-center justify-center"><ChevronLeft size={16} /></button>
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button key={page} onClick={() => setCurrentPage(page)} className={`w-10 h-10 rounded text-xs font-bold ${currentPage === page ? 'bg-[#facc15] text-white' : 'border border-slate-200 bg-white text-slate-700'}`}>{page}</button>
                ))}
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} className="w-10 h-10 rounded border border-slate-200 bg-white disabled:opacity-40 flex items-center justify-center"><ChevronRight size={16} /></button>
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {activeMedia && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/90 p-4 md:p-8 flex items-center justify-center" onClick={() => setSelectedId(null)}>
            <button onClick={() => setSelectedId(null)} className="absolute top-5 right-5 z-20 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center"><X size={22} /></button>
            <div className="w-full max-w-6xl max-h-[92vh] overflow-auto" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-4 mb-4 text-white">
                <div><p className="text-xs uppercase tracking-widest text-white/60">{String(activeMedia.category ?? 'DOKUMENTASI')}</p><h2 className="text-lg md:text-2xl font-black uppercase">{String(activeMedia.title ?? 'Galeri')}</h2></div>
                <button onClick={() => setSelectedId(null)} className="hidden md:flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-full bg-white/10"><ArrowLeft size={15} /> Kembali</button>
              </div>
              {normalizeType(activeMedia.type) === 'video' ? (
                getYouTubeId(String(activeMedia.url ?? '')) ? (
                  <div className="aspect-video bg-black rounded-xl overflow-hidden"><iframe className="w-full h-full" src={`https://www.youtube.com/embed/${getYouTubeId(String(activeMedia.url ?? ''))}?autoplay=1&rel=0`} title={String(activeMedia.title ?? 'Video')} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>
                ) : (
                  <video src={splitUrls(activeMedia.url)[0]} controls autoPlay className="w-full max-h-[75vh] rounded-xl bg-black" />
                )
              ) : activeImages.length > 0 ? (
                <div className="relative">
                  <img src={activeImages[activeImgIndex] || activeImages[0]} alt={String(activeMedia.title ?? 'Foto galeri')} className="w-full max-h-[75vh] object-contain rounded-xl bg-black" />
                  {activeImages.length > 1 && <>
                    <button onClick={() => setActiveImgIndex((index) => index === 0 ? activeImages.length - 1 : index - 1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronLeft /></button>
                    <button onClick={() => setActiveImgIndex((index) => (index + 1) % activeImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 text-white flex items-center justify-center"><ChevronRight /></button>
                  </>}
                </div>
              ) : null}
              <div className="mt-4 text-center text-xs text-white/50">Sumber: public.gallery · {activeImages.length || 1} media</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
