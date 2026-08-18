import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { supabase } from '../supabase';
import { DEFAULT_PENDAFTARAN, DEFAULT_RANKINGS } from '../data/localDatabase';
import { useNavigate } from 'react-router-dom';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import {
  X,
  Search,
  Trophy,
  ChevronLeft,
  ChevronRight,
  User,
  Star,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Award,
} from 'lucide-react';
import { PlayerDetailModal } from './PlayerDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import LazyImage from './LazyImage';
import Navbar from './Navbar';

const Players: React.FC<{ initialFilter?: string }> = ({
  initialFilter = 'Semua',
}) => {
  const navigate = useNavigate();

  const normalizeFilter = (val: string) => {
    if (!val || val.toLowerCase() === 'all' || val.toLowerCase() === 'semua') return 'Semua';
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  };

  const [currentAgeGroup, setCurrentAgeGroup] = useState(normalizeFilter(initialFilter));

  useEffect(() => {
    setCurrentAgeGroup(normalizeFilter(initialFilter));
  }, [initialFilter]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profil' | 'stats'>('profil');

  useEffect(() => {
    setActiveTab('profil');
  }, [selectedPlayer]);

  // Navbar tetap tersedia pada dedicated page Atlet.
  // Ini menjaga tombol menu seluler tetap terlihat dan seluruh navigasi tetap berfungsi.
  const handlePublicNavigate = useCallback((sectionId: string, subPath?: string) => {
    const main = (sectionId || '').toLowerCase().trim();
    const sub = (subPath || '').toLowerCase().trim();

    if (!main || main === 'home' || main === 'beranda') {
      navigate('/');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (main === 'atlet' || main === 'players' || main === 'player' || ['semua', 'senior', 'muda'].includes(sub)) {
      if (sub === 'senior') setCurrentAgeGroup('Senior');
      else if (sub === 'muda') setCurrentAgeGroup('Muda');
      else if (sub === 'semua' || main === 'atlet' || main === 'players' || main === 'player') setCurrentAgeGroup('Semua');

      navigate('/atlet');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sub === 'register' || sub === 'pendaftaran') {
      navigate('/register');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (sub === 'peringkat' || sub === 'rankings' || main === 'peringkat' || main === 'rankings' || main === 'ranking') {
      navigate('/peringkat');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const aliases: Record<string, string> = {
      'jadwal-latihan': 'jadwal',
      'schedule': 'jadwal',
      'kontak': 'contact',
      'hubungi-kami': 'contact',
      'struktur-organisasi': 'struktur',
      'dokumen-penting': 'dokumen',
      'documents': 'dokumen',
      'gallery': 'galeri',
      'news': 'berita',
      'rankings': 'peringkat',
      'tentang-kami': 'sejarah',
      'about': 'sejarah',
      'tentang': 'sejarah',
    };

    const target = aliases[sub || main] || sub || main;
    navigate(`/${target}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const fetchPlayersFromDB = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pendaftaranRes, statsRes, rankingsRes] = await Promise.allSettled([
        supabase.from('pendaftaran').select('*').order('nama', { ascending: true }),
        supabase.from('atlet_stats').select('*'),
        supabase.from('rankings').select('*')
      ]);

      const pendaftaranList = pendaftaranRes.status === 'fulfilled' && pendaftaranRes.value.data ? pendaftaranRes.value.data : [];
      const statsList = statsRes.status === 'fulfilled' && statsRes.value.data ? statsRes.value.data : [];
      const rankingsList = rankingsRes.status === 'fulfilled' && rankingsRes.value.data ? rankingsRes.value.data : [];

      const statsMap = new Map();
      statsList.forEach((s) => {
        if (s.pendaftaran_id) statsMap.set(s.pendaftaran_id, s);
        if (s.player_name) statsMap.set(s.player_name.trim().toLowerCase(), s);
      });

      const rankingsMap = new Map();
      rankingsList.forEach((r) => {
        if (r.pendaftaran_id) rankingsMap.set(r.pendaftaran_id, r);
        if (r.player_name) rankingsMap.set(r.player_name.trim().toLowerCase(), r);
      });

      const playerMap = new Map<string, any>();

      pendaftaranList.forEach((p) => {
        const nameKey = (p.nama || '').trim().toLowerCase();
        if (!nameKey) return;
        const stat = statsMap.get(p.id) || statsMap.get(nameKey);
        const rankItem = rankingsMap.get(p.id) || rankingsMap.get(nameKey);

        const baseP = Number(stat?.points) || Number(rankItem?.poin) || 0;
        const bonusP = Number(stat?.total_points) || Number(rankItem?.bonus) || 0;
        const finalP = rankItem?.total_points && Number(rankItem.total_points) > (baseP + bonusP)
          ? Number(rankItem.total_points)
          : (baseP + bonusP);

        playerMap.set(nameKey, {
          id: p.id,
          pendaftaran_id: p.id,
          pendaftaran: p,
          points: baseP,
          total_points: bonusP,
          display_points: finalP,
          seed: stat?.seed || rankItem?.seed || 'UNSEEDED',
          bio: stat?.bio || p.pengalaman || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB Bilibili 162 di kancah nasional.',
          status: p.status || 'Active'
        });
      });

      rankingsList.forEach((r) => {
        const nameKey = (r.player_name || '').trim().toLowerCase();
        if (!nameKey || playerMap.has(nameKey)) return;
        const stat = statsMap.get(r.pendaftaran_id) || statsMap.get(nameKey);
        const baseP = Number(stat?.points) || Number(r.poin) || 0;
        const bonusP = Number(stat?.total_points) || Number(r.bonus) || 0;
        const finalP = Number(r.total_points) || (baseP + bonusP);

        playerMap.set(nameKey, {
          id: r.id || `r-${nameKey}`,
          pendaftaran_id: r.pendaftaran_id,
          pendaftaran: {
            id: r.pendaftaran_id || r.id,
            nama: r.player_name,
            foto_url: r.photo_url || null,
            kategori_atlet: r.category || 'Senior',
            kategori: r.category || 'Senior',
            pengalaman: 'Atlet PB Bilibili 162',
            status: 'Active'
          },
          points: baseP,
          total_points: bonusP,
          display_points: finalP,
          seed: stat?.seed || r.seed || 'UNSEEDED',
          bio: stat?.bio || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB Bilibili 162 di kancah nasional.',
          status: 'Active'
        });
      });

      const resultPlayers = Array.from(playerMap.values());
      if (resultPlayers.length > 0) {
        setDbPlayers(resultPlayers);
        try {
          localStorage.setItem('cached_pendaftaran_players', JSON.stringify(resultPlayers));
        } catch (e) {}
      } else {
        const localList = DEFAULT_PENDAFTARAN.map(p => {
          const rank = DEFAULT_RANKINGS.find(r => r.pendaftaran_id === p.id || r.player_name.toLowerCase() === p.nama.toLowerCase());
          return {
            id: p.id,
            pendaftaran_id: p.id,
            pendaftaran: p,
            points: rank?.poin || 1200,
            total_points: rank?.bonus || 100,
            display_points: rank?.total_points || 1300,
            seed: rank?.seed || 'Non-Seed',
            bio: p.pengalaman || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB Bilibili 162.',
            status: p.status || 'Active'
          };
        });
        setDbPlayers(localList);
      }
    } catch (err) {
      console.error('Database Error:', err);
      const localList = DEFAULT_PENDAFTARAN.map(p => {
        const rank = DEFAULT_RANKINGS.find(r => r.pendaftaran_id === p.id || r.player_name.toLowerCase() === p.nama.toLowerCase());
        return {
          id: p.id,
          pendaftaran_id: p.id,
          pendaftaran: p,
          points: rank?.poin || 1200,
          total_points: rank?.bonus || 100,
          display_points: rank?.total_points || 1300,
          seed: rank?.seed || 'Non-Seed',
          bio: p.pengalaman || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB Bilibili 162.',
          status: p.status || 'Active'
        };
      });
      setDbPlayers(localList);
    } finally {
      setTimeout(() => setIsLoading(false), 300);
    }
  }, []);

  useEffect(() => {
    fetchPlayersFromDB();
    const channel = supabase
      .channel('atlet_changes_v2')
      .on('postgres_changes', { event: '*', table: 'atlet_stats', schema: 'public' }, () => fetchPlayersFromDB())
      .on('postgres_changes', { event: '*', table: 'pendaftaran', schema: 'public' }, () => fetchPlayersFromDB())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPlayersFromDB]);

  useEffect(() => {
    if (selectedPlayer) window.dispatchEvent(new CustomEvent('pb-overlay-open'));
    else window.dispatchEvent(new CustomEvent('pb-overlay-close'));
    return () => window.dispatchEvent(new CustomEvent('pb-overlay-close'));
  }, [selectedPlayer]);

  const processedPlayers = useMemo(() => {
    if (!dbPlayers) return [];
    const uniquePlayersMap = new Map();

    dbPlayers.forEach((p) => {
      const info = p.pendaftaran || {};
      const uniqueKey = info.id || p.id;
      if (uniquePlayersMap.has(uniqueKey)) return;

      const name = info.nama || 'Atlet PB Bilibili 162';
      const photo = info.foto_url || null;
      const calculatedPoints = (Number(p.points) || 0) + (Number(p.total_points) || 0);
      const dbCategory = info.kategori_atlet;
      let ageGroup = 'Senior';
      if (dbCategory) {
        ageGroup = normalizeFilter(dbCategory);
      } else {
        const categoryRaw = (info.kategori || '').toUpperCase();
        if (categoryRaw.includes('MUDA') || ['U-9', 'U-11', 'U-13', 'U-15', 'U-17', 'U-19'].some((u) => categoryRaw.includes(u))) {
          ageGroup = 'Muda';
        }
      }

      uniquePlayersMap.set(uniqueKey, {
        ...p,
        name,
        img: photo,
        ageGroup,
        displayPoints: calculatedPoints,
        displaySeed: p.seed || 'UNSEEDED',
        bio: p.bio || 'Dedikasi dan semangat tinggi untuk membawa nama baik PB Bilibili 162 di kancah nasional.',
      });
    });

    return Array.from(uniquePlayersMap.values()).sort((a, b) => b.displayPoints - a.displayPoints);
  }, [dbPlayers]);

  const counts = useMemo(() => ({
    all: processedPlayers.length,
    senior: processedPlayers.filter((p) => p.ageGroup === 'Senior').length,
    muda: processedPlayers.filter((p) => p.ageGroup === 'Muda').length,
  }), [processedPlayers]);

  const filteredPlayers = useMemo(() => {
    return processedPlayers.filter((p) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAge = currentAgeGroup === 'Semua' || p.ageGroup === currentAgeGroup;
      return matchesSearch && matchesAge;
    });
  }, [searchTerm, currentAgeGroup, processedPlayers]);

  return (
    <>
      <Navbar onNavigate={handlePublicNavigate} />
      <section id="atlet" className="w-full flex-grow pt-16 sm:pt-18 pb-28 sm:pb-36 bg-[#0b0e14] text-white flex flex-col overflow-hidden font-sans relative">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

        {selectedPlayer && (
          <PlayerDetailModal
            player={selectedPlayer}
            processedPlayers={processedPlayers}
            onClose={() => setSelectedPlayer(null)}
          />
        )}

        <div className="flex flex-col flex-grow max-w-7xl mx-auto px-4 mt-0 relative z-10 w-full gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
            <div>
              <motion.h2 initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="text-2xl sm:text-4xl md:text-5xl font-black italic uppercase tracking-tighter">
                PROFIL <span className="text-blue-600">PEMAIN</span>
              </motion.h2>
              <p className="text-zinc-500 text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase">Data Atlet Resmi PB Bilibili 162</p>
            </div>
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-500 transition-colors" size={14} />
              <input type="text" value={searchTerm} placeholder="Cari nama atlet..." className="w-full bg-[#1a1d26] border border-white/10 rounded-2xl py-2.5 pl-9 pr-9 text-xs outline-none focus:border-blue-500 transition-all text-white placeholder:text-zinc-500" onChange={(e) => setSearchTerm(e.target.value)} />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1"><X size={14} /></button>
              )}
              {searchTerm && <div className="absolute -bottom-5 left-1 text-[9px] font-bold text-blue-400 uppercase tracking-widest animate-pulse">Ditemukan {filteredPlayers.length} Atlet</div>}
            </div>
          </div>

          <div className="flex bg-[#1a1d26] p-1 rounded-2xl border border-white/10 w-full sm:w-fit overflow-x-auto no-scrollbar backdrop-blur-md shadow-2xl gap-1 shrink-0">
            {[
              { id: 'Semua', label: 'SEMUA', count: counts.all },
              { id: 'Senior', label: 'SENIOR', count: counts.senior },
              { id: 'Muda', label: 'MUDA', count: counts.muda },
            ].map((tab) => (
              <button key={tab.id} onClick={() => setCurrentAgeGroup(tab.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 ${currentAgeGroup === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
                <span>{tab.label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${currentAgeGroup === tab.id ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-6">
              <div className="relative">
                <Loader2 className="animate-spin text-blue-600" size={50} />
                <div className="absolute inset-0 blur-xl bg-blue-600/20 animate-pulse" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-zinc-500">Sinkronisasi Database...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden relative group/slider min-h-0">
              {filteredPlayers.length > 0 ? (
                <Swiper key={`${currentAgeGroup}-${filteredPlayers.length}`} modules={[Navigation, Pagination, Autoplay]} spaceBetween={25} slidesPerView={1.05} speed={400} grabCursor={true} autoplay={{ delay: 4000, disableOnInteraction: true }} navigation={{ prevEl: prevRef.current, nextEl: nextRef.current }} onBeforeInit={(swiper) => {
                  // @ts-ignore
                  swiper.params.navigation.prevEl = prevRef.current;
                  // @ts-ignore
                  swiper.params.navigation.nextEl = nextRef.current;
                }} breakpoints={{ 640: { slidesPerView: 2.5 }, 1024: { slidesPerView: 4 } }} className="h-full">
                  {filteredPlayers.map((player) => (
                    <SwiperSlide key={player.id}>
                      <motion.div whileHover={{ y: -10 }} onClick={() => setSelectedPlayer(player)} className="group cursor-pointer relative aspect-[3/4.2] rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden bg-[#1a1d26] border border-white/5 hover:border-blue-600/50 transition-all duration-500 shadow-2xl w-full">
                        {player.img ? (
                          <LazyImage src={player.img} className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" alt={player.name} containerClassName="w-full h-full" width={400} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#1a1d26] text-slate-600"><User size={60} /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0e14] via-[#0b0e14]/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute bottom-5 sm:bottom-8 left-5 sm:left-8 right-5 sm:right-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                          <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.8)]" /><p className="text-blue-500 text-[9px] font-black uppercase tracking-widest">{player.ageGroup.toUpperCase()}</p></div>
                          <h3 className="text-lg sm:text-xl md:text-2xl font-black uppercase italic mb-3 sm:mb-4 leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">{player.name}</h3>
                          <div className="flex justify-between items-center text-[10px] font-black pt-3 sm:pt-4 border-t border-white/5"><span className="text-white/30 uppercase tracking-tighter truncate max-w-[45%]">{player.displaySeed}</span><span className="bg-blue-600/10 text-blue-500 px-2.5 sm:px-3 py-1 rounded-full border border-blue-600/20 whitespace-nowrap">{player.displayPoints.toLocaleString()} PTS</span></div>
                        </div>
                      </motion.div>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="py-32 text-center bg-[#1a1d26]/50 rounded-[3rem] border border-white/5">
                  <Search className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-500 font-black uppercase italic tracking-widest">Atlet tidak ditemukan</p>
                  <button onClick={() => {setCurrentAgeGroup('Semua'); setSearchTerm('');}} className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20">Lihat Semua Atlet</button>
                </div>
              )}

              <button ref={prevRef} aria-label="Atlet sebelumnya" className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14 bg-[#1a1d26]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-100 md:opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 text-white shadow-2xl"><ChevronLeft size={24} /></button>
              <button ref={nextRef} aria-label="Atlet berikutnya" className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 z-20 w-10 md:w-14 h-10 md:h-14 bg-[#1a1d26]/80 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center opacity-100 md:opacity-0 group-hover/slider:opacity-100 transition-all hover:bg-blue-600 text-white shadow-2xl"><ChevronRight size={24} /></button>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Players;