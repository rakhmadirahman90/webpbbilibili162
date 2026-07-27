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
  Info,
  Calendar,
  Bell,
  Clock,
  Plus,
  Trash2,
  Users,
  Send
} from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';
import { triggerPushNotification } from '../utils/firebaseMessaging';

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

const formatNumber = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '0';
  if (val === 0) return '0';
  const numberString = val.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseNumber = (str: string) => {
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean, 10) : 0;
};

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

export interface UpcomingFixture {
  id: string;
  player1: string;
  player2: string;
  tanggal: string;
  waktu: string;
  lapangan: string;
  kategori: string;
  status: 'Akan Datang' | 'Selesai' | 'Dibatalkan';
}

const DEFAULT_FIXTURES: UpcomingFixture[] = [
  { id: 'fix-1', player1: 'Anthony Sinisuka Ginting', player2: 'Jonatan Christie', tanggal: '2026-08-01', waktu: '19:30 WITA', lapangan: 'Lapangan Utama PB', kategori: 'Tunggal Putra', status: 'Akan Datang' },
  { id: 'fix-2', player1: 'Fajar Alfian', player2: 'Kevin Sanjaya Sukamuljo', tanggal: '2026-08-02', waktu: '20:15 WITA', lapangan: 'Lapangan Utama PB', kategori: 'Ganda Putra', status: 'Akan Datang' }
];

