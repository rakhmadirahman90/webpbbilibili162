import { Calendar, ArrowRight, X, ChevronDown, ChevronUp, Loader2, User, Eye, Heart, MessageCircle, Send, Share2, Link2, ArrowLeft, ChevronLeft, ChevronRight, Plus, Filter } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [beritaList, setBeritaList] = useState<Berita[]>([]);
  const [selectedNews, setSelectedNews] = useState<Berita | null>(null);
  const [hasInitializedUrlNews, setHasInitializedUrlNews] = useState(false);
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

  // Temporary UI states for filter dropdowns
  const [tempCategory, setTempCategory] = useState('ALL ARTICLES');
  const [tempOrderBy, setTempOrderBy] = useState('ARTICLE DATE');
  const [tempOrderDirection, setTempOrderDirection] = useState('DESCENDING');

  // Committed filter states
  const [selectedCategory, setSelectedCategory] = useState('ALL ARTICLES');
  const [orderBy, setOrderBy] = useState('ARTICLE DATE');
  const [orderDirection, setOrderDirection] = useState('DESCENDING');
  const [currentPage, setCurrentPage] = useState(1);

  // Dropdown open states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOrderByDropdown, setShowOrderByDropdown] = useState(false);
  const [showOrderDirDropdown, setShowOrderDirDropdown] = useState(false);

  // Extract available categories dynamically from beritaList
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    beritaList.forEach(item => {
      if (item.kategori) cats.add(item.kategori.toUpperCase());
    });
    return ['ALL ARTICLES', ...Array.from(cats)];
  }, [beritaList]);

  // Compute filtered news
  const filteredNews = useMemo(() => {
    let result = [...beritaList];

    // Filter by Category
    if (selectedCategory !== 'ALL ARTICLES') {
      result = result.filter(item => item.kategori?.toUpperCase() === selectedCategory.toUpperCase());
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (orderBy === 'ARTICLE DATE') {
        comparison = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      } else if (orderBy === 'POPULARITY') {
        comparison = ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0));
      } else if (orderBy === 'TITLE') {
        comparison = a.judul.localeCompare(b.judul);
      }

      return orderDirection === 'DESCENDING' ? comparison : -comparison;
    });

    return result;
  }, [beritaList, selectedCategory, orderBy, orderDirection]);

  // Pagination calculations
  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredNews.length / itemsPerPage));
  const paginatedNews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNews, currentPage]);

  const handleApplyFilters = () => {
    setSelectedCategory(tempCategory);
    setOrderBy(tempOrderBy);
    setOrderDirection(tempOrderDirection);
    setCurrentPage(1);
    setShowCategoryDropdown(false);
    setShowOrderByDropdown(false);
    setShowOrderDirDropdown(false);
  };

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

  // Dispatch overlay events to control App.tsx's unified control dock visibility
  useEffect(() => {
    if (selectedNews) {
      window.dispatchEvent(new CustomEvent('pb-overlay-open'));
    } else {
      window.dispatchEvent(new CustomEvent('pb-overlay-close'));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('pb-overlay-close'));
    };
  }, [selectedNews]);

  // Stage 1: Load query parameter once on mount when beritaList has finished loading
  useEffect(() => {
    if (beritaList.length > 0 && !hasInitializedUrlNews) {
      const urlNewsId = searchParams.get('newsId');
      if (urlNewsId) {
        const found = beritaList.find(item => item.id === urlNewsId);
        if (found) {
          handleOpenNews(found);
          setTimeout(() => {
            const element = document.getElementById('berita-section');
            if (element) {
              element.scrollIntoView({ behavior: 'smooth' });
            }
          }, 300);
        }
      }
      setHasInitializedUrlNews(true);
    }
  }, [beritaList, searchParams, hasInitializedUrlNews]);

  // Stage 2: Reactively synchronize state changes with URL query parameters
  useEffect(() => {
    if (!hasInitializedUrlNews) return;

    const urlNewsId = searchParams.get('newsId');
    if (selectedNews) {
      if (urlNewsId !== selectedNews.id) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set('newsId', selectedNews.id);
          return next;
        }, { replace: true });
      }
    } else {
      if (urlNewsId) {
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.delete('newsId');
          return next;
        }, { replace: true });
      }
    }
  }, [selectedNews, hasInitializedUrlNews, searchParams, setSearchParams]);

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

  return (
    <section id="news" className="bg-[#f8fafc] pb-24 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* RESPONSIVE LAYOUT DUAL COLUMN: FILTERS + NEWS AND SIDEBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Sisi Kiri: Filter Panel (Sesuai Persis Lampiran Gambar 1) */}
          <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24 space-y-6">
            <div className="bg-white border border-slate-100 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <Filter size={18} className="text-[#22c55e]" />
                <h3 className="font-black text-xs uppercase tracking-widest text-[#0f172a]">Saring Berita</h3>
              </div>

              <div className="space-y-5">
                {/* 1. Category Selector */}
                <div className="relative">
                  <span className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">CATEGORY</span>
                  <button
                    onClick={() => {
                      setShowCategoryDropdown(!showCategoryDropdown);
                      setShowOrderByDropdown(false);
                      setShowOrderDirDropdown(false);
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-3.5 text-left transition-all"
                  >
                    <span className="font-extrabold text-xs text-[#0f172a] uppercase">{tempCategory}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showCategoryDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showCategoryDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-xl z-30 max-h-52 overflow-y-auto"
                      >
                        {availableCategories.map(cat => (
                          <button
                            key={cat}
                            onClick={() => {
                              setTempCategory(cat);
                              setShowCategoryDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors hover:bg-slate-50 ${tempCategory === cat ? 'text-[#22c55e] bg-emerald-50/50' : 'text-slate-700'}`}
                          >
                            {cat}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 2. Order By Selector */}
                <div className="relative">
                  <span className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">ORDER BY</span>
                  <button
                    onClick={() => {
                      setShowOrderByDropdown(!showOrderByDropdown);
                      setShowCategoryDropdown(false);
                      setShowOrderDirDropdown(false);
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-3.5 text-left transition-all"
                  >
                    <span className="font-extrabold text-xs text-[#0f172a] uppercase">{tempOrderBy}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showOrderByDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showOrderByDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-xl z-30"
                      >
                        {['ARTICLE DATE', 'POPULARITY', 'TITLE'].map(item => (
                          <button
                            key={item}
                            onClick={() => {
                              setTempOrderBy(item);
                              setShowOrderByDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors hover:bg-slate-50 ${tempOrderBy === item ? 'text-[#22c55e] bg-emerald-50/50' : 'text-slate-700'}`}
                          >
                            {item}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 3. Order Direction Selector */}
                <div className="relative">
                  <span className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1.5">ORDER</span>
                  <button
                    onClick={() => {
                      setShowOrderDirDropdown(!showOrderDirDropdown);
                      setShowCategoryDropdown(false);
                      setShowOrderByDropdown(false);
                    }}
                    className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-lg px-4 py-3.5 text-left transition-all"
                  >
                    <span className="font-extrabold text-xs text-[#0f172a] uppercase">{tempOrderDirection}</span>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-300 ${showOrderDirDropdown ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showOrderDirDropdown && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute left-0 right-0 mt-1 bg-white border border-slate-100 rounded-lg shadow-xl z-30"
                      >
                        {['DESCENDING', 'ASCENDING'].map(item => (
                          <button
                            key={item}
                            onClick={() => {
                              setTempOrderDirection(item);
                              setShowOrderDirDropdown(false);
                            }}
                            className={`w-full text-left px-4 py-3 text-xs font-bold uppercase transition-colors hover:bg-slate-50 ${tempOrderDirection === item ? 'text-[#22c55e] bg-emerald-50/50' : 'text-slate-700'}`}
                          >
                            {item}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Apply Filters Button */}
              <button
                onClick={handleApplyFilters}
                className="w-full bg-[#1e293b] hover:bg-slate-700 text-white font-black text-xs py-4 rounded-lg tracking-widest uppercase shadow-xs mt-6 transition-colors active:scale-98"
              >
                FILTER NEWS
              </button>
            </div>

            {/* Prayer Times widget side box */}
            <div className="hidden lg:block w-full">
              <PrayerTimes />
            </div>
          </div>

          {/* Sisi Kanan: Daftar Berita (Sesuai Persis Lampiran Gambar 2) */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paginatedNews.map((news) => (
                <div
                  key={news.id}
                  className="bg-white rounded-xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 group flex flex-col border border-slate-100"
                >
                  {/* News Card Image with Floating elements */}
                  <div className="relative aspect-[1.8/1] overflow-hidden bg-slate-100">
                    <LazyImage 
                      src={news.gambar_url} 
                      alt={news.judul} 
                      containerClassName="w-full h-full"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" 
                    />
                    
                    {/* PBSI style Green Tag Overlapping Image (Top-Left) */}
                    <div className="absolute top-4 left-4 bg-[#22c55e] text-white px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-wider shadow-sm z-10 max-w-[85%] truncate">
                      {news.kategori || 'UMUM'}
                    </div>

                    {/* Social share actions on hover */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                       <button onClick={() => handleShare(news, 'wa')} className="p-2.5 bg-[#22c55e] text-white rounded-full hover:scale-110 transition-transform shadow-md"><Share2 size={16} /></button>
                       <button onClick={() => handleShare(news, 'copy')} className="p-2.5 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform shadow-md">
                          {copySuccess === news.id ? <span className="text-[9px] font-bold px-1.5 text-blue-600">COPIED</span> : <Link2 size={16} />}
                       </button>
                    </div>

                    {/* Like button absolute */}
                    <button 
                      onClick={(e) => handleLike(e, news.id)}
                      className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all active:scale-90 z-10 ${likedPosts.has(news.id) ? 'bg-rose-500 text-white' : 'bg-white/95 text-slate-500 hover:text-rose-500 hover:bg-white'}`}
                    >
                      <Heart size={16} fill={likedPosts.has(news.id) ? "currentColor" : "none"} />
                    </button>

                    {/* PBSI style Green Action Button "+" Overlapping the image bottom edge */}
                    <button 
                      onClick={() => handleOpenNews(news)}
                      className="absolute -bottom-5 right-5 w-11 h-11 bg-[#22c55e] hover:bg-green-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10 hover:rotate-90"
                      title="Baca Selengkapnya"
                    >
                      <Plus size={20} className="stroke-[3]" />
                    </button>
                  </div>

                  {/* News Card Content */}
                  <div className="p-6 sm:p-7 flex flex-col flex-grow">
                    <div className="text-slate-400 text-[10px] mb-2 font-extrabold uppercase tracking-widest">
                      {news.tanggal}
                    </div>
                    
                    <h3 
                      onClick={() => handleOpenNews(news)}
                      className="text-base sm:text-lg font-black text-slate-900 mb-6 line-clamp-2 uppercase leading-snug group-hover:text-[#22c55e] transition-colors cursor-pointer"
                    >
                      {news.judul}
                    </h3>
                    
                    {/* PBSI style Card Footer */}
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                        {news.penulis || 'HUMAS PB US 162'}
                      </span>
                      <div className="flex items-center gap-3.5 text-slate-400">
                        <div className="flex items-center gap-1">
                          <Eye size={13} />
                          <span className="text-[10px] font-bold text-slate-500">{news.views || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart size={13} className={likedPosts.has(news.id) ? 'text-rose-500' : ''} fill={likedPosts.has(news.id) ? "currentColor" : "none"} />
                          <span className="text-[10px] font-bold text-slate-500">{news.likes || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle size={13} />
                          <span className="text-[10px] font-bold text-slate-500">{news.comments_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Zero Results State */}
            {filteredNews.length === 0 && (
              <div className="text-center py-20 bg-white border border-slate-100 rounded-xl">
                <Filter size={36} className="m-auto text-slate-300 mb-3" />
                <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Tidak ada berita yang cocok dengan filter Anda.</p>
              </div>
            )}

            {/* 3. PBSI-style Custom Pagination (Sesuai Persis Lampiran Gambar 2) */}
            {totalPages > 1 && (
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
              className="fixed inset-0 z-[110000] bg-white overflow-y-auto flex flex-col scroll-smooth"
            >
              {/* Sticky Top Header Bar */}
              <div className="sticky top-0 bg-[#0b1224] text-white px-4 py-3 md:py-4 flex items-center justify-between z-[110] shadow-md">
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
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-white flex items-center justify-center shadow-inner shrink-0">
                    <img src="/photo_2026-02-03_00-32-07.jpg" alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-[0.2em] text-white">PB BILIBILI 162</span>
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
                      className="w-full py-4.5 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-600 hover:to-indigo-600 text-white rounded-2xl font-extrabold uppercase text-xs tracking-[0.15em] transition-all duration-300 shadow-lg shadow-blue-950/20 active:scale-98 flex items-center justify-center gap-2.5 border border-white/10 group cursor-pointer"
                    >
                      <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform duration-200" />
                      <span>Kembali ke Daftar Berita</span>
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