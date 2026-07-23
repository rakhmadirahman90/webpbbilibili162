import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Award, 
  Plus, 
  Minus, 
  RefreshCw, 
  Flame, 
  TrendingUp, 
  UserPlus, 
  Play, 
  Pause, 
  Check, 
  Users, 
  Gamepad2, 
  Trash2,
  Share2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Swal from 'sweetalert2';

interface MatchLive {
  id: string;
  lapangan: string;
  kategori: string;
  status: 'LIVE' | 'SELESAI' | 'DELAYED';
  teamANama: string;
  teamBNama: string;
  set1A: number;
  set1B: number;
  set2A: number;
  set2B: number;
  set3A: number;
  set3B: number;
  currentPointA: number;
  currentPointB: number;
  currentSet: 1 | 2 | 3;
  serving: 'A' | 'B';
  gamePoint: boolean;
}

const DEFAULT_LIVESCORES: MatchLive[] = [
  {
    id: 'court-1',
    lapangan: 'Lapangan 1 (Utama)',
    kategori: 'Ganda Putra (A)',
    status: 'LIVE',
    teamANama: 'Fajar Alfian / M. Rian Ardianto',
    teamBNama: 'Marcus F. Gideon / Kevin Sanjaya',
    set1A: 21,
    set1B: 18,
    set2A: 19,
    set2B: 21,
    set3A: 14,
    set3B: 11,
    currentPointA: 14,
    currentPointB: 11,
    currentSet: 3,
    serving: 'A',
    gamePoint: false
  },
  {
    id: 'court-2',
    lapangan: 'Lapangan 2',
    kategori: 'Tunggal Putra',
    status: 'LIVE',
    teamANama: 'Anthony Sinisuka Ginting',
    teamBNama: 'Jonatan Christie',
    set1A: 22,
    set1B: 20,
    set2A: 18,
    set2B: 17,
    set3A: 0,
    set3B: 0,
    currentPointA: 18,
    currentPointB: 17,
    currentSet: 2,
    serving: 'B',
    gamePoint: false
  },
  {
    id: 'court-3',
    lapangan: 'Lapangan 3',
    kategori: 'Ganda Campuran (Veteran)',
    status: 'SELESAI',
    teamANama: 'Hendra Setiawan / Praveen J.',
    teamBNama: 'Tontowi Ahmad / Melati Daeva',
    set1A: 21,
    set1B: 15,
    set2A: 21,
    set2B: 19,
    set3A: 0,
    set3B: 0,
    currentPointA: 21,
    currentPointB: 19,
    currentSet: 2,
    serving: 'A',
    gamePoint: true
  }
];

