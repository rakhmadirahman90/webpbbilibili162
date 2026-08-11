import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import Swal from 'sweetalert2';
import {
  Search, Loader2, Printer, FileSpreadsheet, History, Database
} from 'lucide-react';

const escapeCsv = (value: unknown) => {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadCsv = (rows: Record<string, unknown>[], filename: string) => {
  if (!rows.length) return;
  const keys = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const csv = [
    keys.map(escapeCsv).join(','),
    ...rows.map((row) => keys.map((key) => escapeCsv(row[key])).join(',')),
  ].join('\r\n');

  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export default function AdminLaporan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'harian' | 'mingguan' | 'bulanan' | 'tahunan'>('harian');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const [stats, setStats] = useState({
    pendaftaran: 0,
    pertandingan: 0,
    poinTerdistribusi: 0,
    beritaBaru: 0,
    galeriBaru: 0
  });

  const [detailLogs, setDetailLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchRekapData();

    const channel = supabase
      .channel('admin_laporan_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendaftaran' }, () => fetchRekapData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pertandingan' }, () => fetchRekapData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_poin' }, () => fetchRekapData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'berita' }, () => fetchRekapData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => fetchRekapData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filterType, selectedDate]);

  const fetchRekapData = async () => {
    setLoading(true);
    setError(null);
    try {
      const date = new Date(selectedDate);
      let startDate: string;
      let endDate: string;

      if (filterType === 'harian') {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        startDate = start.toISOString();
        endDate = end.toISOString();
      } else if (filterType === 'mingguan') {
        const start = new Date(date);
        start.setDate(date.getDate() - 7);
        startDate = start.toISOString();
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        endDate = end.toISOString();
      } else if (filterType === 'bulanan') {
        startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString();
        endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();
      } else {
        startDate = new Date(date.getFullYear(), 0, 1).toISOString();
        endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59).toISOString();
      }

      const [reg, match, news, gallery, audit] = await Promise.all([
        supabase.from('pendaftaran').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('pertandingan').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('berita').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('galeri').select('*', { count: 'exact', head: true }).gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('audit_poin').select('*').gte('created_at', startDate).lte('created_at', endDate).order('created_at', { ascending: false })
      ]);

      if (reg.error) throw reg.error;
      if (match.error) throw match.error;
      if (news.error) throw news.error;
      if (gallery.error) throw gallery.error;
      if (audit.error) throw audit.error;

      let auditData = audit.data || [];
      if (auditData.length === 0 && filterType === 'harian') {
        const { data: fallback } = await supabase.from('audit_poin').select('*').limit(10).order('created_at', { ascending: false });
        if (fallback) auditData = fallback;
      }

      const totalPoin = auditData.reduce((acc, curr) => acc + Math.abs(curr.perubahan || 0), 0);
      setDetailLogs(auditData);
      setStats({
        pendaftaran: reg.count || 0,
        pertandingan: match.count || 0,
        poinTerdistribusi: totalPoin,
        beritaBaru: news.count || 0,
        galeriBaru: gallery.count || 0
      });
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(err?.message || 'Gagal memuat laporan.');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = detailLogs.filter(log =>
    (log.atlet_nama?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (log.admin_email?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const exportToCsv = () => {
    if (filteredLogs.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Data Kosong',
        text: 'Tidak ada data log aktivitas audit poin untuk diekspor.',
        confirmButtonColor: '#3B82F6',
        background: '#0F172A',
        color: '#fff'
      });
      return;
    }

    const rows = filteredLogs.map((log) => ({
      Waktu: log.waktu || log.created_at,
      Admin: log.admin_email || '',
      Atlet: log.atlet_nama || '',
      Mutasi: log.perubahan ?? '',
      'Saldo Akhir': log.poin_sesudah ?? ''
    }));

    downloadCsv(rows, `Laporan_${filterType}_${selectedDate}.csv`);
  };

  return (
    <div className="p-6 md:p-12 bg-[#070d1a] min-h-screen text-white font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            REKAPITULASI <span className="text-blue-600">SISTEM</span>
          </h1>
        </div>

        <div className="flex flex-wrap gap-3 bg-zinc-900/50 p-2 rounded-[2rem] border border-white/5 shadow-2xl">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="bg-zinc-800 text-[10px] font-black uppercase px-4 py-2 rounded-full outline-none border border-transparent focus:border-blue-600"
          >
            <option value="harian">Harian</option>
            <option value="mingguan">Mingguan</option>
            <option value="bulanan">Bulanan</option>
            <option value="tahunan">Tahunan</option>
          </select>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black/40 text-[10px] font-black uppercase px-4 py-2 rounded-full border border-zinc-800 outline-none"
          />

          <button onClick={exportToCsv} className="bg-emerald-600 p-2 px-4 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
            <FileSpreadsheet size={14} /> CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
          <p className="text-zinc-500 text-[9px] font-black uppercase">Poin Tersirkulasi</p>
          <h2 className="text-4xl font-black italic mt-1 text-emerald-500">{stats.poinTerdistribusi}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
          <p className="text-zinc-500 text-[9px] font-black uppercase">Pendaftaran</p>
          <h2 className="text-4xl font-black italic mt-1 text-blue-500">{stats.pendaftaran}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5">
          <p className="text-zinc-500 text-[9px] font-black uppercase">Update Konten</p>
          <h2 className="text-4xl font-black italic mt-1 text-purple-500">{stats.beritaBaru + stats.galeriBaru}</h2>
        </div>
        <div className="bg-zinc-900/40 p-8 rounded-[2rem] border border-white/5 text-center">
          <button onClick={() => window.print()} className="h-full w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase bg-white text-black rounded-[1.5rem] hover:bg-zinc-200 transition-all">
            <Printer size={16} /> Cetak Laporan
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 border border-white/5 rounded-[3rem] overflow-hidden">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <History size={14} className="text-blue-500" /> Log Aktivitas Audit Poin
          </h3>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
            <input
              type="text"
              placeholder="CARI NAMA ATLET..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-full py-2 pl-10 pr-10 text-[10px] font-black uppercase outline-none focus:border-blue-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black/20 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                <th className="px-8 py-6">Waktu (WITA)</th>
                <th className="px-8 py-6">Admin</th>
                <th className="px-8 py-6">Atlet</th>
                <th className="px-8 py-6 text-right">Mutasi</th>
                <th className="px-8 py-6 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block text-blue-600" /></td></tr>
              ) : filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-all">
                    <td className="px-8 py-6 text-[10px] font-bold text-zinc-400">
                      {log.waktu ? new Date(log.waktu).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' }) : new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })}
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-blue-500 uppercase">{log.admin_email?.split('@')[0]}</td>
                    <td className="px-8 py-6 text-[11px] font-black uppercase italic tracking-tighter">{log.atlet_nama}</td>
                    <td className={`px-8 py-6 text-right font-black ${log.perubahan > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {log.perubahan > 0 ? `+${log.perubahan}` : log.perubahan}
                    </td>
                    <td className="px-8 py-6 text-right text-zinc-500 font-bold text-[10px]">{log.poin_sesudah}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <Database size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-20">Tidak ada data ditemukan untuk periode ini</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
