import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from "../supabase";
import Swal from 'sweetalert2';
import { 
  Trophy, User, Activity, CheckCircle2, 
  Plus, Loader2, Trash2, Send, Clock, AlertCircle, Sparkles, RefreshCcw, Search, X, RotateCcw,
  ShieldCheck, ArrowRightLeft, ChevronDown, Database, Calendar, MapPin, Flame, Dumbbell, Award, Users
} from 'lucide-react';

interface AdminMatchProps {
  session?: any;
}

const AdminMatch: React.FC<AdminMatchProps> = ({ session }) => {
  const userRole = session?.user?.user_metadata?.role || (() => {
    const raw = localStorage.getItem('local_admin_session');
    if (raw) {
      try { return JSON.parse(raw)?.user?.user_metadata?.role || 'admin'; } catch (e) {}
    }
    return 'admin';
  })();
  const isAdmin = userRole === 'admin';

  const [activeTab, setActiveTab] = useState<'jadwal' | 'skor' | 'input'>('jadwal');

  const [players, setPlayers] = useState<any[]>([]);
  const [recentMatches, setRecentMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false); 
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [showRollbackSuccess, setShowRollbackSuccess] = useState(false); 
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [kategori, setKategori] = useState('Harian');
  const [hasil, setHasil] = useState('Menang');

  const POINT_MAP: Record<string, Record<string, number>> = {
    'Harian': { 'Menang': 20, 'Seri': 10, 'Kalah': 5 },
    'Sparing': { 'Menang': 100, 'Seri': 50, 'Kalah': 25 },
    'Internal': { 'Menang': 300, 'Seri': 0, 'Kalah': 50 },
    'Eksternal': { 'Menang': 500, 'Seri': 0, 'Kalah': 100 },
  };

  const CATEGORIES = [
    { id: 'Harian', label: 'Latihan Harian', points: '20/10/5' },
    { id: 'Sparing', label: 'Sparing Partner', points: '100/50/25' },
    { id: 'Internal', label: 'Turnamen Internal', points: '300/--/50' },
    { id: 'Eksternal', label: 'Turnamen Eksternal', points: '500/--/100' },
  ];

  // Fetch dari Pendaftaran (Master Data)
  const fetchPlayers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pendaftaran')
        .select(`
          id,
          nama,
          kategori,
          foto_url,
          atlet_stats (
            points,
            total_points,
            seed
          )
        `)
        .order('nama', { ascending: true })
        .range(0, 199);
      
      if (error) throw error;
      
      if (data) {
        const formattedPlayers = data.map(item => {
          const stats = Array.isArray(item.atlet_stats) ? item.atlet_stats[0] : item.atlet_stats;
          const basePoints = stats?.points || 0;
          const additionalPoints = stats?.total_points || 0;
          
          return {
            id: item.id,
            nama: item.nama || 'Tanpa Nama',
            foto_url: item.foto_url || null,
            total_points: basePoints + additionalPoints,
            kategori: item.kategori || stats?.seed || 'Umum'
          };
        });
        setPlayers(formattedPlayers);
      }
    } catch (err: any) {
      console.error("Gagal mengambil data ranking:", err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRecentMatches = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pertandingan')
        .select(`
          id, 
          pendaftaran_id, 
          kategori_kegiatan, 
          hasil, 
          created_at, 
          pendaftaran ( nama )
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setRecentMatches(data);
    } catch (err: any) {
      console.error("Error fetching history:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchPlayers();
    fetchRecentMatches();

    const channel = supabase
      .channel('admin_full_sync')
      .on('postgres_changes', { event: '*', table: 'pertandingan', schema: 'public' }, () => {
          fetchRecentMatches();
          fetchPlayers(); 
      })
      .on('postgres_changes', { event: '*', table: 'atlet_stats', schema: 'public' }, () => {
          fetchPlayers(); 
      })
      .on('postgres_changes', { event: '*', table: 'pendaftaran', schema: 'public' }, () => {
          fetchPlayers(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchPlayers, fetchRecentMatches]);

  const recalculateAllPoints = async () => {
    const result = await Swal.fire({
      title: 'Hitung Ulang Seluruh Poin?',
      text: "Tindakan ini akan mengalkulasi ulang semua total poin atlet berdasarkan data riwayat pertandingan!",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hitung Ulang!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      setIsRecalculating(true);
      try {
        const { data: allMatches } = await supabase.from('pertandingan').select('*');
        const { data: allStats, error: statsErr } = await supabase.from('atlet_stats').select('pendaftaran_id');
        if (statsErr) throw statsErr;

        const updatePromises = allStats.map(async (atlet) => {
          const matchPoints = (allMatches || [])
            .filter(m => m.pendaftaran_id === atlet.pendaftaran_id)
            .reduce((sum, m) => sum + (POINT_MAP[m.kategori_kegiatan]?.[m.hasil] || 0), 0);

          return supabase
            .from('atlet_stats')
            .update({ total_points: matchPoints })
            .eq('pendaftaran_id', atlet.pendaftaran_id);
        });

        await Promise.all(updatePromises);
        await fetchPlayers();
        
        Swal.fire({
          icon: 'success',
          title: 'Sinkronisasi Berhasil!',
          text: `Database ${allStats.length} Atlet berhasil disinkronkan.`,
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Sinkronisasi',
          text: err.message,
          confirmButtonColor: '#EF4444',
          background: '#0F172A',
          color: '#fff'
        });
      } finally {
        setIsRecalculating(false);
      }
    }
  };

  const createAuditLog = async (atletId: string, atletNama: string, perubahan: number, sebelum: number, sesudah: number, kat: string, res: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('audit_poin').insert([{
        atlet_id: atletId,
        atlet_nama: atletNama,
        perubahan: perubahan,
        poin_sebelum: sebelum,
        poin_sesudah: sesudah,
        admin_email: user?.email || 'System Admin',
        tipe_kegiatan: res === "Rollback" ? `Batal: ${kat}` : `${kat} (${res})`,
        created_at: new Date().toISOString()
      }]);
    } catch (err) { console.error(err); }
  };

  const syncPlayerPerformance = async (playerId: string, pointsToAdd: number, currentKategori: string, currentHasil: string) => {
    try {
      const { data: stats } = await supabase
        .from('atlet_stats')
        .select('total_points, points, player_name')
        .eq('pendaftaran_id', playerId)
        .maybeSingle();

      let playerName = "";
      let existingTotalPoints = 0;
      let basePoints = 0;

      if (!stats) {
        const { data: pendaftar } = await supabase
          .from('pendaftaran')
          .select('nama')
          .eq('id', playerId)
          .single();
        
        playerName = pendaftar?.nama || "Unknown";
        
        const { error: insErr } = await supabase
          .from('atlet_stats')
          .insert([{
            pendaftaran_id: playerId,
            player_name: playerName,
            total_points: Math.max(0, pointsToAdd),
            last_match_at: new Date().toISOString()
          }]);
        if (insErr) throw insErr;
      } else {
        playerName = stats.player_name;
        existingTotalPoints = stats.total_points || 0;
        basePoints = stats.points || 0;
        const newTotalPoints = Math.max(0, existingTotalPoints + pointsToAdd);
        
        const { error: updateError } = await supabase
          .from('atlet_stats')
          .update({
            total_points: newTotalPoints,
            last_match_at: new Date().toISOString()
          })
          .eq('pendaftaran_id', playerId);

        if (updateError) throw updateError;
      }

      await createAuditLog(playerId, playerName, pointsToAdd, (basePoints + existingTotalPoints), (basePoints + existingTotalPoints + pointsToAdd), currentKategori, currentHasil);
      return true;
    } catch (err: any) {
      console.error(err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const pointsToAdd = POINT_MAP[kategori][hasil] || 0;
      const { error: matchErr } = await supabase
        .from('pertandingan')
        .insert([{ pendaftaran_id: selectedPlayer, kategori_kegiatan: kategori, hasil: hasil }]);

      if (matchErr) throw matchErr;

      const success = await syncPlayerPerformance(selectedPlayer, pointsToAdd, kategori, hasil);

      if (success) {
        setShowSuccess(true);
        setSelectedPlayer('');
        setSearchTerm('');
        await Promise.all([fetchRecentMatches(), fetchPlayers()]);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal Menyimpan Pertandingan',
        text: err.message,
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMatch = async (id: string) => {
    const matchToDelete = recentMatches.find(m => m.id === id);
    if (!matchToDelete) return;
    const pointsToSubtract = -(POINT_MAP[matchToDelete.kategori_kegiatan][matchToDelete.hasil] || 0);
    
    const result = await Swal.fire({
      title: 'Rollback Pertandingan?',
      text: `Apakah Anda yakin ingin me-rollback pertandingan & poin untuk ${matchToDelete.pendaftaran?.nama}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Rollback!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        await syncPlayerPerformance(matchToDelete.pendaftaran_id, pointsToSubtract, matchToDelete.kategori_kegiatan, "Rollback");
        await supabase.from('pertandingan').delete().eq('id', id);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Pertandingan berhasil di-rollback!',
          showConfirmButton: false,
          timer: 3000
        });
        await Promise.all([fetchRecentMatches(), fetchPlayers()]);
      } catch (err: any) { 
        Swal.fire({
          icon: 'error',
          title: 'Gagal Rollback',
          text: err.message,
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
      } finally { 
        setIsLoading(false); 
      }
    }
  };

  const filteredPlayers = players.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const topPlayers = [...players].sort((a, b) => b.total_points - a.total_points).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#070d1a] text-white p-3 sm:p-6 md:p-8 font-sans relative overflow-x-hidden flex flex-col justify-between">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full -z-10 pointer-events-none" />
      
      <div className="max-w-5xl mx-auto w-full relative z-10 flex flex-col flex-1">
        {/* TOP HEADER - Compact for 1-screen experience */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 sm:p-5 rounded-3xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-2xl border border-blue-500/30 text-blue-400 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-[9px] font-black tracking-[0.25em] uppercase">PB BILIBILI 162</p>
              <h1 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase leading-tight">
                Jadwal & <span className="text-blue-400">Skor Club</span>
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-end sm:self-auto">
             <div className="flex flex-col items-end px-3 py-1 bg-black/40 rounded-xl border border-white/5">
                <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider">Database</span>
                <span className="text-xs font-black italic text-emerald-400">{players.length} <span className="text-[9px] text-slate-300">ATLET</span></span>
             </div>
             {isAdmin && (
               <button 
                 onClick={recalculateAllPoints} 
                 disabled={isRecalculating}
                 title="Hitung Ulang Seluruh Poin"
                 className="p-2.5 bg-emerald-950/50 border border-emerald-500/30 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-800/50 transition-all text-emerald-400 cursor-pointer shrink-0"
               >
                  {isRecalculating ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />} 
               </button>
             )}
             <button 
               onClick={() => { fetchPlayers(); fetchRecentMatches(); }} 
               className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 text-slate-200"
               disabled={isLoading}
               title="Sinkronisasi Data"
             >
                <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* MODERN TAB NAVIGATION - Responsive Pills */}
        <div className="flex bg-slate-900/90 p-1.5 rounded-2xl border border-white/10 backdrop-blur-md gap-1.5 mb-4 shadow-xl overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('jadwal')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'jadwal'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={15} />
            <span>Jadwal Latihan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('skor')}
            className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'skor'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Trophy size={15} />
            <span>Hasil & Activity</span>
          </button>

          {isAdmin ? (
            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'input'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-lg shadow-amber-500/30 font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Plus size={15} />
              <span>Input Poin</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveTab('input')}
              className={`flex-1 min-w-[120px] py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'input'
                  ? 'bg-slate-800 text-white border border-white/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck size={15} />
              <span>Info Poin</span>
            </button>
          )}
        </div>

        {/* TAB PANELS CONTAINER */}
        <div className="flex-1 min-h-0">
          {/* TAB 1: JADWAL LATIHAN RESMI */}
          {activeTab === 'jadwal' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Info Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-zinc-900 to-[#0c162d] border border-blue-500/30 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Calendar size={10} className="animate-pulse" /> Agenda Resmi
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                        <Flame size={10} /> 3 Sesi Mingguan
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase text-white">
                      Jadwal Latihan <span className="text-blue-400">PB BILIBILI 162</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Aktivitas rutin bulutangkis club diselenggarakan di dua lokasi GOR utama.
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-slate-950/80 p-3 rounded-2xl border border-amber-500/30 shrink-0 shadow-md">
                    <Clock className="text-amber-400 shrink-0 animate-pulse" size={20} />
                    <div>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Jam Operasional</p>
                      <p className="text-xs font-black text-amber-300 tracking-wide">08.00 - 12.00 WITA</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid 2 Kartu Jadwal Utama */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Latihan 1: Rabu & Jumat */}
                <div className="bg-slate-900/90 border border-blue-500/30 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg hover:border-blue-500/60 transition-all">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Hari Kerja</span>
                        <h3 className="text-base font-black text-white italic uppercase tracking-wide mt-0.5">Rabu & Jumat</h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                      <MapPin size={16} className="text-blue-400 shrink-0" />
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">Lokasi GOR</p>
                        <p className="font-bold text-white text-xs sm:text-sm">GOR SMAN 4 Parepare</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">Waktu Sesi</p>
                        <p className="font-bold text-amber-300 text-xs">08.00 - 12.00 WITA (4 Jam)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[10px] pt-0.5">
                      <Dumbbell size={14} className="text-emerald-400 shrink-0" />
                      <span>Sesi Latihan Fisik, Teknik & Sparing Anggota</span>
                    </div>
                  </div>
                </div>

                {/* Latihan 2: Hari Ahad */}
                <div className="bg-slate-900/90 border border-emerald-500/30 p-4 sm:p-5 rounded-3xl relative overflow-hidden shadow-lg hover:border-emerald-500/60 transition-all">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Calendar size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Akhir Pekan</span>
                        <h3 className="text-base font-black text-white italic uppercase tracking-wide mt-0.5">Hari Ahad (Minggu)</h3>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                      <MapPin size={16} className="text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">Lokasi GOR</p>
                        <p className="font-bold text-white text-xs sm:text-sm">GOR A4 Soreang</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 bg-black/40 p-2.5 rounded-2xl border border-white/5">
                      <Clock size={16} className="text-amber-400 shrink-0" />
                      <div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase">Waktu Sesi</p>
                        <p className="font-bold text-amber-300 text-xs">08.00 - 12.00 WITA (4 Jam)</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-[10px] pt-0.5">
                      <Dumbbell size={14} className="text-cyan-400 shrink-0" />
                      <span>Sesi Internal Game Match & Silaturahmi Club</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Catatan untuk Anggota */}
              <div className="p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-2xl flex items-center gap-3">
                <Users size={18} className="text-blue-400 shrink-0" />
                <p className="text-[11px] text-slate-300 font-medium">
                  Seluruh anggota resmi terdaftar PB Bilibili 162 wajib membawa shuttlecock dan perlengkapan latihan pribadi saat hadir di GOR.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: HASIL SKOR & ACTIVITY LOG */}
          {activeTab === 'skor' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Top Ranking Preview */}
                <div className="bg-slate-900/90 border border-white/10 p-4 sm:p-5 rounded-3xl shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-amber-400" />
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Top 5 Klasemen Atlet</h3>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{players.length} Total</span>
                  </div>

                  <div className="space-y-2">
                    {topPlayers.map((p, idx) => (
                      <div key={p.id} className="flex items-center justify-between bg-black/40 p-2.5 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                            idx === 0 ? 'bg-amber-500 text-slate-950' :
                            idx === 1 ? 'bg-slate-300 text-slate-950' :
                            idx === 2 ? 'bg-amber-700 text-white' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-white truncate">{p.nama}</span>
                        </div>
                        <span className="text-xs font-black italic text-blue-400 shrink-0">{p.total_points.toLocaleString()} PTS</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Matches Activity Log */}
                <div className="md:col-span-2 bg-slate-900/90 border border-white/10 p-4 sm:p-5 rounded-3xl shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-blue-400" />
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Activity Log Match Terakhir</h3>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">10 Terbaru</span>
                  </div>

                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {recentMatches.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-6">Belum ada riwayat pertandingan.</p>
                    ) : (
                      recentMatches.map((match: any) => (
                        <div key={match.id} className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-white/5 group hover:border-white/20 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] shrink-0 ${
                              match.hasil === 'Menang' ? 'text-emerald-400 bg-emerald-500/20 border border-emerald-500/30' : 'text-red-400 bg-red-500/20 border border-red-500/30'
                            }`}>
                              {match.hasil[0]}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase italic">{match.pendaftaran?.nama}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase">{match.kategori_kegiatan} • {match.hasil}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-400 font-black italic text-xs">+{POINT_MAP[match.kategori_kegiatan]?.[match.hasil]} PTS</span>
                            {isAdmin && (
                              <button onClick={() => deleteMatch(match.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors cursor-pointer" title="Rollback">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Matrix Config Summary */}
              <div className="bg-slate-900/60 border border-white/10 p-4 rounded-3xl">
                <h4 className="text-[10px] font-black uppercase text-amber-400 mb-2 flex items-center gap-2">
                  <Award size={14} /> Aturan Bobot Poin Pertandingan
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="bg-black/40 p-2.5 rounded-2xl border border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] text-slate-400 font-bold uppercase">{cat.label}</span>
                      <span className="text-xs font-mono font-bold text-amber-300 mt-1">{cat.points} <span className="text-[8px] text-slate-500">M/S/K</span></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INPUT POIN & SINKRONISASI (FOR ADMIN / VIEW FOR MEMBER) */}
          {activeTab === 'input' && (
            <div className="bg-slate-900/90 border border-white/10 p-4 sm:p-6 rounded-3xl shadow-2xl animate-fadeIn space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                <ShieldCheck className="text-blue-400 shrink-0" size={20} />
                <div>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Master Data Atlet Connected</p>
                  <p className="text-[10px] text-slate-400 font-medium">Terhubung dengan {players.length} atlet terdaftar dari pendaftaran PB Bilibili 162.</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    <User size={13} /> Cari & Pilih Atlet
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
                      <input 
                        type="text" 
                        placeholder="Ketik nama atlet..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/50 border border-slate-700 rounded-2xl py-2.5 pl-10 pr-4 focus:border-blue-500 outline-none transition-all text-xs font-bold text-white placeholder:text-slate-600"
                      />
                    </div>

                    <div className="relative">
                      <select 
                        value={selectedPlayer}
                        onChange={(e) => setSelectedPlayer(e.target.value)}
                        required
                        className="w-full bg-black/60 border border-slate-700 rounded-2xl py-2.5 px-4 focus:border-blue-500 outline-none transition-all text-xs font-bold appearance-none cursor-pointer text-white"
                      >
                        <option value="">-- {searchTerm ? `Hasil (${filteredPlayers.length} Atlet)` : 'Pilih Atlet'} --</option>
                        {filteredPlayers.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nama} — {p.total_points.toLocaleString()} PTS ({p.kategori})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Activity size={13} /> Jenis Kegiatan
                    </label>
                    <select 
                      value={kategori} 
                      onChange={(e) => setKategori(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded-2xl py-2.5 px-4 focus:border-blue-500 outline-none transition-all text-xs font-bold text-white cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <Trophy size={13} /> Hasil Akhir Pertandingan
                    </label>
                    <select 
                      value={hasil} 
                      onChange={(e) => setHasil(e.target.value)}
                      className="w-full bg-black/60 border border-slate-700 rounded-2xl py-2.5 px-4 focus:border-blue-500 outline-none transition-all text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="Menang">MENANG</option>
                      <option value="Seri">SERI</option>
                      <option value="Kalah">KALAH</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider">Kalkulasi Tambahan Poin:</span>
                  <span className="text-xl font-black italic text-amber-400">
                    +{POINT_MAP[kategori][hasil]} <span className="text-xs not-italic text-slate-400">PTS</span>
                  </span>
                </div>

                {isAdmin ? (
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !selectedPlayer}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-3.5 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-lg shadow-blue-600/20 text-xs"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                    <span>SINKRONKAN POIN SEKARANG</span>
                  </button>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Mode Lihat Skor & Jadwal (Anggota)</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Penambahan & pengeditan skor hanya dapat dilakukan oleh Admin Club.</p>
                  </div>
                )}
              </form>
            </div>
          )}
        </div>
      </div>

      {/* TOAST SUCCESS NOTIFICATION */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${showSuccess ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
        <div className="bg-slate-950 border border-emerald-500/50 px-6 py-3.5 rounded-full flex items-center gap-3 shadow-2xl">
          <div className="bg-emerald-500 p-1.5 rounded-full text-slate-950"><CheckCircle2 size={18} /></div>
          <div>
            <h4 className="text-white font-black uppercase text-xs leading-none">Berhasil!</h4>
            <p className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">Poin Atlet Terupdate</p>
          </div>
        </div>
      </div>

      {showRollbackSuccess && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm">
           <div className="bg-slate-900 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center gap-4">
              <RotateCcw size={48} className="text-red-500 animate-spin-slow" />
              <h2 className="text-white text-xl font-black italic uppercase">Rollback Sukses</h2>
           </div>
        </div>
      )}

      <style>{`
        .animate-spin-slow { animation: spin 3s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.25s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminMatch;
