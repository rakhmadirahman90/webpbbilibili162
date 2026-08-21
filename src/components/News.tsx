import { Calendar, ArrowRight, X, ChevronDown, ChevronUp, Loader2, User, Eye, Heart, MessageCircle, Send, Share2, Link2, ArrowLeft, ChevronLeft, ChevronRight, Plus, Filter, Search, Sparkles } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from "../supabase";
import { getSiteSetting } from '../utils/siteSettingsHelper';
import { DEFAULT_BERITA, DEFAULT_KOMENTAR } from '../data/localDatabase';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import LazyImage from './LazyImage';
import PrayerTimes from './PrayerTimes';
import { getOptimizedImageUrl } from '../utils/imageOptimizer';

// Daftar Reaksi Apresiasi Berita
const REACTIONS = [
  { id: 'love', label: 'Suka', icon: '❤️', color: 'text-rose-500' },
  { id: 'fire', label: 'Semangat', icon: '🔥', color: 'text-amber-500' },
  { id: 'clap', label: 'Apresiasi', icon: '👏', color: 'text-blue-500' },
  { id: 'smash', label: 'Smash!', icon: '🏸', color: 'text-emerald-500' },
  { id: 'praise', label: 'Keren', icon: '🙌', color: 'text-purple-500' },
];

interface Komentar {
  id: string;
  nama_user: string;
  isi_komentar: string;
  tanggal: string;
}

interface Berita {
  id: string;
  judul: string;
  ringkasan: string;
  konten: string;
  kategori: string;
  gambar_url: string;
  tanggal: string;
  penulis?: string;
  views: number;
  likes: number;
  comments_count?: number;
}

export function formatJournalisticDate(dateStr?: string) {
  const publisher = 'Humas PB Bilibili 162';
  if (!dateStr) {
    return {
      dateFormatted: 'Sabtu, 1 Agustus 2026',
      timeFormatted: '08:00 WITA',
      fullDateline: 'Sabtu, 1 Agustus 2026 | 08:00 WITA',
      publisher,
    };
  }
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  let d: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const parts = dateStr.split(/[-T :]/);
    d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), parts[3] ? parseInt(parts[3], 10) : 8, parts[4] ? parseInt(parts[4], 10) : 0);
  } else {
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) d = new Date(parsed);
  }
  if (d && !isNaN(d.getTime())) {
    const dateFormatted = `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
    const timeFormatted = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} WITA`;
    return { dateFormatted, timeFormatted, fullDateline: `${dateFormatted} | ${timeFormatted}`, publisher };
  }
  return { dateFormatted: dateStr, timeFormatted: '08:00 WITA', fullDateline: `${dateStr} | 08:00 WITA`, publisher };
}

