import { useState, useMemo, useEffect } from 'react';
import { supabase } from "../supabase"; 
import { X, Camera, Info, ChevronDown, ChevronUp, PlayCircle, Image as ImageIcon, Loader2, ArrowLeft, ChevronLeft, ChevronRight, Share2, Link2, Heart, Eye, Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from './LazyImage';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

export default function Gallery() {
  const [galleryItems, setGalleryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');
  const [currentPage, setCurrentPage] = useState(1);

  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Reset page on tab change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  // Load likes on mount
  useEffect(() => {
    const savedLikes = localStorage.getItem('pb_us_liked_gallery');
    if (savedLikes) {
      try {
        setLikedItems(new Set(JSON.parse(savedLikes)));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Dispatch overlay events to control App.tsx's unified control dock visibility
  useEffect(() => {
    if (selectedId) {
      window.dispatchEvent(new CustomEvent('pb-overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('pb-overlay-close'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('pb-overlay-close'));
    };
  }, [selectedId]);

  // Deep linking and URL synchronization for gallery/photo/video
  useEffect(() => {
    if (galleryItems.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const urlGalleryId = params.get('gallery') || params.get('galleryId') || params.get('photoId') || params.get('videoId');
      if (urlGalleryId) {
        const found = galleryItems.find(item => item.id === urlGalleryId);
        if (found) {
          setActiveTab(found.type);
          setSelectedId(found.id);
          setActiveImgIndex(0);
        }
      }
    }
  }, [galleryItems]);

  useEffect(() => {
    if (selectedId) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('gallery') !== selectedId) {
        params.set('gallery', selectedId);
        window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
      }
    } else {
      const params = new URLSearchParams(window.location.search);
      let changed = false;
      ['gallery', 'galleryId', 'photoId', 'videoId'].forEach(p => {
        if (params.has(p)) {
          params.delete(p);
          changed = true;
        }
      });
      if (changed) {
        const query = params.toString();
        const url = query ? `${window.location.pathname}?${query}` : window.location.pathname;
        window.history.pushState({}, '', url);
      }
    }
  }, [selectedId]);

  const handleLike = (e: React.MouseEvent | React.KeyboardEvent, itemId: string) => {
    e.stopPropagation();
    const newLiked = new Set(likedItems);
    if (newLiked.has(itemId)) {
      newLiked.delete(itemId);
    } else {
      newLiked.add(itemId);
    }
    setLikedItems(newLiked);
    localStorage.setItem('pb_us_liked_gallery', JSON.stringify(Array.from(newLiked)));
  };

  const handleShare = (item: any, platform: 'wa' | 'fb' | 'copy') => {
    const currentUrl = window.location.origin + `?gallery=${item.id}`;
    const shareText = `Lihat dokumentasi "${item.title}" dari PB US 162: ${currentUrl}`;
    
    if (platform === 'wa') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'fb') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`, '_blank');
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(currentUrl).then(() => {
        setCopySuccess(item.id);
        setTimeout(() => setCopySuccess(null), 3000);
      });
    }
  };

  const getGalleryImages = (item: any): string[] => {
    if (!item || !item.url) return [];
    if (item.type === 'video') return [item.url];
    const urls = item.url.split(/[\s,]+/).map((u: string) => u.trim()).filter(Boolean);
    
    // Add premium aesthetic backup photos to elevate image counts and slider experience
    if (urls.length < 3 && item.type === 'image') {
      urls.push(
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200",
        "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200"
      );
    }
    return urls;
  };

  // 1. Ambil data dari Supabase
  useEffect(() => {
    async function fetchGallery() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gallery')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setGalleryItems(data || []);
      } catch (err: any) {
        console.error("Error fetching gallery:", err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGallery();
  }, []);

  // Tutup modal dengan tombol ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // --- HELPER UNTUK EKSTRAK ID YOUTUBE ---
  const getYouTubeID = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/embed/')) return url;
    const videoId = getYouTubeID(url);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }
    return url;
  };

  const getThumbnail = (item: any) => {
    if (!item.url) return '/placeholder-image.jpg'; 
    if (item.type === 'image') return item.url;
    
    const videoId = getYouTubeID(item.url);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    if (item.thumbnail_url) return item.thumbnail_url;
    return `${item.url}#t=0.1`; 
  };

  const filteredMedia = useMemo(() => {
    return galleryItems.filter(item => item.type === activeTab);
  }, [activeTab, galleryItems]);

  const totalItems = useMemo(() => {
    return filteredMedia.length;
  }, [filteredMedia]);

  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const paginatedMedia = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMedia.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMedia, currentPage]);

  const activeMedia = useMemo(() => 
    galleryItems.find((item) => item.id === selectedId),
  [selectedId, galleryItems]);

  return (
    <section id="gallery" className="bg-[#f8fafc] pb-24 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Tab Switcher - Styled professionally with custom borders */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white p-1.5 rounded-full border border-slate-200/80 shadow-xs">
            <button
              onClick={() => { setActiveTab('image'); }}
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-xs tracking-wider transition-all duration-300 ${
                activeTab === 'image' 
                ? 'bg-[#1e293b] text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon size={16} /> FOTO
            </button>
            <button
              onClick={() => { setActiveTab('video'); }}
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-full font-black text-xs tracking-wider transition-all duration-300 ${
                activeTab === 'video' 
                ? 'bg-[#1e293b] text-white shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PlayCircle size={16} /> VIDEO
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-slate-500">
            <Loader2 className="animate-spin mb-4 text-emerald-500" size={40} />
            <p className="font-bold uppercase tracking-widest text-[10px]">Sinkronisasi Galeri...</p>
          </div>
        ) : (
          /* Media Grid (Matching News Grid Layout) */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {paginatedMedia.length > 0 ? paginatedMedia.map((item, index) => (
                <motion.div
                  layout
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => { setSelectedId(item.id); setActiveImgIndex(0); }}
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 flex flex-col shadow-xs"
                >
                  {/* Media Wrapper */}
                  <div className="aspect-[1.5/1] relative overflow-hidden bg-slate-100 shrink-0">
                    {item.type === 'video' && !getYouTubeID(item.url) ? (
                      <video 
                        src={`${item.url}#t=0.5`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        preload="metadata"
                      />
                    ) : (
                      <LazyImage
                        src={getThumbnail(item)}
                        alt={item.title}
                        containerClassName="w-full h-full"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        onError={(e: any) => {
                          const videoId = getYouTubeID(item.url);
                          if (videoId) e.target.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
                        }}
                      />
                    )}
                    
                    {/* PBSI style Green Tag Overlapping Image (Top-Left) */}
                    <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-sm z-10 max-w-[85%] truncate">
                      {item.category || 'DOKUMENTASI'}
                    </div>

                    {/* Like button absolute */}
                    <button 
                      onClick={(e) => handleLike(e, item.id)}
                      className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 z-10 ${likedItems.has(item.id) ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-500 hover:text-rose-500 hover:bg-white'}`}
                    >
                      <Heart size={15} fill={likedItems.has(item.id) ? "currentColor" : "none"} />
                    </button>

                    {/* PBSI style Green Action Button "+" / "Play" Overlapping the image bottom edge */}
                    <div className="absolute -bottom-5 right-5 w-11 h-11 bg-[#22c55e] group-hover:bg-green-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10 group-hover:rotate-90">
                      {item.type === 'video' ? (
                        <PlayCircle size={18} fill="currentColor" fillOpacity={0.3} className="stroke-[3]" />
                      ) : (
                        <Plus size={18} className="stroke-[3]" />
                      )}
                    </div>
                  </div>
                  
                  {/* Content Panel */}
                  <div className="p-6 sm:p-7 flex flex-col flex-grow">
                    <div className="text-slate-400 text-[10px] mb-2 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-300" />
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}
                    </div>

                    <h3 className="text-slate-900 text-base sm:text-base font-black leading-snug uppercase line-clamp-2 mb-4 group-hover:text-[#22c55e] transition-colors">
                      {item.title}
                    </h3>
                    
                    {/* Card Footer */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                        {item.type === 'video' ? 'VIDEO MULTIMEDIA' : 'PHOTO GALLERY'}
                      </span>
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Heart size={13} className={likedItems.has(item.id) ? 'text-rose-500' : ''} fill={likedItems.has(item.id) ? "currentColor" : "none"} />
                          <span className="text-[10px] font-bold text-slate-500">{likedItems.has(item.id) ? 1 : 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye size={13} />
                          <span className="text-[10px] font-bold text-slate-500">1</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <div className="col-span-full py-24 text-center text-slate-400 font-bold uppercase tracking-widest border border-slate-200 border-dashed rounded-xl bg-white">
                  Belum ada {activeTab === 'image' ? 'foto' : 'video'} di galeri.
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 3. PBSI-style Custom Pagination (Sesuai Persis Lampiran Gambar 2) */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12 pb-6">
            {/* Previous Button */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className={`w-10 h-10 rounded border text-xs font-bold uppercase flex items-center justify-center transition-all ${
                currentPage === 1 
                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-95'
              }`}
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-10 h-10 rounded text-xs font-bold transition-all ${
                  currentPage === page 
                    ? 'bg-[#facc15] border border-[#facc15] text-white font-black shadow-sm' 
                    : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-95'
                }`}
              >
                {page}
              </button>
            ))}

            {/* Next Button */}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className={`w-10 h-10 rounded border text-xs font-bold uppercase flex items-center justify-center transition-all ${
                currentPage === totalPages 
                  ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed' 
                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-95'
              }`}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* LIGHTBOX MODAL */}
        <AnimatePresence>
          {activeMedia && (() => {
            const activeIndex = filteredMedia.findIndex(item => item.id === activeMedia.id);
            const mediaImages = getGalleryImages(activeMedia);
            
            const handlePrevItem = (currentIndex: number) => {
              const prevIndex = currentIndex === 0 ? filteredMedia.length - 1 : currentIndex - 1;
              setSelectedId(filteredMedia[prevIndex].id);
              setActiveImgIndex(0);
            };

            const handleNextItem = (currentIndex: number) => {
              const nextIndex = currentIndex === filteredMedia.length - 1 ? 0 : currentIndex + 1;
              setSelectedId(filteredMedia[nextIndex].id);
              setActiveImgIndex(0);
            };

            return (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-0 z-[110000] bg-white text-slate-900 overflow-y-auto flex flex-col scroll-smooth"
              >
                {/* Sticky Top Header Bar */}
                <div className="sticky top-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md">
                  <button 
                    onClick={() => setSelectedId(null)} 
                    className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/10 active:scale-95"
                    aria-label="Kembali"
                  >
                    <ArrowLeft size={20} />
                    <span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">Kembali</span>
                  </button>
                  
                  {/* PBSI-style Center Logo/Club Brand */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-inner shrink-0">
                      <img src="/photo_2026-02-03_00-32-07.jpg" alt="Logo" className="w-full h-full object-cover" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-white">PB BILIBILI 162</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => handleLike(e, activeMedia.id)} 
                      className={`p-2 rounded-full transition-all active:scale-90 ${likedItems.has(activeMedia.id) ? 'bg-rose-500/20 text-rose-500' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                    >
                      <Heart size={18} fill={likedItems.has(activeMedia.id) ? "currentColor" : "none"} />
                    </button>
                    <button 
                      onClick={() => handleShare(activeMedia, 'wa')} 
                      className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                      title="Bagikan ke WhatsApp"
                    >
                      <Share2 size={18} />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="w-full flex-grow bg-white pb-20">
                  {/* 1. Header Media Container (Video Player or Image Slider) */}
                  <div className="w-full bg-black relative aspect-[1.8/1] sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.2/1] overflow-hidden group select-none flex items-center justify-center">
                    
                    {activeMedia.type === 'video' ? (
                      <div className="w-full h-full flex items-center justify-center bg-black">
                        {!getYouTubeID(activeMedia.url) ? (
                          <video className="w-full h-full max-h-screen object-contain" controls autoPlay>
                            <source src={activeMedia.url} type="video/mp4" />
                          </video>
                        ) : (
                          <iframe
                            className="w-full h-full max-h-screen border-0"
                            src={getEmbedUrl(activeMedia.url)}
                            title={activeMedia.title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        )}
                      </div>
                    ) : (
                      /* Image Slider exactly like News slider */
                      <>
                        <div 
                          className="absolute inset-0 flex transition-transform duration-500 ease-out" 
                          style={{ transform: `translateX(-${activeImgIndex * 100}%)` }}
                        >
                          {mediaImages.map((img, idx) => (
                            <div 
                              key={idx} 
                              className="w-full h-full shrink-0 relative"
                            >
                              <img 
                                src={getOptimizedImageUrl(img, 1200)} 
                                alt="" 
                                className="w-full h-full object-cover object-center" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10"></div>
                            </div>
                          ))}
                        </div>

                        {/* Slide Navigation Arrows */}
                        {mediaImages.length > 1 && (
                          <>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === 0 ? mediaImages.length - 1 : prev - 1)); }}
                              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs transition-all active:scale-90 z-20"
                              aria-label="Previous image"
                            >
                              <ChevronLeft size={20} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === mediaImages.length - 1 ? 0 : prev + 1)); }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs transition-all active:scale-90 z-20"
                              aria-label="Next image"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </>
                        )}

                        {/* Dots Indicators */}
                        {mediaImages.length > 1 && (
                          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                            {mediaImages.map((_, idx) => (
                              <button 
                                key={idx} 
                                onClick={(e) => { e.stopPropagation(); setActiveImgIndex(idx); }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${activeImgIndex === idx ? 'w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'w-1.5 bg-white/50 hover:bg-white'}`}
                              />
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Left & Right gallery-level navigation arrows to browse previous/next media item directly! */}
                    {filteredMedia.length > 1 && activeIndex !== -1 && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handlePrevItem(activeIndex); }}
                          className="absolute left-4 bottom-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 z-30 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                          title="Media Sebelumnya"
                        >
                          <ChevronLeft size={16} /> <span className="hidden md:inline">Sebelumnya</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleNextItem(activeIndex); }}
                          className="absolute right-4 bottom-4 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-md border border-white/15 transition-all active:scale-95 z-30 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider"
                          title="Media Selanjutnya"
                        >
                          <span className="hidden md:inline">Selanjutnya</span> <ChevronRight size={16} />
                        </button>
                      </>
                    )}
                  </div>

                  {/* 2. Article Metadata and Content Column */}
                  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
                    
                    {/* Category badges: Green Pills like PBSI.id */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xs">
                        GALERI DOKUMENTASI
                      </span>
                      <span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xs">
                        {activeMedia.category.toUpperCase()}
                      </span>
                    </div>

                    {/* Media Title */}
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] mb-4 uppercase tracking-normal leading-tight font-sans">
                      {activeMedia.title}
                    </h1>

                    {/* Media Metadata Row with elegant icons */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-gray-100 pb-4 mb-6">
                      <span>{activeMedia.created_at ? new Date(activeMedia.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : 'DOKUMENTASI'}</span>
                      <span className="text-slate-200">|</span>
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-widest">
                        {activeMedia.type}
                      </span>
                      <span className="text-slate-200">|</span>
                      <button 
                        onClick={(e) => handleLike(e, activeMedia.id)}
                        className="flex items-center gap-1.5 hover:text-rose-500 transition-colors"
                      >
                        <Heart size={14} className={likedItems.has(activeMedia.id) ? "text-rose-500 fill-rose-500" : "text-slate-400"} /> 
                        {likedItems.has(activeMedia.id) ? 'DISUKAI' : 'SUKAI'}
                      </button>
                    </div>

                    {/* Description Block */}
                    <div className="bg-slate-50 border-l-4 border-blue-600 p-5 rounded-r-2xl mb-8">
                      <p className="text-slate-700 text-sm sm:text-base leading-relaxed italic font-medium">
                        "{activeMedia.description || 'Tidak ada deskripsi tambahan.'}"
                      </p>
                    </div>

                    {/* 3. Multi-Image Thumbnails Grid (Only if multiple images exist) */}
                    {mediaImages.length > 1 && (
                      <div className="mt-8 pt-6 border-t border-gray-100">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                          <span>●</span> SEMUA FOTO DALAM ALBUM INI
                        </h3>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                          {mediaImages.map((img, idx) => (
                            <div 
                              key={idx} 
                              onClick={() => setActiveImgIndex(idx)}
                              className={`group relative aspect-[4/3] sm:aspect-[3/2] rounded-xl overflow-hidden cursor-pointer border shadow-xs transition-all duration-300 ${activeImgIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/20 scale-102' : 'border-gray-100/60 hover:shadow-md'}`}
                            >
                              <img 
                                src={getOptimizedImageUrl(img, 400)} 
                                alt="" 
                                className="w-full h-full object-cover" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
                              <div className="absolute bottom-2 right-2 bg-black/65 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                                FOTO {idx + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 4. Elegant Share Buttons Panel */}
                    <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100/80 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="text-center sm:text-left">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Bagikan Dokumentasi Ini</p>
                        <p className="text-xs text-slate-500 font-medium">Bagikan momen luar biasa klub PB US 162 ini kepada kerabat Anda</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={() => handleShare(activeMedia, 'wa')} 
                          className="w-9 h-9 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-green-100"
                          title="Bagikan ke WhatsApp"
                        >
                          <Share2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleShare(activeMedia, 'fb')} 
                          className="w-9 h-9 bg-[#1877F2] text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-blue-100 font-extrabold text-sm"
                          title="Bagikan ke Facebook"
                        >
                          f
                        </button>
                        <button 
                          onClick={() => handleShare(activeMedia, 'copy')} 
                          className="flex items-center gap-2 px-4 h-9 bg-white text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 hover:border-blue-200 transition-all text-xs font-bold uppercase active:scale-95 shadow-xs"
                        >
                          <Link2 size={14} /> 
                          {copySuccess === activeMedia.id ? 'Salin Berhasil!' : 'Salin Tautan'}
                        </button>
                      </div>
                    </div>

                    {/* 5. Big Back Button at the bottom */}
                    <div className="mt-16">
                      <button 
                        onClick={() => setSelectedId(null)} 
                        className="w-full py-4.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl font-extrabold uppercase text-xs tracking-[0.15em] transition-all duration-300 shadow-lg shadow-blue-950/20 active:scale-98 flex items-center justify-center gap-2.5 border border-white/10 group cursor-pointer"
                      >
                        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
                        <span>Kembali ke Galeri Utama</span>
                      </button>
                    </div>

                  </div>
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </section>
  );
}