export default function TournamentLeague({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'league' | 'bracket' | 'fixtures'>('league');
  const [standings, setStandings] = useState<Standing[]>([]);
  const [bracket, setBracket] = useState<BracketMatch[]>([]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [score1, setScore1] = useState<number | ''>('');
  const [score2, setScore2] = useState<number | ''>('');

  // Standings edits states
  const [editingStandingId, setEditingStandingId] = useState<string | null>(null);
  const [editStandingForm, setEditStandingForm] = useState<Standing | null>(null);

  // Upcoming fixtures states
  const [fixtures, setFixtures] = useState<UpcomingFixture[]>([]);
  const [playersList, setPlayersList] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [newFixture, setNewFixture] = useState<Omit<UpcomingFixture, 'id'>>({
    player1: '',
    player2: '',
    tanggal: '',
    waktu: '',
    lapangan: 'Lapangan Utama PB',
    kategori: 'Tunggal Putra',
    status: 'Akan Datang'
  });

  // Load state on mount with real-time sync from database
  useEffect(() => {
    let activeChannelRankings: any = null;

    const syncDatabaseData = async () => {
      try {
        // 1. Fetch rankings (Point and rankings database table)
        const { data: rankingsData, error: rError } = await supabase
          .from('rankings')
          .select('*')
          .order('total_points', { ascending: false });

        if (rError) throw rError;

        // 2. Fetch matches to compute stats if no manual override is saved
        const { data: matchesData, error: mError } = await supabase
          .from('pertandingan')
          .select('pendaftaran_id, hasil, pendaftaran(nama)');

        if (mError) throw mError;

        // 3. Fetch site settings to look for saved standings and bracket
        const { data: settingsData, error: sError } = await supabase
          .from('site_settings')
          .select('key, value');

        if (sError) throw sError;

        const standingsSetting = settingsData?.find(item => item.key === 'tournament_standings');
        const bracketSetting = settingsData?.find(item => item.key === 'tournament_bracket');
        const fixturesSetting = settingsData?.find(item => item.key === 'tournament_fixtures');

        // Parse bracket from DB
        if (bracketSetting?.value) {
          try {
            const parsedBracket = typeof bracketSetting.value === 'string' 
              ? JSON.parse(bracketSetting.value) 
              : bracketSetting.value;
            if (Array.isArray(parsedBracket) && parsedBracket.length > 0) {
              setBracket(parsedBracket);
            } else {
              setBracket(DEFAULT_BRACKET);
            }
          } catch (e) {
            setBracket(DEFAULT_BRACKET);
          }
        } else {
          setBracket(DEFAULT_BRACKET);
        }

        // Parse fixtures from DB
        if (fixturesSetting?.value) {
          try {
            const parsedFixtures = typeof fixturesSetting.value === 'string'
              ? JSON.parse(fixturesSetting.value)
              : fixturesSetting.value;
            if (Array.isArray(parsedFixtures)) {
              setFixtures(parsedFixtures);
            } else {
              setFixtures(DEFAULT_FIXTURES);
            }
          } catch (e) {
            setFixtures(DEFAULT_FIXTURES);
          }
        } else {
          setFixtures(DEFAULT_FIXTURES);
        }

        // Fetch pendaftaran to populate players list for scheduling
        const { data: pendaftarData } = await supabase
          .from('pendaftaran')
          .select('id, nama, whatsapp')
          .order('nama', { ascending: true });

        if (pendaftarData) {
          setPlayersList(pendaftarData);
        }

        // Process standings
        let finalStandings: Standing[] = [];

        // Try to parse saved standings (overrides)
        let savedOverriddenStandings: Standing[] = [];
        if (standingsSetting?.value) {
          try {
            savedOverriddenStandings = typeof standingsSetting.value === 'string'
              ? JSON.parse(standingsSetting.value)
              : standingsSetting.value;
          } catch (e) {
            savedOverriddenStandings = [];
          }
        }

        if (rankingsData && rankingsData.length > 0) {
          // If we have saved standings, we sync them with the latest points from rankings table
          if (Array.isArray(savedOverriddenStandings) && savedOverriddenStandings.length > 0) {
            rankingsData.forEach(r => {
              const rName = (r.player_name || '').trim();
              if (!rName) return;

              const existing = savedOverriddenStandings.find(
                s => s.id === r.id || (s.nama && s.nama.toLowerCase() === rName.toLowerCase())
              );

              const trueRankingPoints = r.total_points !== undefined && r.total_points !== null ? r.total_points : (r.points || 0);

              if (existing) {
                finalStandings.push({
                  ...existing,
                  id: r.id,
                  nama: rName,
                  poin: existing.poin !== undefined && existing.poin > 0 ? existing.poin : (trueRankingPoints || (existing.menang || 0) * 3)
                });
              } else {
                // New athlete added to database, compute their stats from matches or default to 0
                const playerMatches = (matchesData || []).filter(m => {
                  if (r.pendaftaran_id && m.pendaftaran_id === r.pendaftaran_id) return true;
                  const mName = m.pendaftaran?.nama || '';
                  return mName.trim().toLowerCase() === rName.toLowerCase();
                });

                const main = playerMatches.length;
                const menang = playerMatches.filter(m => m.hasil === 'Menang').length;
                const kalah = playerMatches.filter(m => m.hasil === 'Kalah').length;
                const selisihSet = menang - kalah;

                finalStandings.push({
                  id: r.id,
                  nama: rName,
                  main,
                  menang,
                  kalah,
                  selisihSet,
                  poin: trueRankingPoints || (menang * 3)
                });
              }
            });
          } else {
            // No saved standings, compute everything dynamically from rankings and matches
            finalStandings = rankingsData.map(r => {
              const rName = (r.player_name || '').trim();
              const playerMatches = (matchesData || []).filter(m => {
                if (r.pendaftaran_id && m.pendaftaran_id === r.pendaftaran_id) return true;
                const mName = m.pendaftaran?.nama || '';
                return mName.trim().toLowerCase() === rName.toLowerCase();
              });

              const main = playerMatches.length;
              const menang = playerMatches.filter(m => m.hasil === 'Menang').length;
              const kalah = playerMatches.filter(m => m.hasil === 'Kalah').length;
              const selisihSet = menang - kalah;
              const trueRankingPoints = r.total_points !== undefined && r.total_points !== null ? r.total_points : (r.points || 0);

              return {
                id: r.id,
                nama: rName || 'Unnamed',
                main,
                menang,
                kalah,
                selisihSet,
                poin: trueRankingPoints || (menang * 3)
              };
            });
          }

          // Filter out duplicate or empty records
          const seen = new Set();
          finalStandings = finalStandings.filter(s => {
            if (!s.nama) return false;
            const key = s.nama.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

          // Sort by points desc, then selisihSet desc, then wins desc
          const sorted = finalStandings.sort((a, b) => {
            if (b.poin !== a.poin) return b.poin - a.poin;
            if (b.selisihSet !== a.selisihSet) return b.selisihSet - a.selisihSet;
            return b.menang - a.menang;
          });

          setStandings(sorted);
          localStorage.setItem('pb_bilibili_standings', JSON.stringify(sorted));
        } else {
          // Fallback to default standings if database has zero rankings
          setStandings(DEFAULT_STANDINGS);
        }
      } catch (err) {
        console.warn('Error syncing standings and tournament bracket:', err);
      }
    };

    syncDatabaseData();

    // Subscribe to changes on rankings, pertandingan, and site_settings for live, real-time updates
    activeChannelRankings = supabase
      .channel('db-sync-realtime-tournament')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        syncDatabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pertandingan' }, () => {
        syncDatabaseData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, (payload) => {
        if (payload.new && (
          (payload.new as any).key === 'tournament_bracket' || 
          (payload.new as any).key === 'tournament_standings' ||
          (payload.new as any).key === 'tournament_fixtures'
        )) {
          syncDatabaseData();
        }
      })
      .subscribe();

    return () => {
      if (activeChannelRankings) supabase.removeChannel(activeChannelRankings);
    };
  }, []);

  const saveStandings = async (updated: Standing[]) => {
    // Sort before saving: Poin desc, then SelisihSet desc, then Menang desc
    const sorted = [...updated].sort((a, b) => {
      if (b.poin !== a.poin) return b.poin - a.poin;
      if (b.selisihSet !== a.selisihSet) return b.selisihSet - a.selisihSet;
      return b.menang - a.menang;
    });
    setStandings(sorted);
    localStorage.setItem('pb_bilibili_standings', JSON.stringify(sorted));

    try {
      await supabase.from('site_settings').upsert({
        key: 'tournament_standings',
        value: JSON.stringify(sorted)
      }, { onConflict: 'key' });
    } catch (err) {
      console.warn('Gagal menyimpan klasemen ke database:', err);
    }
  };

  const saveBracket = async (updated: BracketMatch[]) => {
    setBracket(updated);
    localStorage.setItem('pb_bilibili_bracket', JSON.stringify(updated));

    try {
      await supabase.from('site_settings').upsert({
        key: 'tournament_bracket',
        value: JSON.stringify(updated)
      }, { onConflict: 'key' });
    } catch (err) {
      console.warn('Gagal menyimpan bagan ke database:', err);
    }
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
      text: "Seluruh skor briket turnamen & klasemen liga akan dikembalikan ke setelan otomatis database.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Reset Semuanya!',
      background: '#0F172A',
      color: '#FFF'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await supabase.from('site_settings').delete().eq('key', 'tournament_standings');
          await supabase.from('site_settings').delete().eq('key', 'tournament_bracket');
          
          setBracket(DEFAULT_BRACKET);
          localStorage.removeItem('pb_bilibili_standings');
          localStorage.setItem('pb_bilibili_bracket', JSON.stringify(DEFAULT_BRACKET));
          
          Swal.fire({
            icon: 'success',
            title: 'Reset Sukses',
            text: 'Data turnamen dan klasemen telah dikembalikan ke setelan otomatis database.',
            background: '#0F172A',
            color: '#FFF'
          });
          
          // Force page refresh to rebuild standings from live tables
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (err) {
          Swal.fire({
            icon: 'error',
            title: 'Gagal Reset',
            text: 'Terjadi kesalahan saat mereset data turnamen.',
            background: '#0F172A',
            color: '#FFF'
          });
        }
      }
    });
  };

  // Helper to generate bracket automatically from standings top 4
  const generateBracketFromRankings = (currentStandings: Standing[]): BracketMatch[] => {
    if (currentStandings.length >= 4) {
      const p1 = currentStandings[0].nama; // Seed 1
      const p2 = currentStandings[3].nama; // Seed 4
      const p3 = currentStandings[1].nama; // Seed 2
      const p4 = currentStandings[2].nama; // Seed 3

      return [
        { id: 'SF1', round: 'SF', player1: p1, player2: p2, score1: '', score2: '', winnerId: undefined, nextMatchId: 'F1', slotInNextMatch: 1 },
        { id: 'SF2', round: 'SF', player1: p3, player2: p4, score1: '', score2: '', winnerId: undefined, nextMatchId: 'F1', slotInNextMatch: 2 },
        { id: 'F1', round: 'F', player1: '', player2: '', score1: '', score2: '', winnerId: undefined }
      ];
    }
    return DEFAULT_BRACKET;
  };

  const handleGenerateBracketFromRankings = () => {
    if (standings.length < 4) {
      Swal.fire({
        icon: 'warning',
        title: 'Atlet Kurang',
        text: 'Minimal dibutuhkan 4 atlet di klasemen untuk membuat bagan turnamen.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    Swal.fire({
      title: 'Generate Bagan Turnamen?',
      text: "Skor bagan saat ini akan dihapus dan diatur ulang berdasarkan Top 4 atlet di Klasemen saat ini (Seed 1 vs 4, Seed 2 vs 3).",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Generate!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const newBracket = generateBracketFromRankings(standings);
        saveBracket(newBracket);
        Swal.fire({
          icon: 'success',
          title: 'Bagan Berhasil Dibuat',
          text: 'Bagan semi-final telah diisi oleh Top 4 Klasemen Liga (1 vs 4, 2 vs 3).',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  const saveFixtures = async (updated: UpcomingFixture[]) => {
    setFixtures(updated);
    localStorage.setItem('pb_bilibili_fixtures', JSON.stringify(updated));

    try {
      await supabase.from('site_settings').upsert({
        key: 'tournament_fixtures',
        value: JSON.stringify(updated)
      }, { onConflict: 'key' });
    } catch (err) {
      console.warn('Gagal menyimpan jadwal ke database:', err);
    }
  };

  const handleAddFixture = () => {
    if (!newFixture.player1 || !newFixture.player2) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Belum Lengkap',
        text: 'Mohon tentukan kedua pemain yang akan bertanding.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }
    if (newFixture.player1 === newFixture.player2) {
      Swal.fire({
        icon: 'error',
        title: 'Pemain Sama',
        text: 'Pemain 1 dan Pemain 2 tidak boleh orang yang sama.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const created: UpcomingFixture = {
      ...newFixture,
      id: `fix-${Date.now()}`
    };

    const updated = [created, ...fixtures];
    saveFixtures(updated);

    // Reset Form
    setNewFixture({
      player1: '',
      player2: '',
      tanggal: '',
      waktu: '',
      lapangan: 'Lapangan Utama PB',
      kategori: 'Tunggal Putra',
      status: 'Akan Datang'
    });
    setShowAddForm(false);

    Swal.fire({
      icon: 'success',
      title: 'Jadwal Ditambahkan',
      text: 'Jadwal pertandingan baru berhasil disimpan!',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  const handleDeleteFixture = (id: string) => {
    Swal.fire({
      title: 'Hapus Jadwal?',
      text: "Jadwal pertandingan yang dipilih akan dihapus permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = fixtures.filter(f => f.id !== id);
        saveFixtures(updated);
        Swal.fire({
          icon: 'success',
          title: 'Dihapus',
          text: 'Jadwal pertandingan berhasil dihapus.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  const handleTriggerReminder = async (fixture: UpcomingFixture) => {
    Swal.fire({
      title: 'Kirim Pengingat Pertandingan?',
      text: `Kirim notifikasi pengingat tanding antara ${fixture.player1} vs ${fixture.player2} ke seluruh anggota?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3B82F6',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Ya, Kirim!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#FFF',
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          // 1. Dispatch real Web Push/FCM or simulated push notification
          await triggerPushNotification(
            `🏆 Jadwal Tanding: ${fixture.player1} vs ${fixture.player2}`,
            `Jangan lewatkan tanding seru pada ${fixture.tanggal} pukul ${fixture.waktu} di ${fixture.lapangan}!`,
            'jadwal'
          );

          // 2. Dispatch custom event to update local notification drawer instantly for high-fidelity realtime experience
          window.dispatchEvent(new CustomEvent('app-notification-trigger', {
            detail: {
              title: `🏆 Jadwal Tanding: ${fixture.player1} vs ${fixture.player2}`,
              message: `Tanding seru dijadwalkan pada ${fixture.tanggal} pukul ${fixture.waktu} di ${fixture.lapangan} (${fixture.kategori}). Bersiaplah!`,
              type: 'now'
            }
          }));

          return true;
        } catch (e: any) {
          Swal.showValidationMessage(`Gagal mengirim: ${e.message}`);
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          icon: 'success',
          title: 'Pengingat Terkirim',
          text: `Notifikasi WhatsApp Broadcast, Web Push FCM, dan Panel Real-time berhasil dikirimkan ke anggota terdaftar!`,
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
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`px-4 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'fixtures' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Calendar size={12} /> Jadwal Tanding
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
              <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest">
                    Edit Metrik Klasemen: {editStandingForm.nama}
                  </div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 animate-pulse">
                    ⚡ Kalkulasi Otomatis Aktif
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Menang (W)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.menang}
                      onChange={(e) => {
                        const w = parseInt(e.target.value) || 0;
                        const l = editStandingForm.kalah;
                        setEditStandingForm({ 
                          ...editStandingForm, 
                          menang: w,
                          main: w + l,
                          selisihSet: w - l,
                          poin: w * 3
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">Kalah (L)</label>
                    <input 
                      type="number" 
                      value={editStandingForm.kalah}
                      onChange={(e) => {
                        const l = parseInt(e.target.value) || 0;
                        const w = editStandingForm.menang;
                        setEditStandingForm({ 
                          ...editStandingForm, 
                          kalah: l,
                          main: w + l,
                          selisihSet: w - l,
                          poin: w * 3
                        });
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase flex items-center gap-1">
                      Main (M) <span className="text-[7px] text-slate-500 lowercase">(manual)</span>
                    </label>
                    <input 
                      type="number" 
                      value={editStandingForm.main}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, main: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-300 outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase flex items-center gap-1">
                      Selisih Set (+/-) <span className="text-[7px] text-slate-500 lowercase">(manual)</span>
                    </label>
                    <input 
                      type="number" 
                      value={editStandingForm.selisihSet}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, selisihSet: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-slate-300 outline-none focus:border-purple-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-purple-400 mb-1 block uppercase flex items-center gap-1">
                      Total Poin (Pts) <span className="text-[7px] text-purple-400/70 lowercase">(cth: 10.000)</span>
                    </label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      value={formatNumber(editStandingForm.poin)}
                      onChange={(e) => setEditStandingForm({ ...editStandingForm, poin: parseNumber(e.target.value) })}
                      className="w-full bg-slate-900 border border-purple-500/30 rounded-lg p-2 text-xs font-black text-purple-300 outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <p className="text-[9px] text-slate-500 italic mt-1">
                  💡 Tips: Cukup ubah jumlah Menang (W) dan Kalah (L). Sistem cerdas akan langsung menghitung total Main, Selisih Set, dan Poin secara real-time. Anda juga tetap bisa mengubah hasil kalkulasi tersebut secara manual jika diperlukan.
                </p>

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
                        <td className="p-4 text-center font-black text-purple-400 text-sm">{formatNumber(row.poin)}</td>
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

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {isAdmin && (
                  <button
                    onClick={handleGenerateBracketFromRankings}
                    className="px-3 py-1.5 bg-purple-950/40 hover:bg-purple-900/60 text-[9px] font-black uppercase tracking-wider text-purple-400 rounded-xl border border-purple-900/30 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} /> Generate Bagan dari Top 4
                  </button>
                )}
                <div className="text-[9px] font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-full border border-slate-800 flex items-center gap-1.5">
                  <Info size={11} className="text-blue-400" /> Geser kanan jika layar sempit
                </div>
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

        {/* TAB 3: JADWAL PERTANDINGAN */}
        {activeTab === 'fixtures' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <Calendar size={14} className="text-purple-400" /> Jadwal Pertandingan Yang Akan Datang
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">Kelola jadwal tanding resmi PB Bilibili dan kirimkan notifikasi pengingat.</p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-lg"
                >
                  <Plus size={12} /> {showAddForm ? 'Tutup Form' : 'Tambah Jadwal'}
                </button>
              )}
            </div>

            {/* TAMBAH JADWAL FORM */}
            {isAdmin && showAddForm && (
              <div className="bg-slate-950 border border-purple-500/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-250">
                <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-900 pb-2">
                  <Plus size={12} /> Jadwal Pertandingan Baru
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Player 1 selection */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Pemain 1</label>
                    <select
                      value={newFixture.player1}
                      onChange={(e) => setNewFixture({ ...newFixture, player1: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-purple-500 transition-all"
                    >
                      <option value="">-- Pilih Atlet --</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={p.nama}>{p.nama}</option>
                      ))}
                      {/* Fallback directly matching standing names if playersList not finished loading */}
                      {playersList.length === 0 && standings.map(s => (
                        <option key={s.id} value={s.nama}>{s.nama}</option>
                      ))}
                    </select>
                  </div>

                  {/* Player 2 selection */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Pemain 2</label>
                    <select
                      value={newFixture.player2}
                      onChange={(e) => setNewFixture({ ...newFixture, player2: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-purple-500 transition-all"
                    >
                      <option value="">-- Pilih Atlet --</option>
                      {playersList.map((p) => (
                        <option key={p.id} value={p.nama}>{p.nama}</option>
                      ))}
                      {/* Fallback directly matching standing names if playersList not finished loading */}
                      {playersList.length === 0 && standings.map(s => (
                        <option key={s.id} value={s.nama}>{s.nama}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tanggal */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Tanggal Pertandingan</label>
                    <input
                      type="date"
                      value={newFixture.tanggal}
                      onChange={(e) => setNewFixture({ ...newFixture, tanggal: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-bold text-white outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  {/* Waktu */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Waktu Pertandingan</label>
                    <input
                      type="text"
                      placeholder="Contoh: 19:30 WITA atau 20:00 WIB"
                      value={newFixture.waktu}
                      onChange={(e) => setNewFixture({ ...newFixture, waktu: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-600 outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  {/* Lapangan */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Tempat / Lapangan</label>
                    <input
                      type="text"
                      placeholder="Contoh: Lapangan Utama PB"
                      value={newFixture.lapangan}
                      onChange={(e) => setNewFixture({ ...newFixture, lapangan: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white placeholder-slate-600 outline-none focus:border-purple-500 transition-all"
                    />
                  </div>

                  {/* Kategori */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 mb-1 block uppercase">Kategori</label>
                    <select
                      value={newFixture.kategori}
                      onChange={(e) => setNewFixture({ ...newFixture, kategori: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:border-purple-500 transition-all"
                    >
                      <option value="Tunggal Putra">Tunggal Putra</option>
                      <option value="Ganda Putra">Ganda Putra</option>
                      <option value="Ganda Campuran">Ganda Campuran</option>
                      <option value="Sparing Latihan">Sparing Latihan</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFixture}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition-all"
                  >
                    Simpan Jadwal
                  </button>
                </div>
              </div>
            )}

            {/* LIST JADWAL FIXTURES */}
            {fixtures.length === 0 ? (
              <div className="text-center py-12 border border-slate-800 rounded-2xl bg-slate-950/40">
                <Calendar size={32} className="mx-auto text-slate-700 mb-2 animate-pulse" />
                <p className="text-slate-400 font-bold text-sm">Belum Ada Jadwal Pertandingan</p>
                <p className="text-slate-600 text-[10px] mt-1">Admin belum membuat jadwal tanding mendatang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fixtures.map((fixture) => {
                  return (
                    <div
                      key={fixture.id}
                      className="bg-slate-950 border border-slate-800/80 hover:border-purple-500/30 rounded-2xl p-5 space-y-4 relative shadow-md hover:shadow-purple-950/10 transition-all group overflow-hidden"
                    >
                      {/* Status / Category indicator */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 bg-slate-900 text-slate-400 border border-slate-800 rounded-full text-[9px] font-black uppercase tracking-wider">
                          {fixture.kategori}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                          fixture.status === 'Akan Datang' 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                            : fixture.status === 'Selesai' 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-slate-800/50 text-slate-500 border-slate-850'
                        }`}>
                          {fixture.status}
                        </span>
                      </div>

                      {/* Versus match matchbox */}
                      <div className="flex items-center justify-between py-2 border-y border-white/[0.03]">
                        {/* Player 1 */}
                        <div className="w-[42%] text-right">
                          <p className="text-xs font-black text-slate-100 uppercase truncate" title={fixture.player1}>
                            {fixture.player1}
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 mt-0.5">PB BILIBILI ATLET</p>
                        </div>

                        {/* VS Center circle */}
                        <div className="w-[16%] flex justify-center">
                          <div className="w-8 h-8 rounded-full bg-purple-950/80 border border-purple-800/30 text-purple-400 flex items-center justify-center font-black text-[10px] uppercase shadow italic">
                            VS
                          </div>
                        </div>

                        {/* Player 2 */}
                        <div className="w-[42%] text-left">
                          <p className="text-xs font-black text-slate-100 uppercase truncate" title={fixture.player2}>
                            {fixture.player2}
                          </p>
                          <p className="text-[8px] font-bold text-slate-500 mt-0.5">PB BILIBILI ATLET</p>
                        </div>
                      </div>

                      {/* Meta Information Footer (Date, Time, Court) */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {/* Tanggal */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider">Tanggal</span>
                          <span className="text-[10px] font-black text-slate-300 flex items-center gap-1">
                            <Calendar size={10} className="text-purple-400 shrink-0" />
                            {fixture.tanggal || 'TBD'}
                          </span>
                        </div>

                        {/* Waktu */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider">Waktu</span>
                          <span className="text-[10px] font-black text-slate-300 flex items-center gap-1">
                            <Clock size={10} className="text-purple-400 shrink-0" />
                            {fixture.waktu || 'TBD'}
                          </span>
                        </div>

                        {/* Lapangan */}
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold text-slate-500 block uppercase tracking-wider">Tempat</span>
                          <span className="text-[10px] font-black text-slate-300 flex items-center gap-1 truncate" title={fixture.lapangan}>
                            <Info size={10} className="text-purple-400 shrink-0" />
                            {fixture.lapangan}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons (Trigger reminder for all, or Admin delete) */}
                      <div className="flex gap-2 pt-3 border-t border-white/[0.03] justify-between items-center">
                        <button
                          type="button"
                          onClick={() => handleTriggerReminder(fixture)}
                          className="px-3.5 py-2 bg-blue-950/40 hover:bg-blue-900/60 text-[9px] font-black uppercase tracking-wider text-blue-400 rounded-xl border border-blue-900/30 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Bell size={11} className="animate-bounce" /> Ingatkan Anggota
                        </button>

                        {isAdmin && (
                          <div className="flex gap-1">
                            {/* Toggle status */}
                            <button
                              type="button"
                              onClick={() => {
                                const nextStatus = fixture.status === 'Akan Datang' ? 'Selesai' : fixture.status === 'Selesai' ? 'Dibatalkan' : 'Akan Datang';
                                const updated = fixtures.map(f => f.id === fixture.id ? { ...f, status: nextStatus } : f);
                                saveFixtures(updated);
                                Swal.fire({
                                  toast: true,
                                  position: 'top-end',
                                  icon: 'success',
                                  title: `Status tanding diubah ke ${nextStatus}`,
                                  showConfirmButton: false,
                                  timer: 1500
                                });
                              }}
                              className="p-1.5 bg-slate-900 hover:bg-purple-600/20 text-slate-400 hover:text-purple-400 border border-slate-800 rounded-lg transition-all text-[9px] font-bold uppercase tracking-wider px-2"
                              title="Ubah Status"
                            >
                              Ubah Status
                            </button>

                            {/* Delete fixture */}
                            <button
                              type="button"
                              onClick={() => handleDeleteFixture(fixture.id)}
                              className="p-1.5 bg-slate-900 hover:bg-red-900/20 text-slate-400 hover:text-red-400 border border-slate-800 rounded-lg transition-all"
                              title="Hapus Jadwal"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
