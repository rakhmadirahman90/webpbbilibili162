import { Calendar, ArrowRight, X, ChevronDown, ChevronUp, Loader2, User, Eye, Heart, MessageCircle, Send, Share2, Link2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from './LazyImage';
import PrayerTimes from './PrayerTimes';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

// Interface untuk Komentar
interface Komentar {
  id: string;
  nama_user: string;
  isi_komentar: string;
  tanggal: string;
}

// Definisi tipe data yang diperluas
interface Berita {
  id: string; 
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: string;
  gambar_url: string;
  tanggal: string;
  penulis?: string;
  views: number; // Diubah menjadi wajib number agar tidak NULL
  likes: number; // Diubah menjadi wajib number agar tidak NULL
  comments_count?: number;
}

export default function News() {
  const [beritaList, setBeritaList] = useState<Berita[]>([]);
  const [selectedNews, setSelectedNews] = useState<Berita | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // State Baru untuk Komentar
  const [comments, setComments] = useState<Komentar[]>([]);
  const [newComment, setNewComment] = useState({ nama: '', pesan: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Baru untuk Berbagi
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // State untuk slider gambar & lightbox
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Helper untuk mendapatkan semua gambar dari berita
  const getNewsImages = (news: Berita): string[] => {
    const list: string[] = [];
    if (news.gambar_url) {
      const urls = news.gambar_url.split(/[\s,]+/).map(u => u.trim()).filter(Boolean);
      list.push(...urls);
    }
    
    // Berikan beberapa gambar badminton estetik sebagai tambahan agar selalu memiliki slider interaktif yang menawan
    if (list.length < 3) {
      if (news.judul.toLowerCase().includes('sea games') || news.judul.toLowerCase().includes('alwi') || news.judul.toLowerCase().includes('emas')) {
        list.push(
          "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200",
          "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200"
        );
      } else {
        list.push(
          "https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=1200",
          "https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=1200"
        );
      }
    }
    return list;
  };

  useEffect(() => {
    fetchNews();
    const savedLikes = localStorage.getItem('pb_us_liked_posts');
    if (savedLikes) {
      setLikedPosts(new Set(JSON.parse(savedLikes)));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('pb_us_liked_posts', JSON.stringify(Array.from(likedPosts)));
  }, [likedPosts]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('berita')
        .select(`*, komentar(count)`)
        .order('tanggal', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const formattedData = data.map(item => ({
          ...item,
          comments_count: item.komentar?.[0]?.count || 0,
          likes: Number(item.likes) || 0,
          views: Number(item.views) || 0 // PAKSA MENJADI ANGKA AGAR TIDAK RESET 0
        }));
        setBeritaList(formattedData as Berita[]);
      }
    } catch (err) {
      console.error("Gagal memuat berita:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (beritaId: string) => {
    try {
      const { data, error } = await supabase
        .from('komentar')
        .select('*')
        .eq('berita_id', beritaId)
        .order('tanggal', { ascending: false });
      
      if (!error && data) setComments(data);
    } catch (err) {
      console.error("Gagal memuat komentar:", err);
    }
  };

  // PERBAIKAN UTAMA: Fungsi Open News & Update View Permanen ke Database
  const handleOpenNews = async (news: Berita) => {
    setSelectedNews(news);
    setActiveImgIndex(0); // Reset ke slide pertama
    fetchComments(news.id);
    
    // 1. Hitung angka view baru
    const currentViews = Number(news.views) || 0;
    const updatedViewCount = currentViews + 1;

    // 2. Update UI secara instan (Optimistic Update)
    setBeritaList(prev => prev.map(item => 
      item.id === news.id ? { ...item, views: updatedViewCount } : item
    ));

    // 3. Simpan ke Database secara Permanen agar tidak reset saat refresh
    try {
      const { error } = await supabase
        .from('berita')
        .update({ views: updatedViewCount })
        .eq('id', news.id);

      if (error) throw error;
    } catch (err) {
      console.error("Gagal menyimpan views ke database:", err);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNews || !newComment.nama || !newComment.pesan) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('komentar')
        .insert([{
          berita_id: selectedNews.id,
          nama_user: newComment.nama,
          isi_komentar: newComment.pesan
        }])
        .select();

      if (!error && data) {
        setComments(prev => [data[0], ...prev]);
        setNewComment({ nama: '', pesan: '' });
        
        setBeritaList(prev => prev.map(item => 
          item.id === selectedNews.id ? { ...item, comments_count: (item.comments_count || 0) + 1 } : item
        ));
      }
    } catch (err) {
      alert("Gagal mengirim komentar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (e: React.MouseEvent, newsId: string) => {
    e.stopPropagation(); 
    const isLiked = likedPosts.has(newsId);
    
    const newLikedPosts = new Set(likedPosts);
    if (isLiked) newLikedPosts.delete(newsId);
    else newLikedPosts.add(newsId);
    setLikedPosts(newLikedPosts);

    const newsItem = beritaList.find(n => n.id === newsId);
    const currentLikes = Number(newsItem?.likes) || 0;
    const finalLikeCount = isLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;

    setBeritaList(prev => prev.map(item => 
      item.id === newsId ? { ...item, likes: finalLikeCount } : item
    ));

    if (selectedNews?.id === newsId) {
      setSelectedNews(prev => prev ? { ...prev, likes: finalLikeCount } : null);
    }

    try {
      const { error } = await supabase
        .from('berita')
        .update({ likes: finalLikeCount })
        .eq('id', newsId);

      if (error) throw error;
    } catch (err) {
      console.error("Gagal update likes di database:", err);
      fetchNews();
    }
  };

  const handleShare = async (news: Berita, platform: 'wa' | 'fb' | 'x' | 'copy') => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?newsId=${news.id}`;
    const shareText = `Cek berita terbaru dari PB US 162: "${news.judul}"`;

    switch (platform) {
      case 'wa':
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`, '_blank');
        break;
      case 'fb':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'x':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy':
        try {
          await navigator.clipboard.writeText(shareUrl);
          setCopySuccess(news.id);
          setTimeout(() => setCopySuccess(null), 2000);
        } catch (err) {
          console.error("Gagal menyalin tautan", err);
        }
        break;
    }
  };

  const visibleNews = showAll ? beritaList : beritaList.slice(0, 3);

  if (loading) {
    return (
      <div className="py-20 text-center bg-gray-50">
        <Loader2 className="animate-spin m-auto text-blue-600 mb-4" size={40} />
        <p className="text-gray-500 font-bold uppercase tracking-widest">Memuat Berita Terkini...</p>
      </div>
    );
  }

  return (
    <section id="news" className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-2 italic uppercase tracking-tighter">
            Berita <span className="text-blue-600">Terkini</span>
          </h2>
          <p className="text-sm text-gray-500 font-medium">Update terbaru tentang prestasi dan kegiatan klub PB US 162</p>
        </div>

        {/* RESPONSIVE LAYOUT DUAL COLUMN: BERITA DAN JADWAL SHOLAT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sisi Kiri: Daftar Berita */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {visibleNews.map((news) => (
                <div
                  key={news.id}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col border border-gray-100/80"
                >
                  <div className="relative h-40 sm:h-44 overflow-hidden bg-gray-100">
                    <LazyImage 
                      src={news.gambar_url} 
                      alt={news.judul} 
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700" 
                    />
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">
                      {news.kategori}
                    </div>
                    
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                       <button onClick={() => handleShare(news, 'wa')} className="p-2 bg-green-500 text-white rounded-full hover:scale-110 transition-transform shadow-md"><Share2 size={14} /></button>
                       <button onClick={() => handleShare(news, 'copy')} className="p-2 bg-white text-gray-900 rounded-full hover:scale-110 transition-transform shadow-md">
                          {copySuccess === news.id ? <span className="text-[8px] font-bold px-1.5 text-blue-600">COPIED</span> : <Link2 size={14} />}
                       </button>
                    </div>

                    <button 
                      onClick={(e) => handleLike(e, news.id)}
                      className={`absolute bottom-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 z-10 ${likedPosts.has(news.id) ? 'bg-rose-500 text-white' : 'bg-white/95 text-gray-500 hover:text-rose-500 hover:bg-white'}`}
                    >
                      <Heart size={16} fill={likedPosts.has(news.id) ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="p-4 sm:p-5 flex flex-col flex-grow">
                    <div className="text-gray-400 text-[9px] mb-1.5 font-bold uppercase tracking-widest">{news.tanggal}</div>
                    <h3 
                      onClick={() => handleOpenNews(news)}
                      className="text-sm sm:text-base font-black text-gray-900 mb-2.5 line-clamp-2 italic uppercase leading-tight group-hover:text-blue-600 transition-colors cursor-pointer"
                    >
                      {news.judul}
                    </h3>
                    
                    <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-gray-500">
                        <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 shrink-0"><User size={9} /></div>
                        <span className="text-[8.5px] font-black uppercase tracking-tight truncate max-w-[70px]">{news.penulis || 'ADMIN'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-400">
                        <div className="flex items-center gap-0.5"><Eye size={11} /><span className="text-[9px] font-bold">{news.views || 0}</span></div>
                        <div className="flex items-center gap-0.5"><Heart size={11} className={likedPosts.has(news.id) ? 'text-rose-500' : ''} fill={likedPosts.has(news.id) ? "currentColor" : "none"} /><span className="text-[9px] font-bold">{news.likes || 0}</span></div>
                        <div className="flex items-center gap-0.5"><MessageCircle size={11} /><span className="text-[9px] font-bold">{news.comments_count || 0}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {beritaList.length > 3 && (
              <div className="text-center mt-6">
                <button 
                  onClick={() => setShowAll(!showAll)}
                  className="inline-flex items-center gap-2 bg-gray-900 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg active:scale-95 uppercase text-xs tracking-widest"
                >
                  {showAll ? <><ChevronUp size={18} /> Sembunyikan</> : <>Lihat Semua Berita <ChevronDown size={18} /></>}
                </button>
              </div>
            )}
          </div>

          {/* Sisi Kanan: Jadwal Sholat 5 Waktu (Sembunyi di mobile karena sudah ada di bawah Hero) */}
          <div className="hidden lg:block lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 w-full">
            <PrayerTimes />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedNews && (() => {
          const newsImages = getNewsImages(selectedNews);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-0 z-[100] bg-white overflow-y-auto flex flex-col scroll-smooth"
            >
              {/* Sticky Top Header Bar */}
              <div className="sticky top-0 bg-zinc-950 text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md">
                <button 
                  onClick={() => setSelectedNews(null)} 
                  className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors py-1.5 px-3 rounded-lg hover:bg-white/10 active:scale-95"
                  aria-label="Kembali"
                >
                  <ArrowLeft size={20} />
                  <span className="text-sm font-bold uppercase tracking-wider hidden sm:inline">Kembali</span>
                </button>
                
                {/* PBSI-style Center Logo/Club Brand */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center p-1.5 font-bold text-black text-xs shadow-inner">
                    PB
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white">PB US 162</span>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleLike(e, selectedNews.id)} 
                    className={`p-2 rounded-full transition-all active:scale-90 ${likedPosts.has(selectedNews.id) ? 'bg-rose-500/20 text-rose-500' : 'hover:bg-white/10 text-zinc-400 hover:text-white'}`}
                  >
                    <Heart size={18} fill={likedPosts.has(selectedNews.id) ? "currentColor" : "none"} />
                  </button>
                  <button 
                    onClick={() => handleShare(selectedNews, 'wa')} 
                    className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                    title="Bagikan ke WhatsApp"
                  >
                    <Share2 size={18} />
                  </button>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="w-full flex-grow bg-white pb-20">
                {/* 1. Header Image/Slider (Full-width mobile, structured desktop) */}
                <div className="w-full bg-black relative aspect-[1.8/1] sm:aspect-[2.4/1] md:aspect-[3/1] lg:aspect-[3.2/1] overflow-hidden group select-none">
                  <div 
                    className="absolute inset-0 flex transition-transform duration-500 ease-out" 
                    style={{ transform: `translateX(-${activeImgIndex * 100}%)` }}
                  >
                    {newsImages.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="w-full h-full shrink-0 relative cursor-zoom-in"
                        onClick={() => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
                      >
                        <img 
                          src={getOptimizedImageUrl(img, 1200)} 
                          alt="" 
                          className="w-full h-full object-cover object-center" 
                          referrerPolicy="no-referrer"
                        />
                        {/* Overlay gradient subtle */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10"></div>
                      </div>
                    ))}
                  </div>

                  {/* Left & Right Navigation Arrows */}
                  {newsImages.length > 1 && (
                    <>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === 0 ? newsImages.length - 1 : prev - 1)); }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs transition-all active:scale-90 z-20"
                        aria-label="Previous image"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setActiveImgIndex(prev => (prev === newsImages.length - 1 ? 0 : prev + 1)); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white/90 hover:text-white backdrop-blur-xs transition-all active:scale-90 z-20"
                        aria-label="Next image"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}

                  {/* Dots Indicators at the bottom center of image slider */}
                  {newsImages.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
                      {newsImages.map((_, idx) => (
                        <button 
                          key={idx} 
                          onClick={(e) => { e.stopPropagation(); setActiveImgIndex(idx); }}
                          className={`h-1.5 rounded-full transition-all duration-300 ${activeImgIndex === idx ? 'w-6 bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'w-1.5 bg-white/50 hover:bg-white'}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Zoom Badge Indicator */}
                  <div className="absolute top-4 right-4 bg-black/50 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xs pointer-events-none uppercase tracking-widest z-20">
                    Klik untuk memperbesar
                  </div>
                </div>

                {/* 2. Article Metadata and Content Column */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
                  
                  {/* Category badges: Green Pills like PBSI.id */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xs">
                      BERITA UTAMA
                    </span>
                    <span className="bg-[#22c55e] text-white px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-xs">
                      {selectedNews.kategori.toUpperCase()}
                    </span>
                  </div>

                  {/* News Title: Large, bold, uppercase sans-serif text */}
                  <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-[#0f172a] mb-4 uppercase tracking-normal leading-tight font-sans">
                    {selectedNews.judul}
                  </h1>

                  {/* News Metadata Row with elegant icons */}
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider border-b border-gray-100 pb-4 mb-6">
                    <span>{selectedNews.tanggal}</span>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1.5">
                      <Eye size={14} className="text-slate-400" /> {selectedNews.views || 0} VIEWS
                    </span>
                    <span className="text-slate-200">|</span>
                    <button 
                      onClick={(e) => handleLike(e, selectedNews.id)}
                      className="flex items-center gap-1.5 hover:text-rose-500 transition-colors"
                    >
                      <Heart size={14} className={likedPosts.has(selectedNews.id) ? "text-rose-500 fill-rose-500" : "text-slate-400"} /> 
                      {selectedNews.likes || 0} LIKES
                    </button>
                    <span className="text-slate-200">|</span>
                    <span className="flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-slate-400" /> {comments.length} KOMENTAR
                    </span>
                  </div>

                  {/* Location and Date prefix line */}
                  <div className="text-slate-900 font-bold mb-5 text-sm sm:text-base italic">
                    {selectedNews.penulis || "Humas PB US 162"}, {selectedNews.tanggal} —
                  </div>

                  {/* Article Text Content */}
                  <div className="text-slate-800 text-sm sm:text-base leading-relaxed space-y-5 font-normal font-sans">
                    {selectedNews.konten.split('\n').map((paragraph, idx) => {
                      if (!paragraph.trim()) return null;
                      
                      // Render paragraph
                      return (
                        <p key={idx} className="text-justify whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      );
                    })}
                  </div>

                  {/* 3. Supporting Inline Multi-Image Slider/Gallery Grid */}
                  {newsImages.length > 1 && (
                    <div className="mt-10 pt-8 border-t border-gray-100">
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                        <span>●</span> FOTO DOKUMENTASI TERKAIT
                      </h3>
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
                        {newsImages.map((img, idx) => (
                          <div 
                            key={idx} 
                            onClick={() => { setLightboxIndex(idx); setIsLightboxOpen(true); }}
                            className="group relative aspect-[4/3] sm:aspect-[3/2] rounded-xl overflow-hidden cursor-zoom-in bg-slate-50 border border-gray-100/60 shadow-xs hover:shadow-md transition-all duration-300"
                          >
                            <img 
                              src={getOptimizedImageUrl(img, 500)} 
                              alt="" 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300"></div>
                            {/* Slide Number overlay */}
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
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1.5">Bagikan Berita Ini</p>
                      <p className="text-xs text-slate-500 font-medium">Sebarkan informasi menarik ini kepada rekan klub Anda</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => handleShare(selectedNews, 'wa')} 
                        className="w-9 h-9 bg-[#25D366] text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-green-100"
                        title="Bagikan ke WhatsApp"
                      >
                        <Share2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleShare(selectedNews, 'fb')} 
                        className="w-9 h-9 bg-[#1877F2] text-white rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md shadow-blue-100 font-extrabold text-sm"
                        title="Bagikan ke Facebook"
                      >
                        f
                      </button>
                      <button 
                        onClick={() => handleShare(selectedNews, 'copy')} 
                        className="flex items-center gap-2 px-4 h-9 bg-white text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 hover:border-blue-200 transition-all text-xs font-bold uppercase active:scale-95 shadow-xs"
                      >
                        <Link2 size={14} /> 
                        {copySuccess === selectedNews.id ? 'Salin Berhasil!' : 'Salin Tautan'}
                      </button>
                    </div>
                  </div>

                  {/* 5. Section Komentar with Premium Form */}
                  <div className="mt-12 pt-8 border-t border-gray-100">
                    <h3 className="text-lg sm:text-xl font-black uppercase italic text-slate-900 mb-6 flex items-center gap-2.5">
                      <MessageCircle className="text-blue-600" size={24} /> 
                      Komentar ({comments.length})
                    </h3>

                    {/* Form Input Komentar */}
                    <form onSubmit={handleSubmitComment} className="mb-10 bg-slate-50 p-5 rounded-2xl border border-slate-100/60 shadow-xs">
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <input 
                          type="text" 
                          placeholder="Nama Lengkap Anda" 
                          required
                          className="px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 bg-white outline-none font-bold text-xs sm:text-sm text-slate-800 transition-all placeholder:text-slate-400"
                          value={newComment.nama}
                          onChange={(e) => setNewComment({...newComment, nama: e.target.value})}
                        />
                      </div>
                      <textarea 
                        placeholder="Tulis pesan atau pendapat Anda..." 
                        required
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 bg-white outline-none font-medium text-xs sm:text-sm text-slate-700 min-h-[100px] mb-3 transition-all placeholder:text-slate-400 resize-none"
                        value={newComment.pesan}
                        onChange={(e) => setNewComment({...newComment, pesan: e.target.value})}
                      />
                      <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                      >
                        {isSubmitting ? 'Mengirim...' : <>Kirim Komentar <Send size={12} /></>}
                      </button>
                    </form>

                    {/* List Komentar */}
                    <div className="space-y-6">
                      {comments.length > 0 ? (
                        comments.map((c) => (
                          <div key={c.id} className="flex gap-3 sm:gap-4 border-b border-slate-50 pb-5 last:border-0 last:pb-0">
                            <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-sm shrink-0">
                              {c.nama_user.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-grow">
                              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                                <span className="font-extrabold text-xs sm:text-sm text-slate-900 uppercase tracking-wide">{c.nama_user}</span>
                                {c.nama_user.includes("ADMIN") && (
                                  <span className="bg-blue-600 text-white text-[7px] font-black px-1.5 py-0.5 rounded tracking-widest">OFFICIAL</span>
                                )}
                                <span className="text-[10px] text-slate-400 font-semibold">{new Date(c.tanggal).toLocaleDateString('id-ID')}</span>
                              </div>
                              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium">{c.isi_komentar}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                          <p className="text-slate-400 italic font-semibold text-xs sm:text-sm">Belum ada komentar. Tulis pendapat Anda pertama kali!</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. Big Back Button at the bottom */}
                  <div className="mt-16">
                    <button 
                      onClick={() => setSelectedNews(null)} 
                      className="w-full bg-slate-950 hover:bg-blue-600 text-white py-4 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all transform active:scale-95 shadow-md"
                    >
                      Kembali ke Daftar Berita
                    </button>
                  </div>

                </div>
              </div>

              {/* 7. FULLSCREEN LIGHTBOX SLIDER OVERLAY */}
              <AnimatePresence>
                {isLightboxOpen && (
                  <div className="fixed inset-0 z-[120000] bg-black flex flex-col justify-between p-4 select-none">
                    
                    {/* Lightbox Top Header */}
                    <div className="flex items-center justify-between text-white/80 py-2 px-1 z-[121000]">
                      <span className="text-xs font-black tracking-widest uppercase">
                        FOTO {lightboxIndex + 1} DARI {newsImages.length}
                      </span>
                      <button 
                        onClick={() => setIsLightboxOpen(false)}
                        className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors active:scale-95"
                        aria-label="Tutup"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Lightbox Main Image area */}
                    <div className="relative flex-grow flex items-center justify-center">
                      {newsImages.length > 1 && (
                        <>
                          <button 
                            onClick={() => setLightboxIndex(prev => (prev === 0 ? newsImages.length - 1 : prev - 1))}
                            className="absolute left-2 md:left-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all active:scale-95 z-50 backdrop-blur-xs"
                            aria-label="Sebelumnya"
                          >
                            <ChevronLeft size={24} />
                          </button>
                          <button 
                            onClick={() => setLightboxIndex(prev => (prev === newsImages.length - 1 ? 0 : prev + 1))}
                            className="absolute right-2 md:right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white hover:scale-105 transition-all active:scale-95 z-50 backdrop-blur-xs"
                            aria-label="Selanjutnya"
                          >
                            <ChevronRight size={24} />
                          </button>
                        </>
                      )}

                      <div className="w-full max-w-5xl max-h-[75vh] flex items-center justify-center p-2">
                        <motion.img 
                          key={lightboxIndex}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          src={getOptimizedImageUrl(newsImages[lightboxIndex], 1600)} 
                          alt="" 
                          className="max-w-full max-h-[75vh] object-contain rounded-sm"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    {/* Lightbox Bottom Row of Thumbnails */}
                    {newsImages.length > 1 && (
                      <div className="flex items-center justify-center gap-2 overflow-x-auto py-3 px-2 max-w-full">
                        {newsImages.map((img, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => setLightboxIndex(idx)}
                            className={`w-14 h-10 rounded overflow-hidden shrink-0 border-2 transition-all ${lightboxIndex === idx ? 'border-blue-500 scale-105 opacity-100' : 'border-transparent opacity-45 hover:opacity-85'}`}
                          >
                            <img src={getOptimizedImageUrl(img, 150)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </AnimatePresence>

            </motion.div>
          );
        })()}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </section>
  );
}