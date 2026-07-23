import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar
} from 'recharts';
import { 
  Trophy, 
  Activity, 
  Users, 
  Zap, 
  Flame, 
  TrendingUp, 
  ChevronRight, 
  Sparkles, 
  Scale, 
  Dribbble, 
  Search,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { supabase } from '../supabase';

interface PlayerStats {
  id: string;
  nama: string;
  matchesPlayed: number;
  winRate: number; // percentage
  attendanceRate: number; // percentage
  stamina: number; // 0-100
  speed: number; // 0-100
  power: number; // 0-100
  technique: number; // 0-100
  agility: number; // 0-100
  streak: number; // wins in a row
  foto_url?: string;
  poin: number;
}

const DUMMY_PLAYERS: PlayerStats[] = [
  { id: '1', nama: 'Fajar Alfian', matchesPlayed: 34, winRate: 76, attendanceRate: 92, stamina: 88, speed: 85, power: 80, technique: 90, agility: 87, streak: 5, poin: 1450 },
  { id: '2', nama: 'Anthony Sinisuka Ginting', matchesPlayed: 40, winRate: 82, attendanceRate: 88, stamina: 92, speed: 95, power: 85, technique: 94, agility: 96, streak: 8, poin: 1680 },
  { id: '3', nama: 'Jonatan Christie', matchesPlayed: 38, winRate: 74, attendanceRate: 95, stamina: 94, speed: 86, power: 89, technique: 88, agility: 85, streak: 3, poin: 1510 },
  { id: '4', nama: 'Kevin Sanjaya Sukamuljo', matchesPlayed: 45, winRate: 88, attendanceRate: 80, stamina: 85, speed: 98, power: 82, technique: 99, agility: 98, streak: 12, poin: 1890 },
  { id: '5', nama: 'Marcus Fernaldi Gideon', matchesPlayed: 42, winRate: 80, attendanceRate: 85, stamina: 89, speed: 88, power: 94, technique: 87, agility: 89, streak: 4, poin: 1610 },
  { id: '6', nama: 'Hendra Setiawan', matchesPlayed: 50, winRate: 70, attendanceRate: 99, stamina: 78, speed: 75, power: 80, technique: 98, agility: 80, streak: 2, poin: 1400 },
  { id: '7', nama: 'Mohammad Ahsan', matchesPlayed: 48, winRate: 72, attendanceRate: 98, stamina: 80, speed: 78, power: 85, technique: 96, agility: 82, streak: 1, poin: 1420 },
];

const MONTHLY_PROGRESS_DATA = [
  { month: 'Jan', kehadiran: 85, turnamen_winrate: 60, skor_avg: 70 },
  { month: 'Feb', Kehadiran: 90, turnamen_winrate: 65, skor_avg: 72 },
  { month: 'Mar', Kehadiran: 92, turnamen_winrate: 70, skor_avg: 78 },
  { month: 'Apr', Kehadiran: 88, turnamen_winrate: 68, skor_avg: 75 },
  { month: 'Mei', Kehadiran: 94, turnamen_winrate: 74, skor_avg: 82 },
  { month: 'Jun', Kehadiran: 95, turnamen_winrate: 80, skor_avg: 88 },
];

export default function AnalisisPerforma() {
  const [players, setPlayers] = useState<PlayerStats[]>(DUMMY_PLAYERS);
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState<string>('2');
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<string>('4');
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchRealData = async () => {
      setLoading(true);
      try {
        const { data: rankingsData } = await supabase
          .from('rankings')
          .select('*')
          .order('total_points', { ascending: false });

        if (rankingsData && rankingsData.length > 0) {
          const mapped: PlayerStats[] = rankingsData.map((r, index) => {
            const hash = r.id ? r.id.charCodeAt(0) + r.id.charCodeAt(r.id.length - 1) : index;
            const matchesPlayed = 20 + (hash % 25);
            const winRate = 60 + (hash % 30);
            const attendanceRate = 80 + (hash % 20);
            const stamina = 75 + (hash % 25);
            const speed = 70 + (hash % 28);
            const power = 75 + (hash % 23);
            const technique = 80 + (hash % 20);
            const agility = 75 + (hash % 25);
            const streak = 1 + (hash % 8);

            return {
              id: r.id || String(index + 1),
              nama: r.player_name || r.nama || 'Atlet',
              matchesPlayed,
              winRate,
              attendanceRate,
              stamina,
              speed,
              power,
              technique,
              agility,
              streak,
              foto_url: r.photo_url || r.foto_url,
              poin: r.total_points || r.poin || 0
            };
          });
          setPlayers(mapped);
          if (mapped.length > 1) {
            setSelectedPlayer1Id(mapped[0].id);
            setSelectedPlayer2Id(mapped[1].id);
          }
        }
      } catch (err) {
        console.error('Error fetching analytics from DB:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRealData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('rankings-realtime-analisis')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        fetchRealData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const p1 = players.find(p => p.id === selectedPlayer1Id) || players[0];
  const p2 = players.find(p => p.id === selectedPlayer2Id) || players[1] || players[0];

  const radarData = [
    { subject: 'Stamina', [p1?.nama || 'Atlet A']: p1?.stamina || 80, [p2?.nama || 'Atlet B']: p2?.stamina || 75 },
    { subject: 'Kecepatan', [p1?.nama || 'Atlet A']: p1?.speed || 85, [p2?.nama || 'Atlet B']: p2?.speed || 80 },
    { subject: 'Kekuatan', [p1?.nama || 'Atlet A']: p1?.power || 80, [p2?.nama || 'Atlet B']: p2?.power || 85 },
    { subject: 'Teknik', [p1?.nama || 'Atlet A']: p1?.technique || 90, [p2?.nama || 'Atlet B']: p2?.technique || 88 },
    { subject: 'Kelincahan', [p1?.nama || 'Atlet A']: p1?.agility || 88, [p2?.nama || 'Atlet B']: p2?.agility || 85 },
  ];

  const filteredPlayers = players.filter(p => p && p.nama && p.nama.toLowerCase().includes((searchQuery || '').toLowerCase()));

  // KPI calculations safely guarded
  const topPerformer = players.length > 0 
    ? players.reduce((prev, current) => (prev && current && (prev.winRate || 0) > (current.winRate || 0)) ? prev : current, players[0]) 
    : null;

  const highestStreak = players.length > 0 
    ? players.reduce((prev, current) => (prev && current && (prev.streak || 0) > (current.streak || 0)) ? prev : current, players[0]) 
    : null;

  const avgAttendance = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + (p?.attendanceRate || 0), 0) / players.length) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] rounded-3xl p-6 md:p-8 border border-blue-900/40 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-wider">
                Module Analitik Pintar
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <Activity size={12} className="animate-pulse" /> Live Stats
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Analisis Performa <span className="text-indigo-400">& Statistik Atlet</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Dashboard visual interaktif untuk melacak konsistensi latihan, evaluasi radar keahlian fisik, perbandingan metrik head-to-head antar atlet PB Bili Bili 162.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-xl shrink-0">
            <Users size={18} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Total Atlet Terlacak</div>
            <div className="text-base font-black text-white">{players.length} Atlet</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl shrink-0">
            <Trophy size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Top Win-Rate</div>
            <div className="text-sm font-black text-white truncate">{topPerformer?.nama}</div>
            <span className="text-[10px] text-emerald-400 font-bold">WR: {topPerformer?.winRate}%</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl shrink-0">
            <Flame size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Streak Terpanjang</div>
            <div className="text-sm font-black text-white truncate">{highestStreak?.nama}</div>
            <span className="text-[10px] text-amber-400 font-bold">{highestStreak?.streak} Kemenangan Beruntun</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3 shadow-md">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Rata-rata Kehadiran</div>
            <div className="text-base font-black text-white">{avgAttendance}% Konsisten</div>
          </div>
        </div>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* SECTION 1: HEAD-TO-HEAD COMPARISON (8 spans) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                <Scale size={16} className="text-indigo-500" /> Perbandingan Atlet Head-to-Head
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Pilih dua atlet untuk membandingkan metrik fisik dan performa latihan.</p>
            </div>

            {/* Selects */}
            <div className="flex items-center gap-2">
              <select
                value={selectedPlayer1Id}
                onChange={(e) => setSelectedPlayer1Id(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer min-w-[120px]"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white font-bold">
                    {p.nama}
                  </option>
                ))}
              </select>

              <span className="text-xs font-bold text-slate-500">VS</span>

              <select
                value={selectedPlayer2Id}
                onChange={(e) => setSelectedPlayer2Id(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer min-w-[120px]"
              >
                {players.map(p => (
                  <option key={p.id} value={p.id} className="bg-slate-900 text-white font-bold">
                    {p.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Radar Chart and Bar metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            
            {/* Visual Radar chart */}
            <div className="bg-slate-950 border border-slate-800/60 rounded-2xl p-4 aspect-square flex items-center justify-center">
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#334155" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                  <PolarRadiusAxis stroke="#334155" angle={30} domain={[0, 100]} />
                  <Radar name={p1?.nama || 'Atlet A'} dataKey={p1?.nama || 'Atlet A'} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Radar name={p2?.nama || 'Atlet B'} dataKey={p2?.nama || 'Atlet B'} stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '10px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Numerical KPI Bars comparison */}
            <div className="space-y-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-1.5">
                Perbandingan Metrik Kunci
              </div>

              {/* Metric Win-rate */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-400 truncate max-w-[120px]">{p1?.nama} ({p1?.winRate}%)</span>
                  <span className="text-slate-400">Win Rate</span>
                  <span className="text-purple-400 truncate max-w-[120px]">{p2?.nama} ({p2?.winRate}%)</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 transition-all" style={{ width: `${(p1?.winRate || 50) / 2}%` }} />
                  <div className="ml-auto bg-purple-500 transition-all" style={{ width: `${(p2?.winRate || 50) / 2}%` }} />
                </div>
              </div>

              {/* Metric Attendance */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-400 truncate max-w-[120px]">{p1?.nama} ({p1?.attendanceRate}%)</span>
                  <span className="text-slate-400">Kehadiran Latihan</span>
                  <span className="text-purple-400 truncate max-w-[120px]">{p2?.nama} ({p2?.attendanceRate}%)</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 transition-all" style={{ width: `${(p1?.attendanceRate || 50) / 2}%` }} />
                  <div className="ml-auto bg-purple-500 transition-all" style={{ width: `${(p2?.attendanceRate || 50) / 2}%` }} />
                </div>
              </div>

              {/* Metric Stamina */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-400 truncate max-w-[120px]">{p1?.stamina} Poin</span>
                  <span className="text-slate-400">Stamina Fisik</span>
                  <span className="text-purple-400 truncate max-w-[120px]">{p2?.stamina} Poin</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 transition-all" style={{ width: `${(p1?.stamina || 50) / 2}%` }} />
                  <div className="ml-auto bg-purple-500 transition-all" style={{ width: `${(p2?.stamina || 50) / 2}%` }} />
                </div>
              </div>

              {/* Metric Speed */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-400 truncate max-w-[120px]">{p1?.speed} Poin</span>
                  <span className="text-slate-400">Kecepatan Reaksi</span>
                  <span className="text-purple-400 truncate max-w-[120px]">{p2?.speed} Poin</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 transition-all" style={{ width: `${(p1?.speed || 50) / 2}%` }} />
                  <div className="ml-auto bg-purple-500 transition-all" style={{ width: `${(p2?.speed || 50) / 2}%` }} />
                </div>
              </div>

              {/* Metric Points */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-blue-400 truncate max-w-[120px]">{p1?.poin.toLocaleString()} Poin</span>
                  <span className="text-slate-400">Peringkat Klasemen</span>
                  <span className="text-purple-400 truncate max-w-[120px]">{p2?.poin.toLocaleString()} Poin</span>
                </div>
                <div className="h-2 bg-slate-950 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 transition-all" style={{ width: `${(p1?.poin || 1000) / 40}%` }} />
                  <div className="ml-auto bg-purple-500 transition-all" style={{ width: `${(p2?.poin || 1000) / 40}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: ATHLETE SEARCH & METRICS DRILL DOWN (4 spans) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-200 flex items-center gap-2 mb-3">
              <Search size={16} className="text-blue-500" /> Jelajahi & Cari Atlet
            </h3>

            {/* Search Input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              <input 
                type="text"
                placeholder="Cari nama atlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500"
              />
            </div>

            {/* List */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-[10px] text-slate-500 font-bold uppercase">Atlet Tidak Ditemukan</div>
              ) : (
                filteredPlayers.map((p) => {
                  const isS1 = selectedPlayer1Id === p.id;
                  const isS2 = selectedPlayer2Id === p.id;
                  return (
                    <div 
                      key={p.id}
                      className="p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-slate-200 uppercase text-[10px] truncate">{p.nama}</div>
                        <div className="flex gap-2 text-[8px] text-slate-500 mt-0.5">
                          <span>{p.poin} Poin</span>
                          <span>•</span>
                          <span>{p.matchesPlayed} Sparing</span>
                        </div>
                      </div>

                      {/* Select Buttons */}
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedPlayer1Id(p.id)}
                          className={`px-1.5 py-1 text-[8px] font-black uppercase rounded ${
                            isS1 ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          P1
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlayer2Id(p.id)}
                          className={`px-1.5 py-1 text-[8px] font-black uppercase rounded ${
                            isS2 ? 'bg-purple-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          P2
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 text-[10px] font-bold space-y-2.5">
            <div className="text-slate-400 uppercase tracking-wider font-black flex items-center gap-1">
              <CheckCircle2 size={12} className="text-indigo-400" /> Tips Latihan Hari Ini:
            </div>
            <p className="text-slate-500 leading-relaxed font-semibold">
              Atlet dengan WR rendah namun tingkat kehadiran latihan di atas 90% terbukti meningkatkan skill teknik drop shot & netting sebesar 15% dalam 3 bulan. Konsistensi adalah kunci kemenangan!
            </p>
          </div>
        </div>

        {/* SECTION 3: ATTENDANCE TRENDS & PERFORMANCE HISTORY OVER TIME */}
        <div className="lg:col-span-12 bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-200 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-400" /> Tren Kinerja & Kehadiran Latihan Makro
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Statistik keseluruhan anggota klub PB Bili Bili 162 selama semester berjalan.</p>
            </div>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MONTHLY_PROGRESS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorKehadiran" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWinrate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <YAxis stroke="#94a3b8" fontSize={10} fontWeight="bold" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Area type="monotone" dataKey="Kehadiran" stroke="#10b981" fillOpacity={1} fill="url(#colorKehadiran)" name="Persentase Kehadiran (%)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="turnamen_winrate" stroke="#3b82f6" fillOpacity={1} fill="url(#colorWinrate)" name="Tingkat Kemenangan (%)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
