import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  Calendar,
  Info,
  ShieldCheck,
  Activity,
  Flame,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Clock,
  Filter,
  X,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

// --- Interfaces ---
interface PlayerRanking {
  id: string;
  pendaftaran_id?: string;
  player_name: string;
  category: string;
  seed: string;
  poin?: number;
  total_points: number;
  bonus?: number;
  photo_url?: string;
  updated_at?: string;
}

interface PointHistory {
  id: string;
  created_at: string;
  perubahan: number;
  poin_sebelum: number;
  poin_sesudah: number;
  admin_email: string;
  tipe_kegiatan: string;
}

interface WeeklyTop {
  atlet_nama: string;
  total_gain: number;
  total_aktivitas: number;
}

// --- Komponen Modal Matrix Poin ---
const MatrixModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0b1224] border border-blue-500/30 rounded-3xl p-6 shadow-2xl text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all border border-slate-700 cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
          <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-base font-black uppercase italic tracking-tight text-white">Matrix Perolehan Poin</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Standar Penghitungan Poin PB Bilibili 162</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {[
            { title: 'Latihan Harian', val: '20 / 10 / 5 PTS', desc: 'Sesuai tingkat kehadiran & evaluasi coach' },
            { title: 'Sparing Partner', val: '100 / 50 / 25 PTS', desc: 'Menang / Seri / Ikut Sparing' },
            { title: 'Turnamen Internal', val: '300 / -- / 50 PTS', desc: 'Juara / Runner Up / Partisipasi' },
            { title: 'Turnamen Eksternal', val: '500 / -- / 100 PTS', desc: 'Juara Resmi / Podia / Peserta' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
              <span className="text-[9px] text-blue-400 font-black uppercase tracking-wider block mb-1">{item.title}</span>
              <span className="text-sm font-mono font-black text-white block mb-1">{item.val}</span>
              <span className="text-[9px] text-slate-500 font-bold">{item.desc}</span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center gap-2.5 text-blue-300 text-xs">
          <Info size={16} className="shrink-0 text-blue-400" />
          <p className="text-[10px] leading-relaxed">
            Sistem poin diperbarui secara otomatis dan diverifikasi oleh Admin.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Komponen Modal Detail & History Player ---
const PlayerDetailModal: React.FC<{
  player: PlayerRanking | null;
  globalRank: number;
  onClose: () => void;
}> = ({ player, globalRank, onClose }) => {
  const [history, setHistory] = useState<PointHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!player) return;

    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from('audit_poin')
          .select('id, created_at, perubahan, poin_sebelum, poin_sesudah, admin_email, tipe_kegiatan')
          .ilike('atlet_nama', player.player_name.trim())
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setHistory(data || []);
      } catch (err) {
        console.error('Fetch player history error:', err);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [player]);

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0b1224] border border-blue-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] text-white">
        {/* Header Modal */}
        <div className="p-4 sm:p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-blue-500/40 overflow-hidden shrink-0 shadow-lg">
              {player.photo_url ? (
                <img src={player.photo_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-500"><User size={24} /></div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-white">{player.player_name}</h3>
                {globalRank === 1 && <Trophy size={16} className="text-amber-400" />}
              </div>
              <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mt-0.5">
                Peringkat #{globalRank} • {player.seed || 'UNSEEDED'} • {player.category}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-all border border-slate-700 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 custom-scrollbar flex-1">
          {/* Grid Stat Poin */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Poin Dasar</span>
              <span className="text-sm sm:text-base font-black font-mono text-blue-400 mt-0.5 block">{Number(player.poin || 0).toLocaleString()}</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
              <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider block">Bonus / Mutasi</span>
              <span className={`text-sm sm:text-base font-black font-mono mt-0.5 block ${Number(player.bonus || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number(player.bonus || 0) >= 0 ? `+${Number(player.bonus || 0).toLocaleString()}` : Number(player.bonus || 0).toLocaleString()}
              </span>
            </div>
            <div className="bg-blue-600/10 p-3 rounded-2xl border border-blue-500/30 text-center">
              <span className="text-[8px] font-black uppercase text-blue-400 tracking-wider block">Total Akhir</span>
              <span className="text-sm sm:text-base font-black font-mono text-white mt-0.5 block">{Number(player.total_points || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Section Audit History */}
          <div className="border-t border-slate-800 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History size={14} className="text-blue-500" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-200">Riwayat Perubahan Poin</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <ShieldCheck size={11} /> Terverifikasi
              </div>
            </div>

            {loadingHistory ? (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Memuat Riwayat...</span>
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-2">
                {history.map((log) => {
                  const isGain = log.perubahan > 0;
                  return (
                    <div
                      key={log.id}
                      className={`p-2.5 sm:p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isGain ? 'bg-emerald-500/[0.03] border-emerald-500/20' : 'bg-red-500/[0.03] border-red-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${isGain ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isGain ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                            <Calendar size={10} />
                            {new Date(log.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <p className="text-xs font-bold text-slate-200 uppercase truncate mt-0.5">
                            {log.tipe_kegiatan || 'Aktivitas Rutin'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs sm:text-sm font-black font-mono ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isGain ? '+' : ''}{log.perubahan}
                        </span>
                        <p className="text-[8px] font-mono text-slate-500 mt-0.5">
                          {log.poin_sebelum} &rarr; {log.poin_sesudah}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/30">
                <Clock className="mx-auto text-slate-600 mb-1" size={24} />
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Belum ada catatan mutasi poin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Komponen Utama: Rankings ---
const Rankings: React.FC = () => {
  const [dbRankings, setDbRankings] = useState<PlayerRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number | 'All'>(10);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const listTopRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRanking | null>(null);

  // Weekly Hero state
  const [topGainer, setTopGainer] = useState<WeeklyTop | null>(null);

  // Fetch Weekly Spotlight
  useEffect(() => {
    const fetchWeeklyTop = async () => {
      try {
        const { data } = await supabase.from('weekly_top_performers').select('*').limit(1).maybeSingle();
        if (data) {
          setTopGainer(data);
        } else {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const { data: auditData } = await supabase
            .from('audit_poin')
            .select('atlet_nama, perubahan')
            .gte('created_at', sevenDaysAgo.toISOString());

          if (auditData && auditData.length > 0) {
            const statsMap: Record<string, { total_gain: number; total_aktivitas: number }> = {};
            auditData.forEach((item) => {
              if (!item.atlet_nama) return;
              const gain = item.perubahan > 0 ? item.perubahan : 0;
              if (!statsMap[item.atlet_nama]) {
                statsMap[item.atlet_nama] = { total_gain: 0, total_aktivitas: 0 };
              }
              statsMap[item.atlet_nama].total_gain += gain;
              statsMap[item.atlet_nama].total_aktivitas += 1;
            });

            let topName = '';
            let maxGain = 0;
            let topStat = { total_gain: 0, total_aktivitas: 0 };

            Object.entries(statsMap).forEach(([name, st]) => {
              if (st.total_gain > maxGain) {
                maxGain = st.total_gain;
                topName = name;
                topStat = st;
              }
            });

            if (topName && maxGain > 0) {
              setTopGainer({
                atlet_nama: topName,
                total_gain: topStat.total_gain,
                total_aktivitas: topStat.total_aktivitas,
              });
            }
          }
        }
      } catch (err) {
        console.warn('Weekly top fetch fallback...');
      }
    };

    fetchWeeklyTop();
  }, []);

  // Fetch Rankings Data with robust fallbacks
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [rankingsRes, statsRes, pendaftaranRes] = await Promise.allSettled([
        supabase.from('rankings').select('*'),
        supabase.from('atlet_stats').select('pendaftaran_id, player_name, points, total_points, seed'),
        supabase.from('pendaftaran').select('id, nama, foto_url, kategori_atlet'),
      ]);

      const rankingsData = rankingsRes.status === 'fulfilled' && rankingsRes.value.data ? rankingsRes.value.data : [];
      const statsData = statsRes.status === 'fulfilled' && statsRes.value.data ? statsRes.value.data : [];
      const pendaftaranData = pendaftaranRes.status === 'fulfilled' && pendaftaranRes.value.data ? pendaftaranRes.value.data : [];

      const playerMap = new Map<string, PlayerRanking>();

      // Master Pendaftaran
      pendaftaranData.forEach((profile) => {
        const rawName = profile.nama || '';
        const nameKey = rawName.trim().toLowerCase();
        if (!nameKey) return;

        const stat = statsData.find(
          (s) => (s.pendaftaran_id && s.pendaftaran_id === profile.id) || (s.player_name && s.player_name.trim().toLowerCase() === nameKey)
        );

        const rankItem = rankingsData.find(
          (r) => (r.pendaftaran_id && r.pendaftaran_id === profile.id) || (r.player_name && r.player_name.trim().toLowerCase() === nameKey)
        );

        const basePoints = stat ? Number(stat.points) || 0 : Number(rankItem?.poin) || 0;
        const addedPoints = stat ? Number(stat.total_points) || 0 : Number(rankItem?.bonus) || 0;
        const calculatedTotal = basePoints + addedPoints;
        const finalTotal = rankItem?.total_points && Number(rankItem.total_points) > calculatedTotal
          ? Number(rankItem.total_points)
          : calculatedTotal;

        let currentSeed = stat?.seed || rankItem?.seed || 'Non-Seed';
        if (currentSeed && !currentSeed.includes('Seed') && currentSeed !== 'Non-Seed' && currentSeed !== 'UNSEEDED') {
          currentSeed = `Seed ${currentSeed}`;
        } else if (currentSeed === 'UNSEEDED') {
          currentSeed = 'Non-Seed';
        }

        playerMap.set(nameKey, {
          id: profile.id || rankItem?.id || `p-${nameKey}`,
          pendaftaran_id: profile.id,
          player_name: rawName.trim().toUpperCase(),
          photo_url: profile.foto_url || rankItem?.photo_url || undefined,
          poin: basePoints,
          bonus: addedPoints,
          total_points: finalTotal,
          seed: currentSeed,
          category: profile.kategori_atlet || rankItem?.category || 'SENIOR',
          updated_at: rankItem?.updated_at || new Date().toISOString(),
        });
      });

      // Master Rankings
      rankingsData.forEach((rankItem) => {
        const rawName = rankItem.player_name || '';
        const nameKey = rawName.trim().toLowerCase();
        if (!nameKey || playerMap.has(nameKey)) return;

        const stat = statsData.find(
          (s) => (s.pendaftaran_id && s.pendaftaran_id === rankItem.pendaftaran_id) || (s.player_name && s.player_name.trim().toLowerCase() === nameKey)
        );

        const basePoints = stat ? Number(stat.points) || 0 : Number(rankItem.poin) || 0;
        const addedPoints = stat ? Number(stat.total_points) || 0 : Number(rankItem.bonus) || 0;
        const calculatedTotal = basePoints + addedPoints;
        const finalTotal = Number(rankItem.total_points) || calculatedTotal;

        let currentSeed = stat?.seed || rankItem.seed || 'Non-Seed';
        if (currentSeed && !currentSeed.includes('Seed') && currentSeed !== 'Non-Seed' && currentSeed !== 'UNSEEDED') {
          currentSeed = `Seed ${currentSeed}`;
        } else if (currentSeed === 'UNSEEDED') {
          currentSeed = 'Non-Seed';
        }

        playerMap.set(nameKey, {
          id: rankItem.id || `r-${nameKey}`,
          pendaftaran_id: rankItem.pendaftaran_id,
          player_name: rawName.trim().toUpperCase(),
          photo_url: rankItem.photo_url || undefined,
          poin: basePoints,
          bonus: addedPoints,
          total_points: finalTotal,
          seed: currentSeed,
          category: rankItem.category || 'SENIOR',
          updated_at: rankItem.updated_at,
        });
      });

      // Master Stats
      statsData.forEach((stat) => {
        const rawName = stat.player_name || '';
        const nameKey = rawName.trim().toLowerCase();
        if (!nameKey || playerMap.has(nameKey)) return;

        const basePoints = Number(stat.points) || 0;
        const addedPoints = Number(stat.total_points) || 0;
        const finalTotal = basePoints + addedPoints;

        let currentSeed = stat.seed || 'Non-Seed';
        if (currentSeed && !currentSeed.includes('Seed') && currentSeed !== 'Non-Seed' && currentSeed !== 'UNSEEDED') {
          currentSeed = `Seed ${currentSeed}`;
        } else if (currentSeed === 'UNSEEDED') {
          currentSeed = 'Non-Seed';
        }

        playerMap.set(nameKey, {
          id: stat.pendaftaran_id || `s-${nameKey}`,
          pendaftaran_id: stat.pendaftaran_id,
          player_name: rawName.trim().toUpperCase(),
          photo_url: undefined,
          poin: basePoints,
          bonus: addedPoints,
          total_points: finalTotal,
          seed: currentSeed,
          category: 'SENIOR',
          updated_at: new Date().toISOString(),
        });
      });

      const syncedData = Array.from(playerMap.values());
      const sortedData = syncedData.sort((a, b) => b.total_points - a.total_points);

      setDbRankings(sortedData);
    } catch (error: any) {
      console.error('Sync Error:', error);
      setFetchError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRankings();

    const channel = supabase
      .channel('rankings_realtime_sync_v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => fetchRankings())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_poin' }, () => fetchRankings())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, () => fetchRankings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  const getCategoryStyles = (seed: string) => {
    const s = seed?.toUpperCase() || '';
    if (s.includes('A')) return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
    if (s.includes('B+')) return { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' };
    if (s.includes('B-') || s === 'B') return { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' };
    if (s.includes('C')) return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    return { bg: 'bg-slate-800', text: 'text-slate-400', border: 'border-slate-700' };
  };

  const filteredData = useMemo(() => {
    return dbRankings.filter((p) => {
      const name = p.player_name?.toLowerCase() || '';
      const seedRaw = p.seed?.toUpperCase() || '';
      const matchesSearch = name.includes(searchTerm.toLowerCase());
      const matchesCategory = activeCategory === 'All' || seedRaw.includes(activeCategory.toUpperCase());
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, activeCategory, dbRankings]);

  // Kalkulasi Pagination
  const effectiveLimit = itemsPerPage === 'All' ? Math.max(filteredData.length, 1) : itemsPerPage;
  const totalPages = Math.max(Math.ceil(filteredData.length / effectiveLimit), 1);
  
  const currentPlayers = useMemo(() => {
    if (itemsPerPage === 'All') return filteredData;
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage, itemsPerPage]);

  const startItemIndex = filteredData.length > 0 ? (itemsPerPage === 'All' ? 1 : (currentPage - 1) * (itemsPerPage as number) + 1) : 0;
  const endItemIndex = filteredData.length > 0 ? (itemsPerPage === 'All' ? filteredData.length : Math.min(currentPage * (itemsPerPage as number), filteredData.length)) : 0;

  const handlePageChange = (newPage: number) => {
    const targetPage = Math.max(1, Math.min(newPage, totalPages));
    setCurrentPage(targetPage);
    if (listTopRef.current) {
      listTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Logic Generate List Tombol Halaman (dengan Ellipsis jika banyak)
  const renderPageNumbers = () => {
    if (itemsPerPage === 'All' || totalPages <= 1) return null;

    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }

    return pages.map((p, idx) => {
      if (typeof p === 'string') {
        return (
          <span key={`dots-${idx}`} className="px-1 text-slate-500 font-bold text-xs select-none">
            ...
          </span>
        );
      }
      return (
        <button
          key={p}
          onClick={() => handlePageChange(p)}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-[10px] sm:text-xs font-black transition-all cursor-pointer border ${
            currentPage === p
              ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
        >
          {p}
        </button>
      );
    });
  };

  return (
    <section id="rankings" className="w-full bg-[#070d1a] text-white font-sans relative py-2 sm:py-3 h-[calc(100vh-4.5rem)] flex flex-col justify-between overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,#1e3a8a22,transparent_60%)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 w-full flex flex-col flex-1 min-h-0 gap-2.5 relative z-10 overflow-hidden">
        
        {/* COMPACT TOP HEADER BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 sm:p-4 rounded-2xl backdrop-blur-xl shadow-xl shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[8px] sm:text-[9px] font-black uppercase tracking-widest rounded-full flex items-center gap-1">
                <Trophy size={11} className="text-blue-400" /> Standar Resmi PB Bilibili 162
              </span>
              <span className="text-[8px] font-black uppercase text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Sync
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white">
              PERINGKAT &amp; <span className="text-blue-500">POIN ATLET</span>
            </h1>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
            {/* Weekly Hero Mini Chip */}
            {topGainer && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-xs">
                <Flame size={14} className="text-orange-500 animate-pulse" />
                <span className="text-[9px] font-bold uppercase tracking-wider">
                  Hero: <strong className="text-white font-black">{topGainer.atlet_nama}</strong> (+{topGainer.total_gain} PTS)
                </span>
              </div>
            )}

            {/* Matrix Button */}
            <button
              onClick={() => setIsMatrixOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 hover:border-blue-500 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <Activity size={14} />
              <span>Matrix Poin</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER CONTROLS BAR */}
        <div className="flex flex-col md:flex-row items-center gap-2.5 bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-2xl backdrop-blur-md shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
            <input
              type="text"
              placeholder="Cari nama atlet..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Seed Category Filters */}
          <div className="flex items-center justify-between w-full md:w-auto gap-2">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <div className="text-slate-500 px-1 hidden lg:block">
                <Filter size={13} />
              </div>
              {['All', 'A', 'B+', 'B-', 'C'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setActiveCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-black border uppercase whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {cat === 'All' ? 'SEMUA' : `SEED ${cat}`}
                </button>
              ))}
            </div>

            {/* Items Per Page Selector (Mobile & Desktop) */}
            <div className="flex items-center gap-1 pl-2 border-l border-slate-800 shrink-0">
              <SlidersHorizontal size={12} className="text-slate-500 hidden sm:block" />
              <span className="text-[9px] font-bold text-slate-500 uppercase hidden sm:inline">Tampil:</span>
              {[5, 10, 20, 'All'].map((num) => (
                <button
                  key={String(num)}
                  onClick={() => {
                    setItemsPerPage(num as number | 'All');
                    setCurrentPage(1);
                  }}
                  className={`px-2 py-1 text-[9px] font-black rounded border transition-all cursor-pointer ${
                    itemsPerPage === num
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  {num === 'All' ? 'Semua' : num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ERROR DISPLAY */}
        {fetchError && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-xs shrink-0">
            <AlertCircle size={15} />
            <span className="font-bold uppercase text-[10px]">{fetchError}</span>
          </div>
        )}

        {/* MAIN DATA SECTION (DESKTOP TABLE & MOBILE CARDS WITH FULL SCROLLING) */}
        <div ref={listTopRef} className="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-2xl flex-1 flex flex-col justify-between overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sinkronisasi Poin Server...</p>
            </div>
          ) : currentPlayers.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-600 gap-2">
              <Search size={32} className="opacity-30" />
              <p className="text-xs font-black uppercase tracking-widest">Atlet tidak ditemukan</p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW - FULL SCROLLABLE */}
              <div className="hidden md:block overflow-x-auto overflow-y-auto flex-1 min-h-0 custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead className="sticky top-0 z-20 bg-[#091122] shadow-md">
                    <tr className="text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-800">
                      <th className="px-4 py-3 text-center w-16">Rank</th>
                      <th className="px-4 py-3">Atlet</th>
                      <th className="px-4 py-3 text-center w-36">Kategori &amp; Seed</th>
                      <th className="px-4 py-3 text-right w-28">Poin Dasar</th>
                      <th className="px-4 py-3 text-center w-28">Mutasi</th>
                      <th className="px-4 py-3 text-right w-32">Total Poin</th>
                      <th className="px-4 py-3 text-center w-20">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {currentPlayers.map((player) => {
                      const globalRank = dbRankings.findIndex((p) => p.id === player.id) + 1;
                      const style = getCategoryStyles(player.seed);

                      // Rank badge styling
                      let rankBadge = 'text-slate-400 font-bold';
                      if (globalRank === 1) rankBadge = 'text-amber-400 font-black scale-110';
                      else if (globalRank === 2) rankBadge = 'text-slate-300 font-black';
                      else if (globalRank === 3) rankBadge = 'text-orange-400 font-black';

                      return (
                        <tr
                          key={player.id}
                          onClick={() => setSelectedPlayer(player)}
                          className="hover:bg-blue-600/10 cursor-pointer transition-all group"
                        >
                          {/* Rank */}
                          <td className="px-4 py-3 text-center">
                            <span className={`text-sm sm:text-base italic font-mono ${rankBadge}`}>
                              #{String(globalRank).padStart(2, '0')}
                            </span>
                          </td>

                          {/* Player Photo & Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0 group-hover:border-blue-400 transition-colors">
                                {player.photo_url ? (
                                  <img src={player.photo_url} className="w-full h-full object-cover" alt="" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={16} /></div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-black italic uppercase text-xs sm:text-sm text-white group-hover:text-blue-400 transition-colors truncate">
                                    {player.player_name}
                                  </span>
                                  {globalRank === 1 && <Trophy size={14} className="text-amber-400 shrink-0" />}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Category & Seed */}
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-wider ${style.bg} ${style.text} ${style.border}`}>
                                {player.seed || 'UNSEEDED'}
                              </span>
                              <span className="text-[8px] text-slate-500 font-bold uppercase">{player.category}</span>
                            </div>
                          </td>

                          {/* Base Points */}
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-300 text-xs">
                            {Number(player.poin || 0).toLocaleString()}
                          </td>

                          {/* Bonus / Mutation */}
                          <td className="px-4 py-3 text-center">
                            {player.bonus !== undefined && player.bonus !== 0 ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                                player.bonus > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                              }`}>
                                {player.bonus > 0 ? <TrendingUp size={10} className="mr-1" /> : <TrendingDown size={10} className="mr-1" />}
                                {player.bonus > 0 ? `+${player.bonus}` : player.bonus}
                              </span>
                            ) : (
                              <Minus size={12} className="mx-auto text-slate-700" />
                            )}
                          </td>

                          {/* Total Points */}
                          <td className="px-4 py-3 text-right font-mono font-black text-white text-sm">
                            {Number(player.total_points || 0).toLocaleString()}
                          </td>

                          {/* Action Icon */}
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlayer(player);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                              title="Lihat Detail & Riwayat Poin"
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARD LIST VIEW - FULL SCROLLABLE */}
              <div className="md:hidden divide-y divide-slate-800/40 overflow-y-auto flex-1 min-h-0 custom-scrollbar touch-pan-y">
                {currentPlayers.map((player) => {
                  const globalRank = dbRankings.findIndex((p) => p.id === player.id) + 1;
                  const style = getCategoryStyles(player.seed);

                  return (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-all cursor-pointer active:bg-slate-800/80"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Rank Badge */}
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 font-mono font-black italic text-xs text-blue-400 shadow-sm">
                          #{String(globalRank).padStart(2, '0')}
                        </div>

                        {/* Photo */}
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                          {player.photo_url ? (
                            <img src={player.photo_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600"><User size={16} /></div>
                          )}
                        </div>

                        {/* Name & Seed */}
                        <div className="min-w-0 flex-1">
                          <p className="font-black italic uppercase text-xs sm:text-sm text-white truncate">{player.player_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[7px] font-black px-1.5 py-0.2 rounded border uppercase ${style.bg} ${style.text} ${style.border}`}>
                              {player.seed || 'UNSEEDED'}
                            </span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase">{player.category}</span>
                          </div>
                        </div>
                      </div>

                      {/* Total Points & Action */}
                      <div className="text-right shrink-0 flex items-center gap-2.5">
                        <div>
                          <p className="font-mono font-black text-white text-xs sm:text-sm">
                            {Number(player.total_points || 0).toLocaleString()}
                          </p>
                          <p className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">PTS</p>
                        </div>
                        <div className="p-1.5 bg-slate-800 rounded-lg text-blue-400 border border-slate-700">
                          <Eye size={13} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* FOOTER CONTROLS & COMPLETE PAGINATION */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Info Range & Page Count */}
            <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-slate-400">
              <span>
                Menampilkan <strong className="text-white font-mono">{startItemIndex}-{endItemIndex}</strong> dari <strong className="text-white font-mono">{filteredData.length}</strong> Atlet
              </span>
              {itemsPerPage !== 'All' && totalPages > 1 && (
                <span className="hidden sm:inline text-slate-600">
                  • Hal <strong className="text-blue-400 font-mono">{currentPage}</strong> / <strong className="text-white font-mono">{totalPages}</strong>
                </span>
              )}
            </div>

            {/* Complete Pagination Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {/* First Page */}
              <button
                disabled={currentPage === 1 || itemsPerPage === 'All' || loading}
                onClick={() => handlePageChange(1)}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                title="Halaman Pertama"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev Page */}
              <button
                disabled={currentPage === 1 || itemsPerPage === 'All' || loading}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                title="Halaman Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1 px-1">
                {renderPageNumbers()}
              </div>

              {/* Next Page */}
              <button
                disabled={currentPage === totalPages || itemsPerPage === 'All' || totalPages === 0 || loading}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                title="Halaman Berikutnya"
              >
                <ChevronRight size={14} />
              </button>

              {/* Last Page */}
              <button
                disabled={currentPage === totalPages || itemsPerPage === 'All' || totalPages === 0 || loading}
                onClick={() => handlePageChange(totalPages)}
                className="p-1.5 sm:p-2 bg-slate-800 hover:bg-blue-600 disabled:opacity-20 text-white rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                title="Halaman Terakhir"
              >
                <ChevronsRight size={14} />
              </button>

              {/* Refresh Button */}
              <button
                onClick={fetchRankings}
                disabled={loading}
                className="ml-1 sm:ml-2 p-1.5 sm:p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-all border border-slate-700 hover:border-blue-500 cursor-pointer"
                title="Segarkan Data"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin text-blue-400' : ''} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MATRIX */}
      <MatrixModal isOpen={isMatrixOpen} onClose={() => setIsMatrixOpen(false)} />

      {/* MODAL PLAYER DETAIL */}
      {selectedPlayer && (
        <PlayerDetailModal
          player={selectedPlayer}
          globalRank={dbRankings.findIndex((p) => p.id === selectedPlayer.id) + 1}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.6);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 9999px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
        }
        table { border-spacing: 0; }
      `}</style>
    </section>
  );
};

export default Rankings;
