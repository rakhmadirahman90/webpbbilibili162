import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase';
import { deleteAthleteCompletely } from '../utils/siteSettingsHelper';
import Swal from 'sweetalert2';
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Search,
  Loader2,
  User,
  RefreshCw,
  AlertCircle,
  Camera,
  ChevronLeft,
  ChevronRight,
  Zap,
  Download,
  FileText,
  Table as TableIcon,
  Info
} from 'lucide-react';
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

interface Ranking {
  id: string;
  pendaftaran_id?: string;
  player_name: string;
  category: string;
  seed: string;
  total_points: number; // Final Result (poin + bonus)
  bonus: number;        // Dari atlet_stats.total_points
  poin: number;         // Dari atlet_stats.points
  photo_url?: string;
  updated_at?: string;
}

const formatNumber = (val: number | string | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  if (val === 0) return '';
  const numberString = val.toString().replace(/[^0-9]/g, '');
  return numberString.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const parseNumber = (str: string) => {
  const clean = str.replace(/[^0-9]/g, '');
  return clean ? parseInt(clean) : 0;
};

export default function AdminRanking({ session }: { session?: any }) {
  const userRole = session?.user?.user_metadata?.role || (() => {
    const raw = localStorage.getItem('local_admin_session');
    if (raw) {
      try { return JSON.parse(raw)?.user?.user_metadata?.role || 'admin'; } catch (e) {}
    }
    return 'admin';
  })();
  const isAdmin = userRole === 'admin';

  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeed, setSelectedSeed] = useState('Semua');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState<Partial<Ranking>>({
    player_name: '',
    category: 'SENIOR',
    seed: 'Seed A',
    total_points: 0,
    bonus: 0,
    poin: 0,
    photo_url: '',
  });

  // --- LOGIKA SINKRONISASI DATA ---
  const autoSyncData = useCallback(async () => {
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('atlet_stats')
        .select('pendaftaran_id, points, total_points, seed');

      if (statsError) throw statsError;

      const { data: pendaftaranData, error: pendaftaranError } = await supabase
        .from('pendaftaran')
        .select('id, nama, foto_url, kategori_atlet');

      if (pendaftaranError) throw pendaftaranError;

      // Sumber Seed resmi: data seeded turnamen terbaru.
      // C, C+ dan C- adalah kelas yang BERBEDA dan tidak boleh digabung.
      // Jika nama atlet muncul beberapa kali, gunakan level tertinggi:
      // A > B > C+ > C > C- > D.
      const { data: tournamentRows } = await supabase
        .from('seeded_tournaments')
        .select('id')
        .order('event_start', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

      const latestTournamentId = tournamentRows?.[0]?.id;
      const { data: seededRows } = latestTournamentId
        ? await supabase
            .from('seeded_players')
            .select('player_name, seeded_quality')
            .eq('tournament_id', latestTournamentId)
        : { data: [] as any[] };

      const seedRank: Record<string, number> = { A: 6, B: 5, 'C+': 4, C: 3, 'C-': 2, D: 1 };
      const seededMap = new Map<string, string>();
      for (const row of seededRows || []) {
        const name = String(row.player_name || '').trim().toLowerCase();
        if (!name) continue;
        const quality = String(row.seeded_quality || '').trim().toUpperCase();
        if (!seedRank[quality]) continue;
        const current = seededMap.get(name);
        if (!current || seedRank[quality] > seedRank[current]) seededMap.set(name, quality);
      }

      const finalDataArray = (pendaftaranData || []).map((profile) => {
        const stat = (statsData || []).find((s) => 
          s.pendaftaran_id === profile.id ||
          (s.player_name && profile.nama && s.player_name.trim().toLowerCase() === profile.nama.trim().toLowerCase())
        );

        const basePoints = Number(stat?.points) || 0;
        const addedPointsFromStats = Number(stat?.total_points) || 0;

        const tournamentSeed = seededMap.get((profile.nama || '').trim().toLowerCase());
        const normalizedSeed = tournamentSeed ? `Seed ${tournamentSeed}` : 'Non Seeded';

        return {
          pendaftaran_id: profile.id,
          player_name: (profile.nama || '').trim().toUpperCase(),
          category: profile.kategori_atlet || 'SENIOR',
          seed: normalizedSeed,
          photo_url: profile.foto_url || null,
          poin: basePoints,
          bonus: addedPointsFromStats, 
          total_points: basePoints + addedPointsFromStats,
          updated_at: new Date().toISOString(),
        };
      }).filter(Boolean);

      if (finalDataArray.length > 0) {
        // Deduplicate by player_name to prevent PostgreSQL "ON CONFLICT DO UPDATE command cannot affect row a second time" error
        const uniqueDataMap = new Map<string, any>();
        for (const item of finalDataArray) {
          if (!item || !item.player_name) continue;
          const key = item.player_name;
          if (!uniqueDataMap.has(key)) {
            uniqueDataMap.set(key, item);
          } else {
            const existing = uniqueDataMap.get(key);
            if (item.total_points > existing.total_points) {
              uniqueDataMap.set(key, item);
            }
          }
        }
        const uniqueFinalData = Array.from(uniqueDataMap.values());

        const { error: upsertError } = await supabase
          .from('rankings')
          .upsert(uniqueFinalData, { onConflict: 'player_name' });
        
        if (upsertError) throw upsertError;
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Sync Error:', err.message);
      return false;
    }
  }, []);

  // --- PERBAIKAN FETCH DENGAN SORTING TOTAL_POINTS ---
  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      await autoSyncData();
      
      const { data, error } = await supabase
        .from('rankings')
        .select('*')
        .order('total_points', { ascending: false }); // Urutan Poin Terbesar ke Terkecil[cite: 1]

      if (error) throw error;
      setRankings(data || []);
    } catch (err: any) {
      setFormError('Gagal memuat data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [autoSyncData]);

  useEffect(() => {
    fetchRankings();
    
    const channel = supabase
      .channel('realtime_rankings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atlet_stats' }, () => {
        fetchRankings();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rankings' }, () => {
        // Refresh otomatis dengan sorting terbaru jika ada perubahan manual[cite: 1]
        supabase.from('rankings')
          .select('*')
          .order('total_points', { ascending: false })
          .then(res => {
            if(res.data) setRankings(res.data);
          });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRankings]);

  // --- HANDLERS ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.player_name) {
      setFormError('Nama atlet wajib diisi');
      return;
    }

    setIsSaving(true);
    const cleanName = formData.player_name.trim().toUpperCase();
    const base = Number(formData.poin) || 0;
    const bonus = Number(formData.bonus) || 0;
    const calculatedTotal = base + bonus;

    const payload = {
      player_name: cleanName,
      category: formData.category,
      seed: formData.seed,
      poin: base,
      bonus: bonus,
      total_points: calculatedTotal,
      photo_url: formData.photo_url || null,
      updated_at: new Date().toISOString(),
      pendaftaran_id: formData.pendaftaran_id 
    };

    // Optimistic UI updates
    if (editingId) {
      setRankings(prev => prev.map(r => r.id === editingId ? { ...r, ...payload } : r));
    } else {
      setRankings(prev => {
        const filtered = prev.filter(r => r.player_name !== cleanName);
        return [{ ...payload, id: 'temp_' + Date.now() }, ...filtered];
      });
    }

    setIsModalOpen(false);
    setEditingId(null);
    setSuccessMsg('Data Berhasil Disinkronkan!');
    setTimeout(() => setSuccessMsg(null), 2500);
    setIsSaving(false);

    // Fast background sync
    try {
      if (editingId) {
        await supabase.from('rankings').update(payload).eq('id', editingId);
      } else {
        await supabase.from('rankings').upsert([payload], { onConflict: 'player_name' });
      }

      if (formData.pendaftaran_id) {
        const dbSeed = formData.seed === 'Non Seeded' ? 'UNSEEDED' : (formData.seed?.replace('Seed ', '') || 'UNSEEDED');
        supabase
          .from('atlet_stats')
          .update({
            points: base,
            total_points: bonus,
            seed: dbSeed,
            updated_at: new Date().toISOString()
          })
          .eq('pendaftaran_id', formData.pendaftaran_id)
          .catch(() => {});
      }
      fetchRankings();
    } catch (err: any) {
      console.warn("Background sync ranking error:", err);
    }
  };

  // --- LOGIKA FILTER & PAGINATION ---
  const filteredRankings = rankings
  .filter((r) => {
    const matchSearch = (r.player_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchSeed = selectedSeed === 'Semua' || r.seed === selectedSeed;
    const matchCategory = selectedCategory === 'Semua' || r.category === selectedCategory;
    return matchSearch && matchSeed && matchCategory;
  })
  // TAMBAHKAN LOGIKA SORTING DI BAWAH INI
  .sort((a, b) => {
    const totalA = (Number(a.poin) || 0) + (Number(a.bonus) || 0);
    const totalB = (Number(b.poin) || 0) + (Number(b.bonus) || 0);
    return totalB - totalA; // Urutkan dari yang terbesar ke terkecil
  });

// Bagian pagination akan otomatis mengikuti urutan sorting di atas
const totalPages = Math.ceil(filteredRankings.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedRankings = filteredRankings.slice(startIndex, startIndex + itemsPerPage);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const exportToExcel = () => {
    const exportData = filteredRankings.map((r, idx) => ({
      Rank: idx + 1,
      Nama: r.player_name,
      Kategori: r.category,
      Seed: r.seed,
      "Base Points": r.poin,
      "Added Points (Stats)": r.bonus,
      "Total Ranking Points": r.total_points
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = { Sheets: { data: ws }, SheetNames: ["RankingData"] };
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([excelBuffer]), "Ranking_PB_Bilibili_162.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    doc.setFontSize(16);
    doc.text("RANKING PB BILIBILI 162", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20);
    
    doc.autoTable({
      head: [["Rank", "Nama", "Kat", "Seed", "Base", "Added", "Total"]],
      body: filteredRankings.map((r, idx) => [
        idx + 1, 
        r.player_name, 
        r.category, 
        r.seed, 
        r.poin.toLocaleString(), 
        r.bonus.toLocaleString(), 
        (r.poin + r.bonus).toLocaleString()
      ]),
      startY: 25,
      theme: 'grid',
      headStyles: { fillStyle: [37, 99, 235] }
    });
    doc.save("Ranking_PB_Bilibili_162.pdf");
  };

  const handleDelete = async (id: string) => {
    const target = rankings.find(r => r.id === id);
    const result = await Swal.fire({
      title: 'Hapus dari Ranking?',
      text: target ? `Hapus atlet "${target.player_name}" dari ranking dan sistem?` : "Tindakan ini akan menghapus data atlet.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#374151',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal',
      background: '#0F172A',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        if (target) {
          await deleteAthleteCompletely(target.pendaftaran_id, target.player_name);
        }
        await supabase.from('rankings').delete().eq('id', id);
        
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Atlet dihapus dari ranking',
          showConfirmButton: false,
          timer: 3000
        });
        fetchRankings();
      } catch (err: any) {
        Swal.fire({
          icon: 'error',
          title: 'Gagal Menghapus',
          text: err.message,
          confirmButtonColor: '#3B82F6',
          background: '#0F172A',
          color: '#fff'
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1a] text-white px-3 py-4 sm:px-5 sm:py-6 md:p-10 lg:p-12 font-sans overflow-x-hidden">
      <div className="w-full max-w-7xl mx-auto">
        {successMsg && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[150] bg-blue-600 text-white px-6 py-3 rounded-full font-bold text-xs uppercase flex items-center gap-3 shadow-2xl animate-in fade-in slide-in-from-top-4">
            <Zap size={16} fill="white" /> {successMsg}
          </div>
        )}

        {/* HEADER */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-5 mb-7 sm:mb-9">
          <div className="animate-in slide-in-from-left duration-500">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black italic tracking-tighter uppercase leading-none">
              MANAJEMEN<span className="text-blue-600"> RANKING</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-zinc-500 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  Sistem Sinkronisasi Total Points & Added Points Real-Time
                </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2.5 w-full lg:w-auto animate-in slide-in-from-right duration-500">
            <button onClick={exportToExcel} className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all">
              <TableIcon size={14} /> Excel
            </button>
            <button onClick={exportToPDF} className="w-full sm:flex-1 bg-red-600 hover:bg-red-500 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all">
              <FileText size={14} /> PDF
            </button>
            <button onClick={fetchRankings} disabled={loading} className="w-full sm:flex-1 bg-zinc-900 border border-white/10 px-4 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync
            </button>
            {isAdmin && (
              <button onClick={() => { 
                  setEditingId(null); 
                  setFormData({ player_name: '', category: 'SENIOR', seed: 'Seed A', poin: 0, bonus: 0, photo_url: '' }); 
                  setIsModalOpen(true); 
              }} className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 cursor-pointer">
                <Plus size={14} /> Tambah
              </button>
            )}
          </div>
        </div>

        {/* FILTER BAR */}
        <div className="bg-zinc-900/40 border border-white/5 p-3 sm:p-4 rounded-2xl mb-5 sm:mb-7 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_200px] gap-2.5 backdrop-blur-sm shadow-inner">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="CARI NAMA ATLET..."
              className="w-full bg-black/40 border border-white/5 rounded-xl py-3.5 pl-12 pr-4 outline-none text-xs font-bold uppercase focus:border-blue-500/50 transition-all"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
          <select className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none uppercase text-zinc-300 hover:bg-zinc-800" value={selectedCategory} onChange={(e) => {setSelectedCategory(e.target.value); setCurrentPage(1);}}>
            <option value="Semua">SEMUA KATEGORI</option>
            <option value="MUDA">MUDA</option>
            <option value="SENIOR">SENIOR</option>
          </select>
          <select className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 font-bold text-xs outline-none uppercase text-zinc-300 hover:bg-zinc-800" value={selectedSeed} onChange={(e) => {setSelectedSeed(e.target.value); setCurrentPage(1);}}>
            <option value="Semua">SEMUA SEED</option>
            <option value="Seed A">Seed A</option>
            <option value="Seed B">Seed B</option>
            <option value="Seed C+">Seed C+</option>
            <option value="Seed C">Seed C</option>
            <option value="Seed C-">Seed C-</option>
            <option value="Seed D">Seed D</option>
            <option value="Non Seeded">Non Seeded</option>
          </select>
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-zinc-900/20 border border-white/5 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-500">
                <tr>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase text-center w-20">Rank</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase">Profil Atlet</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase">Kategori</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase">Seeded</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase">Base Points</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase text-emerald-500">Added Points</th>
                  <th className="p-4 lg:p-5 text-[10px] font-black uppercase text-center">Total Ranking</th>
                  {isAdmin && <th className="p-4 lg:p-5 text-[10px] font-black uppercase text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={isAdmin ? 8 : 7} className="p-24 text-center text-xs font-bold uppercase text-zinc-500 animate-pulse">
                    <div className="flex flex-col items-center gap-4"><Loader2 className="animate-spin text-blue-600" size={32}/>Syncing Database...</div>
                  </td></tr>
                ) : paginatedRankings.length > 0 ? (
                  paginatedRankings.map((item,index)=>(
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-all group">
                      <td className="p-4 lg:p-5 text-center font-black italic text-xl text-zinc-700 group-hover:text-blue-500">{String(startIndex+index+1).padStart(2,'0')}</td>
                      <td className="p-4 lg:p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 bg-zinc-800 rounded-full border border-white/10 overflow-hidden ring-2 ring-blue-600/20 shrink-0">
                            {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" alt={item.player_name}/> : <User size={20} className="m-auto mt-2.5 text-zinc-600"/>}
                          </div>
                          <div className="min-w-0"><p className="font-black uppercase italic text-sm text-white truncate">{item.player_name}</p><p className="text-[8px] text-zinc-600 font-bold uppercase mt-1">ID: {item.pendaftaran_id?.slice(0,8)||'Manual'}</p></div>
                        </div>
                      </td>
                      <td className="p-4 lg:p-5"><span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase ${item.category==='MUDA'?'bg-orange-500/10 text-orange-500':'bg-purple-500/10 text-purple-500'}`}>{item.category}</span></td>
                      <td className="p-4 lg:p-5"><span className="bg-blue-600/10 border border-blue-600/20 px-3 py-1 rounded-full text-[9px] font-bold text-blue-500 uppercase">{item.seed}</span></td>
                      <td className="p-4 lg:p-5 font-bold text-zinc-400 text-xs">{(item.poin||0).toLocaleString()}</td>
                      <td className="p-4 lg:p-5 font-bold text-emerald-500 text-xs">+{(item.bonus||0).toLocaleString()}</td>
                      <td className="p-4 lg:p-5 text-center"><span className="text-xl font-black text-white">{(item.poin+item.bonus).toLocaleString()}</span></td>
                      {isAdmin && <td className="p-4 lg:p-5 text-right"><div className="flex justify-end gap-2"><button onClick={()=>{setEditingId(item.id);setFormData(item);setIsModalOpen(true)}} className="p-2.5 bg-zinc-900 hover:bg-blue-600 rounded-xl transition-colors"><Edit3 size={16}/></button><button onClick={()=>handleDelete(item.id)} className="p-2.5 bg-zinc-900 hover:bg-red-600 rounded-xl transition-colors"><Trash2 size={16}/></button></div></td>}
                    </tr>
                  ))
                ) : <tr><td colSpan={isAdmin?8:7} className="p-20 text-center text-zinc-500 uppercase font-bold text-xs italic"><div className="flex flex-col items-center gap-2 opacity-20"><AlertCircle size={48}/>Data tidak ditemukan dalam database ranking.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-12 flex flex-col items-center gap-3 text-zinc-500">
              <Loader2 className="animate-spin text-blue-500" size={28}/><span className="text-[9px] font-black uppercase tracking-widest">Syncing Database...</span>
            </div>
          ) : paginatedRankings.length > 0 ? paginatedRankings.map((item,index)=>{
            const rank=startIndex+index+1;
            return (
              <article key={item.id} className="rounded-2xl border border-white/7 bg-zinc-900/50 p-3.5 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/15 grid place-items-center shrink-0">
                    <span className="text-sm font-black italic text-blue-400">{rank}</span>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10 overflow-hidden ring-2 ring-blue-600/20 shrink-0">
                    {item.photo_url ? <img src={item.photo_url} className="w-full h-full object-cover" alt={item.player_name}/> : <User size={19} className="m-auto mt-3 text-zinc-600"/>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black uppercase text-sm text-white truncate">{item.player_name}</h3>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[8px] font-black uppercase">{item.category}</span>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase">{item.seed}</span>
                    </div>
                  </div>
                  {isAdmin && <div className="flex gap-1.5 shrink-0"><button aria-label={`Edit ${item.player_name}`} onClick={()=>{setEditingId(item.id);setFormData(item);setIsModalOpen(true)}} className="w-9 h-9 grid place-items-center bg-zinc-800 rounded-xl hover:bg-blue-600"><Edit3 size={14}/></button><button aria-label={`Hapus ${item.player_name}`} onClick={()=>handleDelete(item.id)} className="w-9 h-9 grid place-items-center bg-zinc-800 rounded-xl hover:bg-red-600"><Trash2 size={14}/></button></div>}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                  <div className="rounded-xl bg-black/20 p-2 text-center"><div className="text-[8px] font-black uppercase text-zinc-500">Base</div><div className="mt-0.5 text-sm font-black text-zinc-200">{(item.poin||0).toLocaleString()}</div></div>
                  <div className="rounded-xl bg-emerald-500/5 p-2 text-center"><div className="text-[8px] font-black uppercase text-emerald-500">Added</div><div className="mt-0.5 text-sm font-black text-emerald-400">+{(item.bonus||0).toLocaleString()}</div></div>
                  <div className="rounded-xl bg-blue-500/10 p-2 text-center"><div className="text-[8px] font-black uppercase text-blue-400">Total</div><div className="mt-0.5 text-sm font-black text-white">{(item.poin+item.bonus).toLocaleString()}</div></div>
                </div>
              </article>
            );
          }) : (
            <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-12 text-center text-zinc-500"><AlertCircle className="mx-auto mb-2 opacity-30" size={38}/><p className="text-[9px] font-black uppercase">Data tidak ditemukan</p></div>
          )}
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="mt-3 sm:mt-4 p-3 sm:p-5 border border-white/5 rounded-2xl bg-white/[0.01] flex flex-col sm:flex-row justify-between items-center gap-3">
            <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider text-center sm:text-left">
              {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredRankings.length)} dari {filteredRankings.length} atlet
            </p>
            <div className="flex items-center gap-1.5 max-w-full overflow-x-auto pb-0.5">
              <button onClick={()=>goToPage(currentPage-1)} disabled={currentPage===1} className="w-9 h-9 shrink-0 grid place-items-center bg-zinc-900 rounded-xl disabled:opacity-30 border border-white/5"><ChevronLeft size={15}/></button>
              {Array.from({length:totalPages},(_,i)=>i+1).map(page=>(
                <button key={page} onClick={()=>goToPage(page)} className={`w-9 h-9 shrink-0 rounded-xl font-black text-[10px] ${currentPage===page?'bg-blue-600 text-white':'bg-zinc-900 text-zinc-500 border border-white/5'}`}>{page}</button>
              ))}
              <button onClick={()=>goToPage(currentPage+1)} disabled={currentPage===totalPages} className="w-9 h-9 shrink-0 grid place-items-center bg-zinc-900 rounded-xl disabled:opacity-30 border border-white/5"><ChevronRight size={15}/></button>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex items-center gap-3 bg-blue-600/5 border border-blue-600/10 p-4 rounded-2xl">
            <Info className="text-blue-500" size={20} />
            <p className="text-[10px] text-zinc-400 font-medium">
                Sistem ini secara otomatis menggabungkan **Base Points** dengan **Added Points** dan mengurutkannya berdasarkan poin tertinggi[cite: 1].
            </p>
        </div>
      </div>

      {/* MODAL EDIT/TAMBAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-zinc-950 w-full max-w-lg min-h-[100dvh] sm:min-h-0 sm:max-h-[92dvh] rounded-none sm:rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div>
                <h3 className="font-black uppercase italic text-lg sm:text-2xl">{editingId ? 'EDIT' : 'TAMBAH'} DATA RANKING</h3>
                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Update profil & kalkulasi poin atlet</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-900 rounded-2xl hover:bg-red-600 transition-all"><X size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-h-[calc(100dvh-82px)] sm:max-h-[75vh] overflow-y-auto no-scrollbar">
              {formError && (
                  <div className="bg-red-600/10 border border-red-600/20 p-4 rounded-xl text-red-500 text-[10px] font-bold uppercase flex items-center gap-2">
                      <AlertCircle size={14} /> {formError}
                  </div>
              )}

              <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-3xl">
                <div className="w-20 h-20 bg-zinc-900 rounded-2xl overflow-hidden flex items-center justify-center border border-white/5">
                  {formData.photo_url ? <img src={formData.photo_url} className="w-full h-full object-cover" alt="" /> : <Camera className="text-zinc-700" />}
                </div>
                <div className="flex-grow">
                  <input type="file" ref={fileInputRef} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setIsUploading(true);
                    try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Math.random()}.${fileExt}`;
                        const filePath = `ranking-photos/${fileName}`;

                        const { error: uploadError } = await supabase.storage.from('images').upload(filePath, file);
                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
                        setFormData(prev => ({ ...prev, photo_url: publicUrl }));
                    } catch (err: any) {
                        setFormError("Upload gagal: " + err.message);
                    } finally {
                        setIsUploading(false);
                    }
                  }} className="hidden" accept="image/*" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-colors">{isUploading ? 'Uploading...' : 'Ubah Foto Profil'}</button>
                  <p className="text-[8px] text-zinc-500 mt-2 font-bold uppercase">Format: JPG, PNG (Max 2MB)</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Nama Lengkap Atlet</label>
                  <input 
                    required 
                    placeholder="CONTOH: BUDI SUDARSONO"
                    className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 outline-none font-black uppercase text-sm focus:border-blue-500" 
                    value={formData.player_name} 
                    onChange={(e) => setFormData({ ...formData, player_name: e.target.value })} 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Kategori</label>
                    <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold text-xs uppercase text-white" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                      <option value="MUDA">MUDA</option>
                      <option value="SENIOR">SENIOR</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Seed</label>
                    <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold text-xs uppercase text-white" value={formData.seed} onChange={(e) => setFormData({ ...formData, seed: e.target.value })}>
                      <option value="Seed A">Seed A</option>
                      <option value="Seed B">Seed B</option>
                      <option value="Seed C+">Seed C+</option>
                      <option value="Seed C">Seed C</option>
                      <option value="Seed C-">Seed C-</option>
                      <option value="Seed D">Seed D</option>
                      <option value="Non Seeded">Non Seeded</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase ml-2">Base Points</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full bg-zinc-900 border border-white/5 rounded-2xl p-4 font-bold focus:border-blue-500" 
                      value={formatNumber(formData.poin)} 
                      onChange={(e) => setFormData({ ...formData, poin: parseNumber(e.target.value) })} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-emerald-500 uppercase ml-2">Added Points (Stats)</label>
                    <input 
                      type="text" 
                      inputMode="numeric"
                      className="w-full bg-zinc-900 border border-emerald-500/20 rounded-2xl p-4 font-bold text-emerald-500 focus:border-emerald-500" 
                      value={formatNumber(formData.bonus)} 
                      onChange={(e) => setFormData({ ...formData, bonus: parseNumber(e.target.value) })} 
                    />
                  </div>
                </div>

                <div className="bg-blue-600/10 p-5 rounded-3xl border border-blue-600/20 flex justify-between items-center group">
                  <div>
                    <span className="text-[10px] font-black uppercase text-blue-400 italic">Total Kalkulasi Poin</span>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase">Otomatis Terakumulasi</p>
                  </div>
                  <span className="text-4xl font-black text-white group-hover:scale-110 transition-transform">
                    {(Number(formData.poin || 0) + Number(formData.bonus || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-4">
                <button disabled={isSaving || isUploading} type="submit" className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50">
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={18} />} 
                    {editingId ? 'UPDATE DATA ATLET' : 'SIMPAN DATA RANKING'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}