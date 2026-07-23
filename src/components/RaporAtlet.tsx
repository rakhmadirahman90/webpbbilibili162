import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  TrendingUp, 
  Activity, 
  Search, 
  Sliders, 
  Plus, 
  Trash2, 
  User, 
  HeartPulse, 
  Award, 
  Flame, 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Calendar,
  AlertTriangle,
  Zap,
  Dribbble,
  Info,
  ChevronRight
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart,
  Bar
} from 'recharts';
import Swal from 'sweetalert2';
import { supabase } from '../supabase';

interface Injury {
  id: string;
  tipe: string;
  tanggal: string;
  status: 'Pemulihan' | 'Sembuh' | 'Cedera Aktif';
  catatan: string;
}

interface SkillEval {
  lob: number;
  smash: number;
  netting: number;
  dropShot: number;
  backhand: number;
  service: number;
}

interface PhysicalProgress {
  stamina: number;
  kecepatan: number;
  kekuatan: number;
  kelincahan: number;
  kelenturan: number;
}

interface Rapor {
  id: string; // matches ranking/user id
  nama: string;
  fisik: PhysicalProgress;
  teknik: SkillEval;
  cedera: Injury[];
  winLossHistory: { bulan: string; menang: number; kalah: number }[];
  updatedAt: string;
}

