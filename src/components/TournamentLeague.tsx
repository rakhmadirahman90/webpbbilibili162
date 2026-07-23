import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Tv, 
  Table, 
  GitBranch, 
  UserPlus, 
  Edit3, 
  Check, 
  RotateCcw, 
  ChevronRight, 
  Award,
  Zap,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Info
} from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface BracketMatch {
  id: string;
  round: 'QF' | 'SF' | 'F'; // Quarterfinals, Semifinals, Finals
  player1: string;
  player2: string;
  score1: number | '';
  score2: number | '';
  winnerId?: 1 | 2;
  nextMatchId?: string;
  slotInNextMatch?: 1 | 2;
}

interface Standing {
  id: string;
  nama: string;
  main: number;
  menang: number;
  kalah: number;
  selisihSet: number;
  poin: number;
}

const DEFAULT_STANDINGS: Standing[] = [
  { id: '1', nama: 'Fajar Alfian', main: 6, menang: 5, kalah: 1, selisihSet: 8, poin: 15 },
  { id: '2', nama: 'Anthony Sinisuka Ginting', main: 6, menang: 6, kalah: 0, selisihSet: 11, poin: 18 },
  { id: '3', nama: 'Jonatan Christie', main: 6, menang: 4, kalah: 2, selisihSet: 4, poin: 12 },
  { id: '4', nama: 'Kevin Sanjaya Sukamuljo', main: 6, menang: 4, kalah: 2, selisihSet: 5, poin: 12 },
  { id: '5', nama: 'Marcus Fernaldi Gideon', main: 6, menang: 3, kalah: 3, selisihSet: 0, poin: 9 },
  { id: '6', nama: 'Hendra Setiawan', main: 6, menang: 2, kalah: 4, selisihSet: -3, poin: 6 },
  { id: '7', nama: 'Mohammad Ahsan', main: 6, menang: 1, kalah: 5, selisihSet: -7, poin: 3 },
  { id: '8', nama: 'Chico Aura Dwi Wardoyo', main: 6, menang: 1, kalah: 5, selisihSet: -8, poin: 3 },
];

const DEFAULT_BRACKET: BracketMatch[] = [
  // Semi Finals
  { id: 'SF1', round: 'SF', player1: 'Anthony Ginting', player2: 'Jonatan Christie', score1: 21, score2: 18, winnerId: 1, nextMatchId: 'F1', slotInNextMatch: 1 },
  { id: 'SF2', round: 'SF', player1: 'Kevin Sanjaya', player2: 'Fajar Alfian', score1: 19, score2: 21, winnerId: 2, nextMatchId: 'F1', slotInNextMatch: 2 },
  // Finals
  { id: 'F1', round: 'F', player1: 'Anthony Ginting', player2: 'Fajar Alfian', score1: '', score2: '', winnerId: undefined }
];

