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
    setIsLoading(true);
    try {
      // Sumber master identitas HARUS sama dengan Manajemen Atlet.
      const [pendaftaranRes, rankingsRes, statsRes, cup1Res] = await Promise.allSettled([
        supabase.from('pendaftaran').select('*').order('nama', { ascending: true }),
        supabase.from('rankings').select('*').order('total_points', { ascending: false }),
        supabase.from('atlet_stats').select('pendaftaran_id, points, total_points, seed'),
        supabase.from('v_bilibili_162_cup1_athlete_seeded').select('*'),
      ]);

      const pendaftaran = pendaftaranRes.status === 'fulfilled' && pendaftaranRes.value.data
        ? pendaftaranRes.value.data
        : [];
      const rankings = rankingsRes.status === 'fulfilled' && rankingsRes.value.data
        ? rankingsRes.value.data
        : [];
      const stats = statsRes.status === 'fulfilled' && statsRes.value.data
        ? statsRes.value.data
        : [];
      const cup1Rows = cup1Res.status === 'fulfilled' && cup1Res.value.data
        ? cup1Res.value.data
        : [];

      const cup1Map = new Map((cup1Rows || []).map((row: any) => [row.pendaftaran_id, row]));

      // Foto CUP I menjadi sumber foto terintegrasi, sama seperti Manajemen Atlet.
      const tournamentPhotoById = new Map<string, string>();
      await Promise.all((pendaftaran || []).map(async (atlet: any) => {
        const path = atlet.bilibili_cup1_photo_path || cup1Map.get(atlet.id)?.photo_path;
        if (!path) return;
        const { data } = await supabase.storage
          .from('turnamen-dokumen')
          .createSignedUrl(path, 60 * 60);
        if (data?.signedUrl) tournamentPhotoById.set(String(atlet.id), data.signedUrl);
      }));

      const statsMap = new Map((stats || []).map((s: any) => [s.pendaftaran_id, s]));

      if (pendaftaran.length === 0) {
        setDbPlayers([]);
        return;
      }

      const formatted = pendaftaran.map((atlet: any) => {
        const rankPosisi = rankings.findIndex(
          (r: any) =>
            (r.pendaftaran_id && r.pendaftaran_id === atlet.id) ||
            (r.player_name || r.nama)?.trim().toLowerCase() ===
              atlet.nama?.trim().toLowerCase()
        );
        const rankingMatch = rankPosisi !== -1 ? rankings[rankPosisi] : null;
        const stat = statsMap.get(atlet.id);
        const cup1 = cup1Map.get(atlet.id);
        const integratedSeed = cup1?.seeded_quality || 'D';

        const basePoints = Number(stat?.points || 0);
        const addedPoints = Number(stat?.total_points || 0);
        const calculatedTotal = basePoints + addedPoints;

        return {
          ...atlet,
          points: stat ? calculatedTotal : Number(rankingMatch?.total_points || 0),
          raw_base_points: basePoints,
          raw_added_points: addedPoints,
          rank: rankPosisi !== -1 ? rankPosisi + 1 : 0,
          seed: integratedSeed,
          seeded_cup1: Boolean(cup1?.is_seeded),
          seeded_participated: Boolean(cup1?.participated),
          seeded_player_name: cup1?.seeded_player_name || null,
          seeded_club_name: cup1?.seeded_club_name || null,
          seeded_division: cup1?.division_level || integratedSeed,
          seeded_partners: Array.isArray(cup1?.partners) ? cup1.partners : [],
          seeded_source_no: cup1?.source_no || null,
          foto_url:
            tournamentPhotoById.get(String(atlet.id)) ||
            atlet.foto_url ||
            rankingMatch?.photo_url ||
            '',
          bio: rankingMatch?.bio || 'No biography available.',
          prestasi: rankingMatch?.achievement || 'Regular Player',
        };
      });

      setDbPlayers(formatted);
    } catch (err) {
      console.error('Database Error:', err);
      setDbPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchPlayersFromDB();
    const channel = supabase
      .channel('atlet_changes_v2')
      .on('postgres_changes', { event: '*', table: 'atlet_stats', schema: 'public' }, () => fetchPlayersFromDB())
      .on('postgres_changes', { event: '*', table: 'rankings', schema: 'public' }, () => fetchPlayersFromDB())
      .on('postgres_changes', { event: '*', table: 'pendaftaran', schema: 'public' }, () => fetchPlayersFromDB())
      .on('postgres_changes', { event: '*', table: 'pendaftaran_turnamen', schema: 'public' }, () => fetchPlayersFromDB())
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
      // fetchPlayersFromDB mengembalikan baris pendaftaran langsung.
      // Tetap dukung bentuk lama { pendaftaran: {...} } agar tidak merusak data/cache lama.
      const info = p.pendaftaran || p;
      const uniqueKey = info.id || p.id;
      if (uniquePlayersMap.has(uniqueKey)) return;

      const name = info.nama || 'Atlet PB Bilibili 162';
      const photo = info.foto_url || null;
      const categoryRaw = String(info.kategori || info.kategori_atlet || 'SENIOR').toUpperCase();
      const ageGroup = categoryRaw.includes('MUDA') ||
        ['U-9', 'U-11', 'U-13', 'U-15', 'U-17', 'U-19'].some((u) => categoryRaw.includes(u))
        ? 'Muda'
        : 'Senior';

      uniquePlayersMap.set(uniqueKey, {
        ...p,
        name,
        img: photo,
        ageGroup,
        displayPoints: Number(p.points) || 0,
        displaySeed: p.seed || 'D',
        bio: p.bio || 'No biography available.',
        prestasi: p.prestasi || 'Regular Player',
        rank: p.rank || 0,
        seeded_cup1: Boolean(p.seeded_cup1),
        seeded_participated: Boolean(p.seeded_participated),
        seeded_player_name: p.seeded_player_name || null,
        seeded_club_name: p.seeded_club_name || null,
        seeded_division: p.seeded_division || p.seed || 'D',
        seeded_partners: Array.isArray(p.seeded_partners) ? p.seeded_partners : [],
        seeded_source_no: p.seeded_source_no || null,
      });
    });

    return Array.from(uniquePlayersMap.values()).sort((a, b) => b.displayPoints - a.displayPoints);
  }, [dbPlayers]);

  useEffect(() => {
    let athleteId = '';
    try {
      if (sessionStorage.getItem('pb_landing_athlete_return') !== '1') return;
      athleteId = sessionStorage.getItem('pb_landing_athlete_id') || '';
    } catch { return; }
    if (!athleteId || !processedPlayers.length) return;
    const target = processedPlayers.find((item) => String(item.id) === athleteId);
    if (target) setSelectedPlayer(target);
  }, [processedPlayers]);

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
            onClose={() => {
              let fromLanding = false;
              try { fromLanding = sessionStorage.getItem('pb_landing_athlete_return') === '1'; } catch {}
              if (fromLanding) {
                try { sessionStorage.setItem('pb_suppress_landing_popup', '1'); } catch {}
                navigate('/');
                return;
              }
              setSelectedPlayer(null);
            }}
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
            <div className="relative w-full">
              {filteredPlayers.length > 0 ? (
                <>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-[0.18em]">
                      Menampilkan <span className="text-blue-400">{filteredPlayers.length}</span> atlet
                    </p>
                    <span className="hidden sm:block text-[10px] text-zinc-600 uppercase tracking-widest">
                      Klik kartu untuk melihat profil
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                    {filteredPlayers.map((player, index) => (
                      <motion.article
                        key={player.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.28, delay: Math.min(index * 0.025, 0.3) }}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.985 }}
                        onClick={() => setSelectedPlayer(player)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl sm:rounded-2xl bg-[#141a27] border border-white/8 hover:border-blue-500/60 shadow-lg hover:shadow-blue-900/20 transition-all duration-300 aspect-[1/1.08] sm:aspect-[1/1.02] lg:aspect-[1/1.08]"
                      >
                        {player.img ? (
                          <LazyImage
                            src={player.img}
                            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.035]"
                            alt={player.name}
                            containerClassName="w-full h-full"
                            width={500}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#1a1d26] text-slate-600">
                            <User size={54} />
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-[#070b13] via-[#070b13]/10 to-transparent" />
                        <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 lg:p-5">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_7px_rgba(59,130,246,.9)]" />
                            <span className="text-blue-300 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.16em]">
                              {player.ageGroup}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base lg:text-lg font-black uppercase leading-tight tracking-tight text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
                            {player.name}
                          </h3>
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                            <span className="text-[8px] sm:text-[9px] text-zinc-400 font-bold uppercase truncate">
                              {player.displaySeed}
                            </span>
                            <span className="shrink-0 px-2 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[8px] sm:text-[9px] font-black">
                              {player.displayPoints.toLocaleString()} PTS
                            </span>
                          </div>
                        </div>

                        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <User size={13} className="text-white" />
                        </div>
                      </motion.article>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-24 text-center bg-[#141a27]/60 rounded-2xl sm:rounded-3xl border border-white/8">
                  <Search className="mx-auto text-slate-600 mb-4" size={48} />
                  <p className="text-slate-500 font-black uppercase italic tracking-widest text-xs sm:text-sm">Atlet tidak ditemukan</p>
                  <button
                    onClick={() => { setCurrentAgeGroup('Semua'); setSearchTerm(''); }}
                    className="mt-6 px-7 py-3 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20"
                  >
                    Lihat Semua Atlet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Players;