export default function News() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [beritaList, setBeritaList] = useState<Berita[]>([]);
  const [selectedNews, setSelectedNews] = useState<Berita | null>(null);
  const [hasInitializedUrlNews, setHasInitializedUrlNews] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [activeReactionPicker, setActiveReactionPicker] = useState<string | null>(null);
  const [comments, setComments] = useState<Komentar[]>([]);
  const [newComment, setNewComment] = useState({ nama: '', pesan: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [sharePreviewNews, setSharePreviewNews] = useState<Berita | null>(null);
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [tempCategory, setTempCategory] = useState('ALL ARTICLES');
  const [tempOrderBy, setTempOrderBy] = useState('ARTICLE DATE');
  const [tempOrderDirection, setTempOrderDirection] = useState('DESCENDING');
  const [selectedCategory, setSelectedCategory] = useState('ALL ARTICLES');
  const [orderBy, setOrderBy] = useState('ARTICLE DATE');
  const [orderDirection, setOrderDirection] = useState('DESCENDING');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOrderByDropdown, setShowOrderByDropdown] = useState(false);
  const [showOrderDirDropdown, setShowOrderDirDropdown] = useState(false);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    beritaList.forEach(item => { if (item.kategori) cats.add(item.kategori.toUpperCase()); });
    return ['ALL ARTICLES', ...Array.from(cats)];
  }, [beritaList]);

  const filteredNews = useMemo(() => {
    let result = [...beritaList];
    if (selectedCategory !== 'ALL ARTICLES') result = result.filter(item => item.kategori?.toUpperCase() === selectedCategory.toUpperCase());
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item => item.judul.toLowerCase().includes(lowerTerm) || (item.ringkasan && item.ringkasan.toLowerCase().includes(lowerTerm)) || (item.konten && item.konten.toLowerCase().includes(lowerTerm)));
    }
    result.sort((a, b) => {
      let comparison = 0;
      if (orderBy === 'ARTICLE DATE') comparison = new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
      else if (orderBy === 'POPULARITY') comparison = ((b.views || 0) + (b.likes || 0)) - ((a.views || 0) + (a.likes || 0));
      else if (orderBy === 'TITLE') comparison = a.judul.localeCompare(b.judul);
      return orderDirection === 'DESCENDING' ? comparison : -comparison;
    });
    return result;
  }, [beritaList, selectedCategory, orderBy, orderDirection, searchTerm]);

  const itemsPerPage = 6;
  const totalPages = Math.max(1, Math.ceil(filteredNews.length / itemsPerPage));
  const paginatedNews = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredNews.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredNews, currentPage]);

  const handleApplyFilters = () => {
    setSelectedCategory(tempCategory); setOrderBy(tempOrderBy); setOrderDirection(tempOrderDirection); setCurrentPage(1);
    setShowCategoryDropdown(false); setShowOrderByDropdown(false); setShowOrderDirDropdown(false);
  };

  const getNewsImages = (news: Berita): string[] => {
    const list: string[] = [];
    if (news.gambar_url) list.push(...news.gambar_url.split(/[\s,]+/).map(u => u.trim()).filter(Boolean));
    if (list.length < 3) {
      if (news.judul.toLowerCase().includes('sea games') || news.judul.toLowerCase().includes('alwi') || news.judul.toLowerCase().includes('emas')) {
        list.push('https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200', 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=1200');
      } else {
        list.push('https://images.unsplash.com/photo-1613918431201-49638531a8cb?q=80&w=1200', 'https://images.unsplash.com/photo-1560079007-a5327045b403?q=80&w=1200');
      }
    }
    return list;
  };

  useEffect(() => {
    fetchNews();
    const savedLikes = localStorage.getItem('pb_us_liked_posts');
    if (savedLikes) try { setLikedPosts(new Set(JSON.parse(savedLikes))); } catch (e) {}
    const savedReactions = localStorage.getItem('pb_us_news_reactions');
    if (savedReactions) try { setUserReactions(JSON.parse(savedReactions)); } catch (e) {}
    const channel = supabase.channel('public:berita-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'berita' }, (payload) => {
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updated = payload.new;
        setBeritaList(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated, likes: Number(updated.likes) || 0, views: Number(updated.views) || 0 } : item));
        setSelectedNews(prev => prev?.id === updated.id ? { ...prev, ...updated, likes: Number(updated.likes) || 0, views: Number(updated.views) || 0 } : prev);
      } else if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') fetchNews();
    }).subscribe();
    const handleTableUpdate = () => fetchNews();
    window.addEventListener('table_updated_berita', handleTableUpdate);
    return () => { supabase.removeChannel(channel); window.removeEventListener('table_updated_berita', handleTableUpdate); };
  }, []);

  useEffect(() => { localStorage.setItem('pb_us_liked_posts', JSON.stringify(Array.from(likedPosts))); }, [likedPosts]);
  useEffect(() => { localStorage.setItem('pb_us_news_reactions', JSON.stringify(userReactions)); }, [userReactions]);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(selectedNews ? 'pb-overlay-open' : 'pb-overlay-close'));
    return () => window.dispatchEvent(new CustomEvent('pb-overlay-close'));
  }, [selectedNews]);
  useEffect(() => {
    if (beritaList.length > 0 && !hasInitializedUrlNews) {
      const urlNewsId = searchParams.get('newsId');
      if (urlNewsId) {
        const found = beritaList.find(item => item.id === urlNewsId);
        if (found) {
          handleOpenNews(found);
          setTimeout(() => document.getElementById('berita-section')?.scrollIntoView({ behavior: 'smooth' }), 300);
        }
      }
      setHasInitializedUrlNews(true);
    }
  }, [beritaList, searchParams, hasInitializedUrlNews]);
  useEffect(() => {
    if (!hasInitializedUrlNews) return;
    const urlNewsId = searchParams.get('newsId');
    if (selectedNews) {
      if (urlNewsId !== selectedNews.id) setSearchParams(prev => { const next = new URLSearchParams(prev); next.set('newsId', selectedNews.id); return next; }, { replace: true });
    } else if (urlNewsId) setSearchParams(prev => { const next = new URLSearchParams(prev); next.delete('newsId'); return next; }, { replace: true });
  }, [selectedNews, hasInitializedUrlNews, searchParams, setSearchParams]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      let sbData: any[] | null = null;
      const { data, error } = await supabase.from('berita').select(`*, comments_count:komentar(count)`).order('tanggal', { ascending: false });
      if (error) {
        console.warn('Query berita relational notice, retrying with direct select:', error.message);
        const { data: directData, error: directErr } = await supabase.from('berita').select('*').order('tanggal', { ascending: false });
        if (directErr) console.error('Direct query berita error:', directErr); else sbData = directData;
      } else sbData = data;
      if (sbData && sbData.length > 0) {
        const formattedData = sbData.map(item => ({ ...item, comments_count: Array.isArray(item.comments_count) ? (item.comments_count[0]?.count || 0) : (Number(item.comments_count) || 0), likes: Number(item.likes) || 0, views: Number(item.views) || 0 }));
        setBeritaList(formattedData as Berita[]); try { localStorage.setItem('cached_berita_list', JSON.stringify(formattedData)); } catch (e) {}
      } else {
        const localCached = localStorage.getItem('cached_berita_list') || localStorage.getItem('berita_local_v3');
        if (localCached) { try { const parsed = JSON.parse(localCached); if (Array.isArray(parsed) && parsed.length > 0) { setBeritaList(parsed as Berita[]); return; } } catch (e) {} }
        setBeritaList(DEFAULT_BERITA as Berita[]);
      }
    } catch (err) {
      console.error('Gagal memuat berita:', err);
      const localCached = localStorage.getItem('cached_berita_list') || localStorage.getItem('berita_local_v3');
      if (localCached) { try { const parsed = JSON.parse(localCached); if (Array.isArray(parsed) && parsed.length > 0) { setBeritaList(parsed as Berita[]); return; } } catch (e) {} }
      setBeritaList(DEFAULT_BERITA as Berita[]);
    } finally { setLoading(false); }
  };

  const fetchComments = async (beritaId: string) => {
    try {
      const { data, error } = await supabase.from('komentar').select('*').eq('berita_id', beritaId).order('tanggal', { ascending: false });
      if (!error && data && data.length > 0) setComments(data); else setComments(DEFAULT_KOMENTAR.filter(c => c.berita_id === beritaId));
    } catch (err) { console.error('Gagal memuat komentar:', err); setComments(DEFAULT_KOMENTAR.filter(c => c.berita_id === beritaId)); }
  };

  const handleOpenNews = async (news: Berita) => {
    setSelectedNews(news); setActiveImgIndex(0); fetchComments(news.id);
    const updatedViewCount = (Number(news.views) || 0) + 1;
    setBeritaList(prev => prev.map(item => item.id === news.id ? { ...item, views: updatedViewCount } : item));
    try {
      const { error } = await supabase.from('berita').update({ views: updatedViewCount }).eq('id', news.id);
      if (error) throw error;
    } catch (err) { console.error('Gagal menyimpan views ke database:', err); }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNews || !newComment.nama.trim() || !newComment.pesan.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.from('komentar').insert([{ berita_id: selectedNews.id, nama_user: newComment.nama, isi_komentar: newComment.pesan, tanggal: new Date().toISOString() }]).select();
      if (error) {
        console.error('Gagal mengirim komentar ke database:', error);
        Swal.fire({ icon: 'error', title: 'Gagal Kirim Komentar', text: error.message, confirmButtonColor: '#3B82F6' }); return;
      }
      const insertedComment: Komentar = { id: data && data[0]?.id ? data[0].id : `temp-${Date.now()}`, nama_user: newComment.nama, isi_komentar: newComment.pesan, tanggal: data && data[0]?.tanggal ? data[0].tanggal : new Date().toISOString() };
      setComments(prev => [insertedComment, ...prev]); setNewComment({ nama: '', pesan: '' });
      setBeritaList(prev => prev.map(item => item.id === selectedNews.id ? { ...item, comments_count: (item.comments_count || 0) + 1 } : item));
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Komentar berhasil dikirim!', showConfirmButton: false, timer: 3000 });
    } catch (err: any) {
      console.error('Error submitting comment:', err); Swal.fire({ icon: 'error', title: 'Terjadi Kesalahan', text: err.message || 'Gagal mengirim komentar', confirmButtonColor: '#3B82F6' });
    } finally { setIsSubmitting(false); }
  };

  const handleReact = async (e: React.MouseEvent, newsId: string, reactionId: string = 'love') => {
    e.stopPropagation(); setActiveReactionPicker(null);
    const currentReaction = userReactions[newsId]; const isAlreadyReacted = !!currentReaction; const isSameReaction = currentReaction === reactionId;
    const newLikedPosts = new Set(likedPosts); const newUserReactions = { ...userReactions };
    const newsItem = beritaList.find(n => n.id === newsId); const currentLikes = Number(newsItem?.likes) || 0; let finalLikeCount = currentLikes;
    if (isSameReaction) { newLikedPosts.delete(newsId); delete newUserReactions[newsId]; finalLikeCount = Math.max(0, currentLikes - 1); }
    else { newLikedPosts.add(newsId); newUserReactions[newsId] = reactionId; if (!isAlreadyReacted) finalLikeCount = currentLikes + 1; }
    setLikedPosts(newLikedPosts); setUserReactions(newUserReactions);
    setBeritaList(prev => prev.map(item => item.id === newsId ? { ...item, likes: finalLikeCount } : item));
    if (selectedNews?.id === newsId) setSelectedNews(prev => prev ? { ...prev, likes: finalLikeCount } : null);
    try { const { error } = await supabase.from('berita').update({ likes: finalLikeCount }).eq('id', newsId); if (error) throw error; }
    catch (err) { console.error('Gagal update likes di database:', err); fetchNews(); }
  };

  useEffect(() => {
    if (selectedNews) {
      const mainImg = (selectedNews.gambar_url || '').split(/[\s,]+/)[0] || '';
      const shareUrl = `${window.location.origin}${window.location.pathname}?newsId=${selectedNews.id}`;
      const title = `${selectedNews.judul} - PB Bilibili 162`;
      const desc = selectedNews.ringkasan || (selectedNews.konten ? selectedNews.konten.substring(0, 160) : '');
      document.title = title;
      const updateMeta = (attrName: string, attrVal: string, content: string) => {
        let el = document.querySelector(`meta[${attrName}="${attrVal}"]`);
        if (!el) { el = document.createElement('meta'); el.setAttribute(attrName, attrVal); document.head.appendChild(el); }
        el.setAttribute('content', content);
      };
      updateMeta('name', 'description', desc); updateMeta('property', 'og:title', selectedNews.judul); updateMeta('property', 'og:description', desc); updateMeta('property', 'og:image', mainImg); updateMeta('property', 'og:image:secure_url', mainImg); updateMeta('property', 'og:url', shareUrl); updateMeta('name', 'twitter:title', selectedNews.judul); updateMeta('name', 'twitter:description', desc); updateMeta('name', 'twitter:image', mainImg);
    } else document.title = 'PB Bilibili 162 - Persatuan Bulutangkis Terpadu';
  }, [selectedNews]);

  const handleLike = (e: React.MouseEvent, newsId: string) => {
    const currentRx = userReactions[newsId];
    handleReact(e, newsId, currentRx || 'love');
  };

  // Resolve only the first/primary photo for native sharing. The WhatsApp/FB/X
  // link preview is generated server-side by /api/share-berita so crawlers see
  // the exact primary photo in og:image instead of the site logo from index.html.
  const resolveShareImageUrl = async (news: Berita, publicDomain: string): Promise<string> => {
    const rawImages = (news.gambar_url || '').split(/[\s,]+/).filter(Boolean);
    const primaryUrl = rawImages.length > 0 ? (rawImages[0].startsWith('http') ? rawImages[0] : `${publicDomain}${rawImages[0].startsWith('/') ? '' : '/'}${rawImages[0]}`) : '';
    if (!primaryUrl) return '';
    try {
      const res = await fetch(primaryUrl, { method: 'HEAD', cache: 'no-cache' });
      return res.ok ? primaryUrl : '';
    } catch { return primaryUrl; }
  };

  const handleShare = async (news: Berita, platform: 'wa' | 'wa_link' | 'fb' | 'x' | 'copy' | 'native') => {
    const publicDomain = 'https://pbilibili162.99apps.id';
    // CRITICAL: use a server-rendered URL for external crawlers. WhatsApp does
    // not execute React, so changing og:image in useEffect cannot work reliably.
    const shareUrl = `${publicDomain}/api/share-berita?id=${encodeURIComponent(news.id)}`;
    const titleClean = news.judul.trim();
    const dateInfo = formatJournalisticDate(news.tanggal);
    const summaryText = news.ringkasan || (news.konten ? news.konten.substring(0, 160).replace(/\n/g, ' ').trim() + '...' : '');
    const directImageUrl = await resolveShareImageUrl(news, publicDomain);
    const waText = `*${titleClean.toUpperCase()}*\n\n📰 _${dateInfo.publisher}, ${dateInfo.fullDateline}_\n\n"${summaryText}"\n\n✨ *Baca Berita Selengkapnya & Lihat Foto:*\n${shareUrl}`;

    if (platform === 'native' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        let imageFile: File | null = null;
        if (directImageUrl) {
          try {
            const imgRes = await fetch(directImageUrl); if (imgRes.ok) { const blob = await imgRes.blob(); imageFile = new File([blob], `berita-${news.id}.${blob.type.includes('png') ? 'png' : 'jpg'}`, { type: blob.type || 'image/jpeg' }); }
          } catch {}
        }
        const shareData: ShareData = { title: `${titleClean} - PB BILIBILI 162`, text: `*${titleClean}*\n\n_${dateInfo.publisher}, ${dateInfo.fullDateline}_\n\n"${summaryText}"\n`, url: shareUrl };
        if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) shareData.files = [imageFile];
        await navigator.share(shareData); return;
      } catch (err) { console.warn('Native share canceled or unhandled:', err); }
    }

    switch (platform) {
      case 'wa_link':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'wa':
      case 'native':
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`, '_blank');
        break;
      case 'fb':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'x':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`*${titleClean} - PB BILIBILI 162*\n\n`)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
        break;
      case 'copy':
        try { await navigator.clipboard.writeText(`${publicDomain}/berita?newsId=${encodeURIComponent(news.id)}`); setCopySuccess(news.id); setTimeout(() => setCopySuccess(null), 2000); }
        catch (err) { console.error('Gagal menyalin tautan', err); }
        break;
    }
  };

  return (
    <section id="news" className="bg-[#f8fafc] pb-24 pt-8 w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start w-full">