const DEFAULT_RAPOR_LIST: Rapor[] = [
  {
    id: '1',
    nama: 'Fajar Alfian',
    fisik: { stamina: 85, kecepatan: 88, kekuatan: 80, kelincahan: 87, kelenturan: 82 },
    teknik: { lob: 90, smash: 85, netting: 82, dropShot: 88, backhand: 80, service: 85 },
    cedera: [
      { id: '1', tipe: 'Cedera Engkel Kanan', tanggal: '2026-02-12', status: 'Sembuh', catatan: 'Terkilir saat latihan smash, pemulihan fisioterapi 2 minggu.' }
    ],
    winLossHistory: [
      { bulan: 'Jan', menang: 4, kalah: 1 },
      { bulan: 'Feb', menang: 3, kalah: 2 },
      { bulan: 'Mar', menang: 5, kalah: 0 },
      { bulan: 'Apr', menang: 4, kalah: 1 },
      { bulan: 'Mei', menang: 5, kalah: 1 },
      { bulan: 'Jun', menang: 6, kalah: 0 }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: '2',
    nama: 'Anthony Sinisuka Ginting',
    fisik: { stamina: 92, kecepatan: 96, kekuatan: 85, kelincahan: 94, kelenturan: 90 },
    teknik: { lob: 92, smash: 94, netting: 90, dropShot: 95, backhand: 88, service: 91 },
    cedera: [
      { id: '1', tipe: 'Kram Otot Paha Belakang', tanggal: '2026-04-18', status: 'Sembuh', catatan: 'Kelelahan turnamen beruntun, disarankan es kompres & istirahat 3 hari.' }
    ],
    winLossHistory: [
      { bulan: 'Jan', menang: 5, kalah: 0 },
      { bulan: 'Feb', menang: 4, kalah: 1 },
      { bulan: 'Mar', menang: 6, kalah: 0 },
      { bulan: 'Apr', menang: 5, kalah: 2 },
      { bulan: 'Mei', menang: 7, kalah: 0 },
      { bulan: 'Jun', menang: 8, kalah: 0 }
    ],
    updatedAt: new Date().toISOString()
  },
  {
    id: '4',
    nama: 'Kevin Sanjaya Sukamuljo',
    fisik: { stamina: 88, kecepatan: 98, kekuatan: 82, kelincahan: 98, kelenturan: 95 },
    teknik: { lob: 95, smash: 89, netting: 99, dropShot: 98, backhand: 92, service: 97 },
    cedera: [
      { id: '1', tipe: 'Cedera Bahu Kanan', tanggal: '2026-05-01', status: 'Pemulihan', catatan: 'Sedang menjalani penguatan sendi bahu dengan fisioterapis tim PB Bili Bili.' }
    ],
    winLossHistory: [
      { bulan: 'Jan', menang: 6, kalah: 0 },
      { bulan: 'Feb', menang: 5, kalah: 1 },
      { bulan: 'Mar', menang: 7, kalah: 0 },
      { bulan: 'Apr', menang: 4, kalah: 2 },
      { bulan: 'Mei', menang: 6, kalah: 1 },
      { bulan: 'Jun', menang: 9, kalah: 0 }
    ],
    updatedAt: new Date().toISOString()
  }
];

export default function RaporAtlet({ isAdmin }: { isAdmin: boolean }) {
  const [raporList, setRaporList] = useState<Rapor[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'injury' | 'edit-stats'>('overview');

  // Edit states for admins
  const [editFisik, setEditFisik] = useState<PhysicalProgress>({ stamina: 80, kecepatan: 80, kekuatan: 80, kelincahan: 80, kelenturan: 80 });
  const [editTeknik, setEditTeknik] = useState<SkillEval>({ lob: 80, smash: 80, netting: 80, dropShot: 80, backhand: 80, service: 80 });
  const [newInjury, setNewInjury] = useState({ tipe: '', tanggal: '', status: 'Cedera Aktif' as any, catatan: '' });

  useEffect(() => {
    const saved = localStorage.getItem('pb_bilibili_rapor_atlet');
    let initialList: Rapor[] = [];
    if (saved) {
      try {
        initialList = JSON.parse(saved);
      } catch (e) {
        initialList = [];
      }
    }
    setRaporList(initialList);

    // Try fetching database rankings and sync names. Filter out any non-existent athletes.
    const syncDatabaseNames = async () => {
      try {
        const { data: rankingsData } = await supabase.from('rankings').select('*');
        if (rankingsData && rankingsData.length > 0) {
          setRaporList((prev) => {
            const currentList = prev.length > 0 ? [...prev] : initialList;
            const syncedList: Rapor[] = [];

            rankingsData.forEach((r) => {
              const rName = r.player_name || r.nama || '';
              if (!rName) return;
              
              const exists = currentList.find((c) => {
                const cName = c.nama || '';
                return c.id === r.id || cName.toLowerCase() === rName.toLowerCase();
              });
              
              if (exists) {
                // Keep the existing record but ensure ID and Name matches the DB rankings precisely
                syncedList.push({
                  ...exists,
                  id: r.id || exists.id,
                  nama: rName,
                });
              } else {
                // Generate a fresh random but professional rapor for this DB athlete
                const hash = r.id ? r.id.charCodeAt(0) + r.id.charCodeAt(r.id.length - 1) : Math.floor(Math.random() * 1000);
                const baseStamina = 70 + (hash % 20);
                const baseKecepatan = 70 + (hash % 22);
                const baseKekuatan = 70 + (hash % 18);
                const baseKelincahan = 70 + (hash % 25);
                const baseKelenturan = 70 + (hash % 20);

                const baseLob = 70 + (hash % 20);
                const baseSmash = 70 + (hash % 25);
                const baseNetting = 70 + (hash % 20);
                const baseDrop = 70 + (hash % 22);
                const baseBackhand = 70 + (hash % 18);
                const baseService = 70 + (hash % 20);

                syncedList.push({
                  id: r.id || String(Math.floor(Math.random() * 1000000)),
                  nama: rName,
                  fisik: { 
                    stamina: baseStamina, 
                    kecepatan: baseKecepatan, 
                    kekuatan: baseKekuatan, 
                    kelincahan: baseKelincahan, 
                    kelenturan: baseKelenturan 
                  },
                  teknik: { 
                    lob: baseLob, 
                    smash: baseSmash, 
                    netting: baseNetting, 
                    dropShot: baseDrop, 
                    backhand: baseBackhand, 
                    service: baseService 
                  },
                  cedera: [],
                  winLossHistory: [
                    { bulan: 'Apr', menang: 2 + (hash % 4), kalah: 1 + (hash % 3) },
                    { bulan: 'Mei', menang: 3 + (hash % 4), kalah: 1 + (hash % 3) },
                    { bulan: 'Jun', menang: 4 + (hash % 4), kalah: 1 + (hash % 3) }
                  ],
                  updatedAt: new Date().toISOString()
                });
              }
            });

            // Clean up duplicates by name
            const finalCleanedList: Rapor[] = [];
            const namesSeen = new Set();
            syncedList.forEach((item) => {
              const lowerName = item.nama.toLowerCase();
              if (!namesSeen.has(lowerName)) {
                namesSeen.add(lowerName);
                finalCleanedList.push(item);
              }
            });

            localStorage.setItem('pb_bilibili_rapor_atlet', JSON.stringify(finalCleanedList));
            return finalCleanedList;
          });
        } else {
          setRaporList([]);
          localStorage.setItem('pb_bilibili_rapor_atlet', JSON.stringify([]));
        }
      } catch (err) {
        console.warn('DB Sync warning for Rapor Atlet:', err);
      }
    };
    syncDatabaseNames();

    const channel = supabase
      .channel('rankings-realtime-rapor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        syncDatabaseNames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const saveRaporList = (updated: Rapor[]) => {
    setRaporList(updated);
    localStorage.setItem('pb_bilibili_rapor_atlet', JSON.stringify(updated));
  };

  const selectedRapor = raporList.find(r => r.id === selectedId) || raporList[0];

  // Set edit form values when selected athlete changes or tab changes
  useEffect(() => {
    if (selectedRapor) {
      setEditFisik({ ...selectedRapor.fisik });
      setEditTeknik({ ...selectedRapor.teknik });
      if (!selectedId || !raporList.some(r => r.id === selectedId)) {
        setSelectedId(selectedRapor.id);
      }
    }
  }, [selectedId, selectedRapor, raporList]);

  // Handle saving physical & technical updates
  const handleSaveMetrics = () => {
    if (!selectedRapor) return;

    const updated = raporList.map((r) => {
      if (r.id === selectedRapor.id) {
        return {
          ...r,
          fisik: editFisik,
          teknik: editTeknik,
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    saveRaporList(updated);
    Swal.fire({
      icon: 'success',
      title: 'Rapor Berhasil Diperbarui',
      text: `Evaluasi fisik dan teknik untuk ${selectedRapor.nama} telah sukses diperbarui.`,
      background: '#0F172A',
      color: '#FFF'
    });
  };

  // Add Injury Record
  const handleAddInjury = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInjury.tipe || !newInjury.tanggal || !newInjury.catatan) {
      Swal.fire({
        icon: 'error',
        title: 'Form Kurang Lengkap',
        text: 'Semua kolom riwayat medis/cedera wajib diisi.',
        background: '#0F172A',
        color: '#FFF'
      });
      return;
    }

    const newRec: Injury = {
      id: 'INJ-' + Math.floor(1000 + Math.random() * 9000),
      tipe: newInjury.tipe.trim(),
      tanggal: newInjury.tanggal,
      status: newInjury.status,
      catatan: newInjury.catatan.trim()
    };

    const updated = raporList.map((r) => {
      if (r.id === selectedRapor.id) {
        return {
          ...r,
          cedera: [newRec, ...r.cedera],
          updatedAt: new Date().toISOString()
        };
      }
      return r;
    });

    saveRaporList(updated);
    setNewInjury({ tipe: '', tanggal: '', status: 'Cedera Aktif', catatan: '' });

    Swal.fire({
      icon: 'success',
      title: 'Riwayat Cedera Ditambahkan',
      text: 'Catatan kondisi medis atlet berhasil tersimpan.',
      background: '#0F172A',
      color: '#FFF'
    });
  };

  // Delete Injury Record
  const handleDeleteInjury = (injId: string) => {
    Swal.fire({
      title: 'Hapus Riwayat Cedera?',
      text: "Data riwayat cedera atlet ini akan dihapus secara permanen.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#475569',
      confirmButtonText: 'Hapus',
      background: '#0F172A',
      color: '#FFF'
    }).then((result) => {
      if (result.isConfirmed) {
        const updated = raporList.map((r) => {
          if (r.id === selectedRapor.id) {
            return {
              ...r,
              cedera: r.cedera.filter(c => c.id !== injId),
              updatedAt: new Date().toISOString()
            };
          }
          return r;
        });

        saveRaporList(updated);
        Swal.fire({
          icon: 'success',
          title: 'Terhapus',
          text: 'Data riwayat cedera sukses dibuang.',
          background: '#0F172A',
          color: '#FFF'
        });
      }
    });
  };

  // Filtered names for list
  const filteredList = raporList.filter(r => (r?.nama || '').toLowerCase().includes((searchQuery || '').toLowerCase()));

  // Setup radar data for physical attributes
  const physicalRadarData = selectedRapor ? [
    { subject: 'Stamina', value: selectedRapor.fisik.stamina },
    { subject: 'Kecepatan', value: selectedRapor.fisik.kecepatan },
    { subject: 'Kekuatan', value: selectedRapor.fisik.kekuatan },
    { subject: 'Kelincahan', value: selectedRapor.fisik.kelincahan },
    { subject: 'Kelenturan', value: selectedRapor.fisik.kelenturan },
  ] : [];

  // Setup radar data for skills
  const skillsRadarData = selectedRapor ? [
    { subject: 'Lob', value: selectedRapor.teknik.lob },
    { subject: 'Smash', value: selectedRapor.teknik.smash },
    { subject: 'Netting', value: selectedRapor.teknik.netting },
    { subject: 'Drop Shot', value: selectedRapor.teknik.dropShot },
    { subject: 'Backhand', value: selectedRapor.teknik.backhand },
    { subject: 'Service', value: selectedRapor.teknik.service },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#020617] rounded-3xl p-6 md:p-8 border border-blue-500/10 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-500/20">
                Laporan & Riwayat Atlet
              </span>
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <HeartPulse size={12} className="animate-pulse" /> Health & Skill Audit
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-black text-white uppercase italic tracking-tight">
              Rapor Evaluasi <span className="text-blue-400">& Medis Atlet</span>
            </h1>
            <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl font-medium">
              Sistem rekam medis cedera, rapor perkembangan fisik makro, grafik performa kemenangan, serta visualisasi radar teknik bulutangkis.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: ATHLETE LIST & SEARCH (4 spans) */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-4">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-3">
              <Search size={14} className="text-blue-500" /> Pilih Atlet
            </h3>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={12} />
              <input 
                type="text"
                placeholder="Cari nama atlet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white font-bold outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* List Wrapper */}
          <div className="space-y-2 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
            {filteredList.map((r) => {
              const isSelected = selectedId === r.id;
              const activeInjuryCount = r.cedera.filter(c => c.status === 'Cedera Aktif').length;

              return (
                <button
                  key={r.id}
                  onClick={() => { setSelectedId(r.id); setActiveTab('overview'); }}
                  className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                    isSelected 
                      ? 'bg-blue-600/15 border-blue-500/50 text-white' 
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-xs uppercase truncate">{r.nama}</div>
                    <div className="text-[9px] text-slate-500 font-bold mt-0.5">
                      Updated: {new Date(r.updatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1.5">
                    {activeInjuryCount > 0 && (
                      <span className="px-2 py-0.5 bg-red-950 border border-red-900 text-[8px] text-red-400 font-black uppercase rounded flex items-center gap-0.5 animate-pulse">
                        <ShieldAlert size={8} /> {activeInjuryCount} Cedera
                      </span>
                    )}
                    <ChevronRight size={14} className="text-slate-600" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: EVALUATION CARD (8 spans) */}
        <div className="lg:col-span-8 space-y-6">
          {selectedRapor ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              
              {/* Profile Card Summary & Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Rapor Evaluasi</div>
                  <h2 className="text-lg font-black text-white uppercase italic tracking-tight">{selectedRapor.nama}</h2>
                </div>

                {/* Tabs */}
                <div className="flex bg-slate-950/80 p-1 rounded-xl border border-white/5 select-none self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                      activeTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Statistik & Radar
                  </button>
                  <button
                    onClick={() => setActiveTab('injury')}
                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all relative ${
                      activeTab === 'injury' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Medis & Cedera
                    {selectedRapor.cedera.length > 0 && (
                      <span className="absolute -top-1.5 -right-1 bg-red-500 w-2.5 h-2.5 rounded-full" />
                    )}
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setActiveTab('edit-stats')}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === 'edit-stats' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Update Nilai
                    </button>
                  )}
                </div>
              </div>

              {/* TAB 1: OVERVIEW METRICS & DOUBLE RADAR */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  
                  {/* Two Radar Charts: Physical vs Technical Skills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Radar Fisik */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col items-center justify-between">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1 w-full text-center mb-2">
                        Perkembangan Fisik Atlet
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={physicalRadarData}>
                          <PolarGrid stroke="#1e293b" />
                          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                          <PolarRadiusAxis stroke="#1e293b" angle={30} domain={[0, 100]} />
                          <Radar name="Fisik" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '9px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Radar Teknik */}
                    <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col items-center justify-between">
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-1 w-full text-center mb-2">
                        Evaluasi Teknik Bulutangkis
                      </div>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillsRadarData}>
                          <PolarGrid stroke="#1e293b" />
                          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                          <PolarRadiusAxis stroke="#1e293b" angle={30} domain={[0, 100]} />
                          <Radar name="Teknik" dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.25} />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#fff', fontSize: '9px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Win/Loss Line Progress Chart */}
                  <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-900 pb-2 mb-4 flex items-center justify-between">
                      <span>Tren Kemenangan/Kekalahan Harian</span>
                      <span className="text-[8px] text-indigo-400">Rasio Match Bulanan</span>
                    </div>

                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedRapor.winLossHistory} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="bulan" stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                          <YAxis stroke="#94a3b8" fontSize={9} fontWeight="bold" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', fontSize: '10px' }} />
                          <Legend wrapperStyle={{ fontSize: '9px' }} />
                          <Line type="monotone" dataKey="menang" stroke="#10b981" name="Menang" strokeWidth={2.5} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="kalah" stroke="#ef4444" name="Kalah" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MEDICAL HISTORY & INJURY TRACKING */}
              {activeTab === 'injury' && (
                <div className="space-y-6">
                  
                  {/* Warning Disclaimer */}
                  <div className="bg-amber-950/40 border border-amber-900/30 p-4 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                    <p className="text-[10px] text-amber-200/80 leading-relaxed font-semibold">
                      <strong>Kebijakan Medis PB Bili Bili 162:</strong> Pemain yang menyandang status <span className="text-red-400">Cedera Aktif</span> dilarang melakukan sparring kompetitif di lapangan utama tanpa persetujuan / surat clearance tertulis dari fisioterapis / tim medis klub.
                    </p>
                  </div>

                  {/* Add Injury Form (Admin Only) */}
                  {isAdmin && (
                    <form onSubmit={handleAddInjury} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest pb-1 border-b border-slate-900">
                        Input Laporan Cedera Baru
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Tipe/Nama Cedera</label>
                          <input 
                            type="text" 
                            placeholder="Contoh: Cedera Bahu" 
                            value={newInjury.tipe}
                            onChange={(e) => setNewInjury({...newInjury, tipe: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Tanggal Cedera</label>
                          <input 
                            type="date" 
                            value={newInjury.tanggal}
                            onChange={(e) => setNewInjury({...newInjury, tanggal: e.target.value})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs text-white outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Status Terakhir</label>
                          <select 
                            value={newInjury.status}
                            onChange={(e) => setNewInjury({...newInjury, status: e.target.value as any})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500"
                          >
                            <option value="Cedera Aktif">Cedera Aktif</option>
                            <option value="Pemulihan">Pemulihan</option>
                            <option value="Sembuh">Sembuh</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-[8px] font-bold text-slate-500 mb-1 block uppercase">Rincian & Catatan Medis</label>
                        <textarea 
                          rows={2}
                          placeholder="Tuliskan rekomendasi dokter, sisa waktu istirahat, atau pantangan gerakan..."
                          value={newInjury.catatan}
                          onChange={(e) => setNewInjury({...newInjury, catatan: e.target.value})}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-blue-500 resize-none"
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                        >
                          <Plus size={12} /> Tambah Rekam Medis
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Injuries List */}
                  <div className="space-y-3">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Riwayat Rekam Medis Atlet
                    </div>

                    {selectedRapor.cedera.length === 0 ? (
                      <div className="p-8 text-center bg-slate-950 rounded-2xl border border-dashed border-slate-850">
                        <HeartPulse size={30} className="text-slate-700 mx-auto mb-2" />
                        <div className="text-slate-400 font-bold text-xs uppercase">Bebas Cedera (Fit)</div>
                        <p className="text-[9px] text-slate-500 mt-1">Atlet dalam kondisi fisik prima dan siap bertanding penuh.</p>
                      </div>
                    ) : (
                      selectedRapor.cedera.map((c) => (
                        <div 
                          key={c.id} 
                          className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-white uppercase">{c.tipe}</span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                                c.status === 'Cedera Aktif' 
                                  ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                                  : c.status === 'Pemulihan'
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.status}
                              </span>
                            </div>
                            <span className="text-[8px] text-slate-500 font-bold block mt-1 uppercase">
                              Tgl Cedera: {new Date(c.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-2 italic bg-slate-900/50 p-2.5 rounded-lg border border-slate-900">
                              "{c.catatan}"
                            </p>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInjury(c.id)}
                              className="p-1.5 bg-red-950/50 hover:bg-red-900/60 text-red-400 hover:text-white rounded-lg border border-red-900/30 transition-all self-end sm:self-auto shrink-0"
                              title="Hapus Rekam Cedera"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: UPDATE METRICS FORM (Admin Only) */}
              {activeTab === 'edit-stats' && isAdmin && (
                <div className="space-y-6 bg-slate-950/60 border border-slate-850 p-6 rounded-2xl space-y-6">
                  
                  {/* Physical section */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest pb-1 border-b border-slate-900">
                      1. Metrik Fisik (Skala 0-100)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                      {Object.keys(editFisik).map((key) => (
                        <div key={key}>
                          <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">{key}</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={(editFisik as any)[key]}
                            onChange={(e) => setEditFisik({...editFisik, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Technical Section */}
                  <div className="space-y-4">
                    <div className="text-[10px] font-black text-purple-400 uppercase tracking-widest pb-1 border-b border-slate-900">
                      2. Metrik Teknik Bulutangkis (Skala 0-100)
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
                      {Object.keys(editTeknik).map((key) => (
                        <div key={key}>
                          <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase">{key}</label>
                          <input 
                            type="number" 
                            min="0"
                            max="100"
                            value={(editTeknik as any)[key]}
                            onChange={(e) => setEditTeknik({...editTeknik, [key]: Math.min(100, Math.max(0, parseInt(e.target.value) || 0))})}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-4 border-t border-slate-900">
                    <button
                      type="button"
                      onClick={handleSaveMetrics}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-colors shadow-lg shadow-blue-900/40"
                    >
                      Simpan Seluruh Rapor Atlet
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
              <User size={40} className="text-slate-700 mx-auto mb-2" />
              <div className="text-slate-400 font-black text-xs uppercase">Belum Ada Atlet Terpilih</div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