export default function TournamentLeague({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'league' | 'bracket'>('league');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [score1, setScore1] = useState<number | ''>('');
  const [score2, setScore2] = useState<number | ''>('');

  // Standings edits states
  const [editingStandingId, setEditingStandingId] = useState<string | null>(null);
  const [editStandingForm, setEditStandingForm] = useState<Standing | null>(null);

  // Load state on mount
  useEffect(() => {
    const savedStandings = localStorage.getItem('pb_bilibili_standings');
    const savedBracket = localStorage.getItem('pb_bilibili_bracket');

    let initialStandings: Standing[] = DEFAULT_STANDINGS;
    if (savedStandings) {
      try {
        initialStandings = JSON.parse(savedStandings);
      } catch (e) {
        initialStandings = DEFAULT_STANDINGS;
      }
    }
    setStandings(initialStandings);

    if (savedBracket) {
      try {
        setBracket(JSON.parse(savedBracket));
      } catch (e) {
        setBracket(DEFAULT_BRACKET);
      }
    } else {
      setBracket(DEFAULT_BRACKET);
      localStorage.setItem('pb_bilibili_bracket', JSON.stringify(DEFAULT_BRACKET));
    }

    // Try fetching database rankings and sync with standing names & points
    const syncDatabaseStandings = async () => {
      try {
        const { data: rankingsData } = await supabase.from('rankings').select('*');
        if (rankingsData && rankingsData.length > 0) {
          setStandings((prev) => {
            const currentStandings = prev.length > 0 ? [...prev] : [...DEFAULT_STANDINGS];
            
            // For each record in rankings, make sure there's a corresponding standing item
            rankingsData.forEach((r) => {
              const rName = r.player_name || r.nama || '';
              if (!rName) return;

              const existingIdx = currentStandings.findIndex(
                (s) => s.id === r.id || (s.nama && s.nama.toLowerCase() === rName.toLowerCase())
              );

              const dbPoin = r.total_points || r.poin || 0;

              if (existingIdx > -1) {
                // Update their points to match DB total_points
                currentStandings[existingIdx].poin = dbPoin;
                currentStandings[existingIdx].nama = rName;
              } else {
                // Insert a new standing item for this DB athlete
                currentStandings.push({
                  id: r.id || String(Math.floor(Math.random() * 10000)),
                  nama: rName,
                  main: 0,
                  menang: 0,
                  kalah: 0,
                  selisihSet: 0,
                  poin: dbPoin,
                });
              }
            });

            // Clean up any standings that might be duplicates or obsolete
            const uniqueStandings: Standing[] = [];
            const namesSeen = new Set();
            currentStandings.forEach((s) => {
              if (!s || !s.nama) return;
              const nameLower = s.nama.toLowerCase();
              if (!namesSeen.has(nameLower)) {
                namesSeen.add(nameLower);
                uniqueStandings.push(s);
              }
            });

            // Sort by points desc, then wins
            const sorted = uniqueStandings.sort((a, b) => {
              if (b.poin !== a.poin) return b.poin - a.poin;
              if (b.selisihSet !== a.selisihSet) return b.selisihSet - a.selisihSet;
              return b.menang - a.menang;
            });

            localStorage.setItem('pb_bilibili_standings', JSON.stringify(sorted));
            return sorted;
          });
        }
      } catch (err) {
        console.warn('DB Sync warning for Tournament standings:', err);
      }
    };

    syncDatabaseStandings();

    const channel = supabase
      .channel('rankings-realtime-tournament')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        syncDatabaseStandings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveStandings = (updated: Standing[]) => {
    // Sort before saving: Poin desc, then SelisihSet desc, then Menang desc
    const sorted = [...updated].sort((a, b) => {
      if (b.poin !== a.poin) return b.poin - a.poin;
      if (b.selisihSet !== a.selisihSet) return b.selisihSet - a.selisihSet;
      return b.menang - a.menang;
    });
    setStandings(sorted);
    localStorage.setItem('pb_bilibili_standings', JSON.stringify(sorted));
  };

  const saveBracket = (updated: BracketMatch[]) => {
    setBracket(updated);
    localStorage.setItem('pb_bilibili_bracket', JSON.stringify(updated));
  };

  // Start edit match score
  const handleEditMatchClick = (m: BracketMatch) => {
    setEditingMatchId(m.id);
    setScore1(m.score1);
    setScore2(m.score2);
  };

  // Save bracket match score & propagate winner
  const handleSaveMatchScore = (matchId: string) => {
    if (score1 === '' || score2 === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Skor Kosong',
        text: 'Mohon isi skor untuk kedua pemain.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    if (score1 === score2) {
      Swal.fire({
        icon: 'error',
        title: 'Hasil Seri',
        text: 'Sparing Bulutangkis harus memiliki pemenang (tidak boleh seri).',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const winner: 1 | 2 = score1 > score2 ? 1 : 2;
    const winnerName = winner === 1 ? bracket.find(b => b.id === matchId)?.player1 : bracket.find(b => b.id === matchId)?.player2;

    const updated = bracket.map(m => {
      if (m.id === matchId) {
        return { ...m, score1, score2, winnerId: winner };
      }
      return m;
    });

    // Propagate winner to next match if applicable
    const curMatch = bracket.find(b => b.id === matchId);
    if (curMatch?.nextMatchId && winnerName) {
      const nextMatchId = curMatch.nextMatchId;
      const slot = curMatch.slotInNextMatch;

      updated.forEach((m, idx) => {
        if (m.id === nextMatchId) {
          if (slot === 1) {
            updated[idx].player1 = winnerName;
          } else {
            updated[idx].player2 = winnerName;
          }
        }
      });
    }

    saveBracket(updated);
    setEditingMatchId(null);

    Swal.fire({
      icon: 'success',
      title: 'Skor Diperbarui',
      text: `Pemenang match adalah ${winnerName}. Bagan turnamen telah terupdate!`,
      background: '#0F172A',
      color: '#FFF'
    });
  };

  // Start standing editing
  const handleEditStandingClick = (s: Standing) => {
    setEditingStandingId(s.id);
    setEditStandingForm({ ...s });
  };

  // Save standing changes
  const handleSaveStanding = () => {
    if (!editStandingForm) return;
    const updated = standings.map(s => s.id === editStandingForm.id ? editStandingForm : s);
    saveStandings(updated);
    setEditingStandingId(null);
    setEditStandingForm(null);

    Swal.fire({
      icon: 'success',
      title: 'Klasemen Diperbarui',
      text: 'Data klasemen liga internal berhasil diperbarui & diurutkan ulang.',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  // Reset tournament default
  const handleResetTournament = () => {
    Swal.fire({
      title: 'Reset Data Turnamen?',
      text: "Seluruh skor briket turnamen & klasemen liga akan dikembalikan ke setelan pabrik.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Reset Semuanya!',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        setStandings(DEFAULT_STANDINGS);
        setBracket(DEFAULT_BRACKET);
        localStorage.setItem('pb_bilibili_standings', JSON.stringify(DEFAULT_STANDINGS));
        localStorage.setItem('pb_bilibili_bracket', JSON.stringify(DEFAULT_BRACKET));
        Swal.fire({
          icon: 'success',
          title: 'Reset Sukses',
          text: 'Data turnamen dan klasemen telah dikembalikan ke setelan awal.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Title Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#111827] to-[#1E1B4B] rounded-3xl p-6 md:p-8 border border-blue-900/40 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                Internal League Engine
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold">
                <Trophy size={12} className="animate-pulse" /> Official Liga Internal
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Turnamen & <span className="text-purple-400">Klasemen Liga</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Sistem bagan turnamen sistem gugur otomatis dan klasemen kompetisi liga internal bulutangkis PB Bili Bili 162. Update hasil tanding seketika secara profesional.
            </p>
          </div>

          <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 shrink-0 select-none">
            <button
              onClick={() => setActiveTab('league')}
              className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === 'league' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Klasemen Liga
            </button>
            <button
              onClick={() => setActiveTab('bracket')}
              className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all ${
                activeTab === 'bracket' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bagan Turnamen
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        
        {/* TAB 1: KLASEMEN LIGA */}
        {activeTab === 'league' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Table size={14} className="text-purple-400" /> Klasemen Liga Internal Terupdate
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Sistem peringkat diurutkan otomatis berdasarkan akumulasi poin liga & selisih set.</p>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetTournament}
                  className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/60 text-[9px] font-black uppercase tracking-wider text-red-400 rounded-xl border border-red-900/30 transition-all flex items-center gap-1 self-start sm:self-auto"
                >
                  <RotateCcw size={10} /> Reset Liga
                </button>
              )}
            </div>

            {/* Editing Box */}
            {editingStandingId && editStandingForm && (
              <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-4 space-y-4">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                  Edit Metrik Klasemen: {editStandingForm.nama}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Main (M)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.main}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, main: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Menang (W)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.menang}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, menang: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Kalah (L)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.kalah}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, kalah: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Selisih Set (+/-)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.selisihSet}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, selisihSet: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Total Poin (Pts)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.poin}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, poin: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t border-slate-900">
                  <button
                    type="button"
                    onClick={() => { setEditingStandingId(null); setEditStandingForm(null); }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-wider"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveStanding}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                  >
                    <Check size={10} /> Simpan Perubahan
                  </button>
                </div>
              </div>
            )}

            {/* Standings Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <th className="p-4 text-center w-12">Pos</th>
                    <th className="p-4">Nama Pemain</th>
                    <th className="p-4 text-center">Main</th>
                    <th className="p-4 text-center text-emerald-400">Menang</th>
                    <th className="p-4 text-center text-red-400">Kalah</th>
                    <th className="p-4 text-center">Selisih Set</th>
                    <th className="p-4 text-center text-purple-400">Poin</th>
                    {isAdmin && <th className="p-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-xs font-bold text-slate-300">
                  {standings.map((row, index) => {
                    const isTop3 = index < 3;
                    return (
                      <tr key={row.id} className={`hover:bg-slate-900/40 transition-colors ${isTop3 ? 'bg-purple-550/5' : ''}`}>
                        <td className="p-4 text-center">
                          {isTop3 ? (
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black mx-auto text-[10px] ${
                              index === 0 ? 'bg-yellow-500 text-slate-950' : index === 1 ? 'bg-slate-300 text-slate-950' : 'bg-amber-600 text-white'
                            }`}>
                              {index + 1}
                            </span>
                          ) : (
                            <span className="text-slate-500">{index + 1}</span>
                          )}
                        </td>
                        <td className="p-4 font-black uppercase text-white flex items-center gap-2">
                          {row.nama}
                          {index === 0 && <Award size={14} className="text-yellow-500 shrink-0" />}
                        </td>
                        <td className="p-4 text-center font-bold text-slate-400">{row.main}</td>
                        <td className="p-4 text-center font-black text-emerald-400">{row.menang}</td>
                        <td className="p-4 text-center font-bold text-red-400">{row.kalah}</td>
                        <td className="p-4 text-center font-bold text-slate-400">
                          {row.selisihSet > 0 ? `+${row.selisihSet}` : row.selisihSet}
                        </td>
                        <td className="p-4 text-center font-black text-purple-400 text-sm">{row.poin}</td>
                        {isAdmin && (
                          <td className="p-4 text-right">
                            <button
                              onClick={() => handleEditStandingClick(row)}
                              className="p-1.5 bg-slate-900 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 border border-slate-800 rounded-lg transition-all"
                              title="Edit Data"
                            >
                              <Edit3 size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BAGAN TURNAMEN */}
        {activeTab === 'bracket' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <GitBranch size={14} className="text-purple-400" /> Bagan Gugur Turnamen (Bracket)
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Sistem gugur semi-finals menuju puncak babak grand-finals secara visual.</p>
              </div>

              <div className="text-[9px] font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5 self-start sm:self-auto">
                <Info size={11} className="text-blue-400" /> Geser kanan jika layar sempit
              </div>
            </div>

            {/* Playoff bracket drawing wrapper */}
            <div className="overflow-x-auto pb-4 custom-scrollbar">
              <div className="min-w-[700px] py-8 flex items-center justify-center gap-16 relative">
                
                {/* Round 1: Semifinals */}
                <div className="flex flex-col gap-12 w-64">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-b border-slate-800 pb-2 mb-2">
                    Semi-Finals
                  </div>

                  {bracket.filter(m => m.round === 'SF').map(m => {
                    const isEditing = editingMatchId === m.id;
                    const isWinner1 = m.winnerId === 1;
                    const isWinner2 = m.winnerId === 2;

                    return (
                      <div key={m.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative shadow-md">
                        {/* Match connector lines (visual css-based connection) */}
                        <div className="absolute right-[-41px] top-1/2 -translate-y-1/2 w-10 h-0.5 bg-slate-800" />

                        {/* Player 1 details */}
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase truncate max-w-[150px] ${isWinner1 ? 'text-purple-400' : 'text-slate-300'}`}>
                            {m.player1 || 'TBD Player'}
                          </span>
                          <span className={`text-[11px] font-black w-8 text-center py-0.5 rounded ${isWinner1 ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-900 text-slate-500'}`}>
                            {m.score1 !== '' ? m.score1 : '-'}
                          </span>
                        </div>

                        {/* Player 2 details */}
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase truncate max-w-[150px] ${isWinner2 ? 'text-purple-400' : 'text-slate-300'}`}>
                            {m.player2 || 'TBD Player'}
                          </span>
                          <span className={`text-[11px] font-black w-8 text-center py-0.5 rounded ${isWinner2 ? 'bg-purple-900/30 text-purple-400' : 'bg-slate-900 text-slate-500'}`}>
                            {m.score2 !== '' ? m.score2 : '-'}
                          </span>
                        </div>

                        {/* Admin Match Scorer Form */}
                        {isEditing && (
                          <div className="pt-3 border-t border-slate-900 grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Skor P1</label>
                              <input 
                                type="number" 
                                value={score1}
                                onChange={(e) => setScore1(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-bold text-white text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Skor P2</label>
                              <input 
                                type="number" 
                                value={score2}
                                onChange={(e) => setScore2(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-bold text-white text-center"
                              />
                            </div>
                            <div className="col-span-2 flex justify-end gap-1 mt-1">
                              <button 
                                onClick={() => setEditingMatchId(null)}
                                className="px-2 py-0.5 bg-slate-900 text-slate-400 text-[8px] font-black uppercase rounded"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={() => handleSaveMatchScore(m.id)}
                                className="px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black uppercase rounded"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Scorer Trigger */}
                        {isAdmin && !isEditing && (
                          <button
                            type="button"
                            onClick={() => handleEditMatchClick(m)}
                            className="w-full py-1 mt-1 bg-slate-900 hover:bg-slate-850 text-slate-500 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1"
                          >
                            <Edit3 size={10} /> Update Skor
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Vertical bracket path visualizer */}
                <div className="absolute left-[295px] top-[146px] bottom-[146px] w-0.5 bg-slate-800" />

                {/* Round 2: Grand Finals */}
                <div className="flex flex-col justify-center w-64">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center border-b border-slate-800 pb-2 mb-2">
                    Grand Finals
                  </div>

                  {bracket.filter(m => m.round === 'F').map(m => {
                    const isEditing = editingMatchId === m.id;
                    const isWinner1 = m.winnerId === 1;
                    const isWinner2 = m.winnerId === 2;

                    return (
                      <div key={m.id} className="bg-slate-950 border border-purple-500/30 rounded-2xl p-5 space-y-3 relative shadow-xl">
                        {/* Winner Trophy banner */}
                        {m.winnerId && (
                          <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-full shadow flex items-center gap-1 z-10">
                            <Trophy size={11} /> Winner Champion
                          </div>
                        )}

                        {/* Player 1 */}
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase truncate max-w-[150px] ${isWinner1 ? 'text-yellow-400' : 'text-slate-300'}`}>
                            {m.player1 || 'TBD Player'}
                          </span>
                          <span className={`text-[11px] font-black w-8 text-center py-0.5 rounded ${isWinner1 ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/20' : 'bg-slate-900 text-slate-500'}`}>
                            {m.score1 !== '' ? m.score1 : '-'}
                          </span>
                        </div>

                        {/* Player 2 */}
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black uppercase truncate max-w-[150px] ${isWinner2 ? 'text-yellow-400' : 'text-slate-300'}`}>
                            {m.player2 || 'TBD Player'}
                          </span>
                          <span className={`text-[11px] font-black w-8 text-center py-0.5 rounded ${isWinner2 ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/20' : 'bg-slate-900 text-slate-500'}`}>
                            {m.score2 !== '' ? m.score2 : '-'}
                          </span>
                        </div>

                        {/* Admin Scoring */}
                        {isEditing && (
                          <div className="pt-3 border-t border-slate-900 grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Skor P1</label>
                              <input 
                                type="number" 
                                value={score1}
                                onChange={(e) => setScore1(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-bold text-white text-center"
                              />
                            </div>
                            <div>
                              <label className="text-[8px] font-bold text-slate-500 block mb-0.5">Skor P2</label>
                              <input 
                                type="number" 
                                value={score2}
                                onChange={(e) => setScore2(e.target.value === '' ? '' : parseInt(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs font-bold text-white text-center"
                              />
                            </div>
                            <div className="col-span-2 flex justify-end gap-1 mt-1">
                              <button 
                                onClick={() => setEditingMatchId(null)}
                                className="px-2 py-0.5 bg-slate-900 text-slate-400 text-[8px] font-black uppercase rounded"
                              >
                                Batal
                              </button>
                              <button 
                                onClick={() => handleSaveMatchScore(m.id)}
                                className="px-2 py-0.5 bg-purple-600 text-white text-[8px] font-black uppercase rounded"
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Scorer Trigger */}
                        {isAdmin && !isEditing && (
                          <button
                            type="button"
                            onClick={() => handleEditMatchClick(m)}
                            className="w-full py-1.5 mt-1 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-lg text-[8px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 border border-slate-800"
                          >
                            <Edit3 size={10} /> Update Hasil Final
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
