import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { Search, Eye, FileText, Clock, DownloadCloud, X, Loader2, AlertCircle, FileCheck } from 'lucide-react';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);

  const loadDocs = async () => {
    setLoading(true); setError(null);
    const { data, error: queryError } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (queryError) { console.error('[DokumenPenting] Supabase:', queryError); setDocs([]); setError('Data dokumen dari database tidak dapat dimuat.'); }
    else setDocs(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    void loadDocs();
    const handleUpdate = () => void loadDocs();
    window.addEventListener('app_data_changed', handleUpdate);
    window.addEventListener('table_updated_documents', handleUpdate);
    const channel = supabase.channel('public_docs_realtime_v2').on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, handleUpdate).subscribe();
    return () => { window.removeEventListener('app_data_changed', handleUpdate); window.removeEventListener('table_updated_documents', handleUpdate); void supabase.removeChannel(channel); };
  }, []);

  const filteredDocs = useMemo(() => { const q = search.trim().toLowerCase(); if (!q) return docs; return docs.filter(d => `${d.title || ''} ${d.description || ''}`.toLowerCase().includes(q)); }, [docs, search]);
  const formatSize = (bytes: number) => { if (!bytes) return '0 KB'; const units = ['Bytes','KB','MB','GB']; const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), 3); return `${parseFloat((bytes/Math.pow(1024,i)).toFixed(1))} ${units[i]}`; };

  return (
    <section className="w-full min-h-full flex flex-col bg-[#070d1a] text-white py-2 sm:py-4 overflow-hidden">
      {selectedDocUrl && <div className="fixed inset-0 z-[110000] flex items-center justify-center p-3 sm:p-6 bg-[#070d1a]/95 backdrop-blur-md"><div className="relative w-full max-w-5xl h-[88dvh] bg-[#0c1426] border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl"><div className="flex items-center justify-between p-3 border-b border-white/10 shrink-0"><div className="flex items-center gap-2"><FileText size={18} className="text-blue-400"/><span className="text-xs font-black uppercase">Pratinjau Arsip</span></div><button onClick={() => setSelectedDocUrl(null)} className="p-2 rounded-full hover:bg-white/10"><X size={20}/></button></div><iframe src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedDocUrl)}&embedded=true`} className="w-full flex-1 border-none" title="Document Preview"/></div></div>}
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-5 flex flex-col min-h-0 flex-1">
        <div className="text-center shrink-0 mb-3"><div className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-1 rounded-full mb-1"><FileCheck size={12} className="text-blue-400"/><span className="text-[9px] font-black uppercase tracking-[.2em] text-blue-400">Arsip Digital Resmi</span></div><h2 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter italic uppercase">DOKUMEN <span className="text-blue-500">PENTING</span></h2><p className="text-slate-400 uppercase tracking-widest text-[8px] sm:text-[10px] font-bold mt-1">Unduh Berkas Administrasi, Surat & Panduan PB Bilibili 162</p></div>
        <div className="relative w-full max-w-xl mx-auto mb-3 shrink-0"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari dokumen atau berkas..." className="w-full bg-[#0b1224] border border-white/10 rounded-xl py-2.5 pl-10 pr-8 outline-none focus:border-blue-500 text-xs sm:text-sm"/>{search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2"><X size={14}/></button>}</div>
        <div className="flex-1 min-h-[260px] bg-[#0b1224]/90 p-2.5 sm:p-4 rounded-2xl border border-white/10 flex flex-col overflow-hidden">
          {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={28}/></div> : error ? <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center"><AlertCircle size={34} className="text-red-400"/><p className="text-xs text-red-300">{error}</p><button onClick={() => void loadDocs()} className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-bold">Coba Lagi</button></div> : filteredDocs.length === 0 ? <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center"><AlertCircle size={34} className="text-slate-500"/><h3 className="text-sm font-bold text-slate-400 uppercase italic">Dokumen Tidak Ditemukan</h3><p className="text-[10px] text-slate-500">Database Supabase saat ini tidak memiliki dokumen lain.</p></div> : <div className="flex-1 overflow-y-auto space-y-2 pr-1">{filteredDocs.map(doc => <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white/5 border border-white/5 p-2.5 sm:p-3.5 rounded-xl min-w-0"><div className="flex items-center gap-3 min-w-0 flex-1"><div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 shrink-0"><FileText size={18}/></div><div className="min-w-0 flex-1"><h3 className="text-xs sm:text-sm font-bold truncate">{doc.title || 'Tanpa Judul'}</h3><div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[10px] text-slate-400 mt-1"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-black">{doc.file_type || 'PDF'}</span>{doc.created_at && <span className="flex items-center gap-1"><Clock size={10} className="text-blue-400"/>{new Date(doc.created_at).toLocaleDateString('id-ID')}</span>}<span>{formatSize(doc.file_size)}</span></div></div></div><div className="flex gap-2 w-full sm:w-auto shrink-0"><button onClick={() => setSelectedDocUrl(doc.file_url)} className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-slate-800 text-[10px] sm:text-xs font-bold uppercase flex items-center justify-center gap-1"><Eye size={13}/>View</button><a href={doc.file_url} download className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-blue-600 text-white text-[10px] sm:text-xs font-bold uppercase flex items-center justify-center gap-1"><DownloadCloud size={13}/>Download</a></div></div>)}</div>}
          <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between gap-3 text-[8px] sm:text-[10px] uppercase font-bold tracking-wider"><span className="text-blue-400">Total {filteredDocs.length} Dokumen Tersedia</span><span className="text-right">PB Bilibili 162 Parepare</span></div>
        </div>
      </div>
    </section>
  );
}