export default function LiveScoreWidget({ isAdmin }: { isAdmin: boolean }) {
  const [matches, setMatches] = useState<MatchLive[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string>('court-1');
  const [dbAthletes, setDbAthletes] = useState<string[]>([]);

  // Fetch athletes from DB on load and subscribe in real-time
  useEffect(() => {
    const fetchDbAthletes = async () => {
      try {
        const { data } = await supabase.from('rankings').select('player_name');
        if (data) {
          const names = data.map(r => r.player_name).filter(Boolean);
          setDbAthletes(names);
        }
      } catch (e) {
        console.warn('Live Score athlete load error:', e);
      }
    };
    fetchDbAthletes();

    const channel = supabase
      .channel('rankings-realtime-livescore')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        fetchDbAthletes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Load from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('pb_bilibili_livescore');
    if (saved) {
      setMatches(JSON.parse(saved));
    } else {
      setMatches(DEFAULT_LIVESCORES);
      localStorage.setItem('pb_bilibili_livescore', JSON.stringify(DEFAULT_LIVESCORES));
    }
  }, []);

  const saveMatches = (updated: MatchLive[]) => {
    setMatches(updated);
    localStorage.setItem('pb_bilibili_livescore', JSON.stringify(updated));
  };

  // Play referee beep/cheer effect if score changes
  const playSound = (type: 'point' | 'gamepoint' | 'finished') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'point') {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'gamepoint') {
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.start();
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        // finished whistle
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Audio Context blocked:", e);
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || matches[0];

  const updateScore = (matchId: string, team: 'A' | 'B', action: 'add' | 'sub') => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        let val = team === 'A' ? m.currentPointA : m.currentPointB;
        if (action === 'add') {
          val += 1;
          playSound('point');
        } else {
          val = Math.max(0, val - 1);
        }

        const newMatch = { ...m };
        if (team === 'A') {
          newMatch.currentPointA = val;
          // Set current set score too
          if (m.currentSet === 1) newMatch.set1A = val;
          else if (m.currentSet === 2) newMatch.set2A = val;
          else newMatch.set3A = val;
        } else {
          newMatch.currentPointB = val;
          if (m.currentSet === 1) newMatch.set1B = val;
          else if (m.currentSet === 2) newMatch.set2B = val;
          else newMatch.set3B = val;
        }

        // Auto determine Game Point
        const otherScore = team === 'A' ? newMatch.currentPointB : newMatch.currentPointA;
        if (val >= 20 && val > otherScore) {
          newMatch.gamePoint = true;
          playSound('gamepoint');
        } else {
          newMatch.gamePoint = false;
        }

        return newMatch;
      }
      return m;
    });

    saveMatches(updated);
  };

  const handleManualSetChange = (matchId: string, setNum: 1 | 2 | 3) => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        let ptA = 0;
        let ptB = 0;
        if (setNum === 1) { ptA = m.set1A; ptB = m.set1B; }
        else if (setNum === 2) { ptA = m.set2A; ptB = m.set2B; }
        else { ptA = m.set3A; ptB = m.set3B; }

        return {
          ...m,
          currentSet: setNum,
          currentPointA: ptA,
          currentPointB: ptB,
          gamePoint: false
        };
      }
      return m;
    });
    saveMatches(updated);
  };

  const handleToggleServer = (matchId: string) => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        return {
          ...m,
          serving: m.serving === 'A' ? 'B' : 'A' as any
        };
      }
      return m;
    });
    saveMatches(updated);
  };

  const handleMatchStatus = (matchId: string, stat: 'LIVE' | 'SELESAI' | 'DELAYED') => {
    const updated = matches.map((m) => {
      if (m.id === matchId) {
        if (stat === 'SELESAI') playSound('finished');
        return { ...m, status: stat };
      }
      return m;
    });
    saveMatches(updated);
  };

  const handleResetMatch = (matchId: string) => {
    Swal.fire({
      title: 'Reset Skor?',
      text: 'Semua poin dan set di pertandingan ini akan di-nolkan.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Reset',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = matches.map((m) => {
          if (m.id === matchId) {
            return {
              ...m,
              set1A: 0, set1B: 0,
              set2A: 0, set2B: 0,
              set3A: 0, set3B: 0,
              currentPointA: 0, currentPointB: 0,
              currentSet: 1 as any,
              status: 'LIVE' as any,
              gamePoint: false,
              serving: 'A' as any
            };
          }
          return m;
        });
        saveMatches(updated);
        Swal.fire({
          icon: 'success',
          title: 'Direset!',
          text: 'Pertandingan kembali ke posisi awal.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  const handleShareMatch = (m: MatchLive) => {
    if (navigator.share) {
      navigator.share({
        title: `Live Score PB Bili Bili - ${m.lapangan}`,
        text: `Pertandingan ${m.kategori} Sedang Berlangsung! ${m.teamANama} VS ${m.teamBNama}. Skor Set ${m.currentSet}: ${m.currentPointA} - ${m.currentPointB}`,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      Swal.fire({
        icon: 'info',
        title: 'Bagikan Skor',
        text: `Salin link ini untuk membagikan skor langsung! Pertandingan ${m.teamANama} VS ${m.teamBNama}`,
        background: '#0F172A',
        color: '#FFF'
      });
    }
  };

  const handleAddNewCourtLive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const lap = formData.get('lapangan') as string;
    const kat = formData.get('kategori') as string;
    const teamA = formData.get('teamA') as string;
    const teamB = formData.get('teamB') as string;

    if (!lap || !kat || !teamA || !teamB) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Wajib mengisi seluruh data court baru.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const newMatch: MatchLive = {
      id: 'court-' + Math.floor(Math.random() * 10000),
      lapangan: lap,
      kategori: kat,
      status: 'LIVE',
      teamANama: teamA,
      teamBNama: teamB,
      set1A: 0, set1B: 0,
      set2A: 0, set2B: 0,
      set3A: 0, set3B: 0,
      currentPointA: 0,
      currentPointB: 0,
      currentSet: 1,
      serving: 'A',
      gamePoint: false
    };

    saveMatches([newMatch, ...matches]);
    setSelectedMatchId(newMatch.id);
    e.currentTarget.reset();

    Swal.fire({
      icon: 'success',
      title: 'Court Live Ditambahkan',
      text: 'Pertandingan baru berhasil terdaftar secara live.',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  const handleDeleteCourt = (matchId: string) => {
    Swal.fire({
      title: 'Hapus Court?',
      text: 'Pertandingan pada court ini akan dihilangkan dari dashboard.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Hapus',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const filtered = matches.filter(m => m.id !== matchId);
        saveMatches(filtered);
        if (selectedMatchId === matchId && filtered.length > 0) {
          setSelectedMatchId(filtered[0].id);
        }
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Court telah ditiadakan.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#101B2B] to-[#040812] rounded-3xl p-6 md:p-8 border border-blue-500/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-red-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Live Broadcast
              </span>
              <span className="text-[10px] text-slate-400 font-bold">PB Bili Bili 162 Court Streamer</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Widget Live Score <span className="text-blue-400">Digital Lapangan</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Sistem penyiaran digital skor badminton internal. Didesain menyerupai siaran televisi profesional BWF Super Series.
            </p>
          </div>

          {/* Sound & Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-3 rounded-2xl border transition-all active:scale-95 flex items-center justify-center ${
                soundEnabled 
                  ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? "Nonaktifkan Bunyi Wasit" : "Aktifkan Bunyi Wasit"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ACTIVE COURTS LIST & ADD COURT (4 spans) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Gamepad2 size={14} className="text-blue-500" /> Pilih Lapangan Aktif
            </h3>

            {/* Match List */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto custom-scrollbar pr-1">
              {matches.map((m) => {
                const isSelected = selectedMatchId === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected 
                        ? 'bg-blue-600/15 border-blue-500/50 text-white' 
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/10">
                          {m.lapangan}
                        </span>
                        {m.status === 'LIVE' && (
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                        )}
                      </div>
                      <div className="font-bold text-[10px] text-white truncate">{m.teamANama}</div>
                      <div className="text-[8px] text-slate-500 font-bold uppercase py-0.5">VS</div>
                      <div className="font-bold text-[10px] text-white truncate">{m.teamBNama}</div>
                    </div>

                    {/* Compact score bubble */}
                    <div className="bg-slate-950 px-2.5 py-2 rounded-xl border border-slate-800 text-center shrink-0 min-w-[50px]">
                      <span className="text-[11px] font-black text-emerald-400">{m.currentPointA}</span>
                      <span className="text-[10px] text-slate-600 font-bold mx-1">-</span>
                      <span className="text-[11px] font-black text-amber-400">{m.currentPointB}</span>
                      <div className="text-[7px] text-slate-500 font-black uppercase mt-0.5">Set {m.currentSet}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add New Court Live Stream (Admin Only) */}
          {isAdmin && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-4">
                <Plus size={14} className="text-emerald-500" /> Buka Live Court Baru
              </h3>

              <form onSubmit={handleAddNewCourtLive} className="space-y-3">
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Nomor/Nama Lapangan</label>
                  <input 
                    name="lapangan" 
                    type="text" 
                    placeholder="Contoh: Lapangan 4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Kategori Kompetisi</label>
                  <input 
                    name="kategori" 
                    type="text" 
                    placeholder="Contoh: Tunggal Remaja (B)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Nama Pemain/Tim A</label>
                  <input 
                    name="teamA" 
                    type="text" 
                    list="atlet-list"
                    placeholder="Nama Atlet / Ganda A"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Nama Pemain/Tim B</label>
                  <input 
                    name="teamB" 
                    type="text" 
                    list="atlet-list"
                    placeholder="Nama Atlet / Ganda B"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <datalist id="atlet-list">
                  {dbAthletes.map((name, i) => (
                    <option key={i} value={name} />
                  ))}
                </datalist>

                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-950/40"
                >
                  Mulai Siarkan Pertandingan
                </button>
              </form>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: THE MAIN BWF-STYLE BOARD (8 spans) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedMatch ? (
            <div className="space-y-6">
              
              {/* Broadcast TV Frame (Main Scoreboard) */}
              <div className="bg-slate-950 border border-slate-850 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[350px]">
                
                {/* Court header with badge */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-red-600 text-white font-black text-[9px] uppercase rounded tracking-widest flex items-center gap-1">
                      {selectedMatch.status === 'LIVE' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                      {selectedMatch.status}
                    </span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {selectedMatch.lapangan} • <span className="text-blue-400">{selectedMatch.kategori}</span>
                    </span>
                  </div>

                  <button
                    onClick={() => handleShareMatch(selectedMatch)}
                    className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 rounded-xl active:scale-95 transition-all"
                    title="Bagikan Skor Langsung"
                  >
                    <Share2 size={12} />
                  </button>
                </div>

                {/* Score numbers comparison board */}
                <div className="grid grid-cols-12 gap-4 items-center">
                  
                  {/* Team A block */}
                  <div className="col-span-4 text-center md:text-right space-y-2">
                    <div className="font-black text-xs md:text-sm text-slate-100 uppercase tracking-tight leading-snug">
                      {selectedMatch.teamANama}
                    </div>
                    {selectedMatch.serving === 'A' && (
                      <span className="inline-block px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                        🏸 Serving
                      </span>
                    )}
                  </div>

                  {/* Big digital numbers */}
                  <div className="col-span-4 flex items-center justify-center gap-4">
                    <div className={`relative bg-zinc-950 w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 flex items-center justify-center shadow-inner ${
                      selectedMatch.gamePoint && selectedMatch.currentPointA > selectedMatch.currentPointB 
                        ? 'border-red-500 shadow-red-950/50' 
                        : 'border-blue-500/40'
                    }`}>
                      <span className={`text-3xl md:text-5xl font-black font-mono tracking-tighter ${
                        selectedMatch.gamePoint && selectedMatch.currentPointA > selectedMatch.currentPointB 
                          ? 'text-red-500 animate-pulse' 
                          : 'text-blue-400'
                      }`}>
                        {selectedMatch.currentPointA}
                      </span>
                    </div>

                    <span className="text-xl text-slate-700 font-bold">:</span>

                    <div className={`relative bg-zinc-950 w-16 h-20 md:w-20 md:h-24 rounded-2xl border-2 flex items-center justify-center shadow-inner ${
                      selectedMatch.gamePoint && selectedMatch.currentPointB > selectedMatch.currentPointA 
                        ? 'border-red-500 shadow-red-950/50' 
                        : 'border-blue-500/40'
                    }`}>
                      <span className={`text-3xl md:text-5xl font-black font-mono tracking-tighter ${
                        selectedMatch.gamePoint && selectedMatch.currentPointB > selectedMatch.currentPointA 
                          ? 'text-red-500 animate-pulse' 
                          : 'text-amber-400'
                      }`}>
                        {selectedMatch.currentPointB}
                      </span>
                    </div>
                  </div>

                  {/* Team B block */}
                  <div className="col-span-4 text-center md:text-left space-y-2">
                    <div className="font-black text-xs md:text-sm text-slate-100 uppercase tracking-tight leading-snug">
                      {selectedMatch.teamBNama}
                    </div>
                    {selectedMatch.serving === 'B' && (
                      <span className="inline-block px-2.5 py-0.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[8px] font-black uppercase tracking-wider">
                        🏸 Serving
                      </span>
                    )}
                  </div>

                </div>

                {/* Footer Game Point Announcement */}
                <div className="flex flex-col items-center justify-center mt-6 pt-4 border-t border-white/5 space-y-2">
                  {selectedMatch.gamePoint && (
                    <div className="px-4 py-1.5 bg-red-600 text-white text-[9px] font-black uppercase rounded-full tracking-widest animate-pulse border border-red-500">
                      Match / Game Point!
                    </div>
                  )}

                  {/* Previous Sets History Table */}
                  <div className="flex items-center gap-6 mt-2">
                    <div className="text-center">
                      <div className="text-[7px] text-slate-500 font-bold uppercase">Set 1</div>
                      <div className="text-[10px] text-slate-300 font-black">{selectedMatch.set1A} - {selectedMatch.set1B}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[7px] text-slate-500 font-bold uppercase">Set 2</div>
                      <div className="text-[10px] text-slate-300 font-black">{selectedMatch.set2A} - {selectedMatch.set2B}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[7px] text-slate-500 font-bold uppercase">Set 3</div>
                      <div className="text-[10px] text-slate-300 font-black">
                        {selectedMatch.set3A > 0 || selectedMatch.set3B > 0 ? `${selectedMatch.set3A} - ${selectedMatch.set3B}` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ADMIN CONTROLS INTERACTIVE PANEL */}
              {isAdmin && (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                  <div className="text-xs font-black text-blue-400 uppercase tracking-widest border-b border-slate-850 pb-2">
                    Panel Kontrol Wasit (Admin Only)
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Team A Point Adjustments */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between gap-4">
                      <div className="text-[9px] font-black uppercase text-blue-400">{selectedMatch.teamANama}</div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateScore(selectedMatch.id, 'A', 'add')}
                          className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <Plus size={16} /> Tambah Point
                        </button>
                        <button
                          onClick={() => updateScore(selectedMatch.id, 'A', 'sub')}
                          className="p-3 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl active:scale-95 transition-all border border-slate-800"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Team B Point Adjustments */}
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex flex-col justify-between gap-4">
                      <div className="text-[9px] font-black uppercase text-amber-400">{selectedMatch.teamBNama}</div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateScore(selectedMatch.id, 'B', 'add')}
                          className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-1 active:scale-95 transition-all"
                        >
                          <Plus size={16} /> Tambah Point
                        </button>
                        <button
                          onClick={() => updateScore(selectedMatch.id, 'B', 'sub')}
                          className="p-3 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl active:scale-95 transition-all border border-slate-800"
                        >
                          <Minus size={14} />
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Row of advanced states: Set changes, change serving, status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    
                    {/* Active Set Select */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase block">Set Pertandingan</label>
                      <div className="flex gap-1.5">
                        {[1, 2, 3].map((num) => (
                          <button
                            key={num}
                            onClick={() => handleManualSetChange(selectedMatch.id, num as any)}
                            className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${
                              selectedMatch.currentSet === num 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                            }`}
                          >
                            Set {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggle Server */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 flex flex-col justify-between">
                      <label className="text-[8px] font-bold text-slate-500 uppercase block">Servis Shuttlecock</label>
                      <button
                        onClick={() => handleToggleServer(selectedMatch.id)}
                        className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-yellow-500 font-black text-[10px] uppercase rounded-lg flex items-center justify-center gap-1.5"
                      >
                        🏸 Pindah Servis
                      </button>
                    </div>

                    {/* Match status */}
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2">
                      <label className="text-[8px] font-bold text-slate-500 uppercase block">Status Lapangan</label>
                      <div className="flex gap-1">
                        {['LIVE', 'SELESAI', 'DELAYED'].map((st) => (
                          <button
                            key={st}
                            onClick={() => handleMatchStatus(selectedMatch.id, st as any)}
                            className={`flex-1 py-2 text-[9px] font-black rounded-lg transition-all ${
                              selectedMatch.status === st 
                                ? st === 'SELESAI' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:bg-slate-850'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Danger resetting or discarding */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-850">
                    <button
                      onClick={() => handleResetMatch(selectedMatch.id)}
                      className="px-4 py-2.5 bg-red-950/50 hover:bg-red-900/40 text-red-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-wider border border-red-900/30 transition-all"
                    >
                      Reset Seluruh Poin Match
                    </button>

                    <button
                      onClick={() => handleDeleteCourt(selectedMatch.id)}
                      className="px-4 py-2.5 bg-slate-950 hover:bg-slate-900 text-slate-500 hover:text-red-400 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-850 transition-all flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Hapus Court ini
                    </button>
                  </div>

                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <Tv size={40} className="text-slate-700 mx-auto mb-2" />
              <div className="text-slate-400 font-black text-xs uppercase">Tidak Ada Lapangan Aktif</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
