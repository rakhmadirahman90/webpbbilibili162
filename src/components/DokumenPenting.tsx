import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Search, Eye, FileText, Clock, DownloadCloud, X, Loader2, AlertCircle, FileCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DokumenPenting() {
  const [docs, setDocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal Pratinjau
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);

  useEffect(() => {
    const getDocs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (!error) setDocs(data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    getDocs();
  }, []);

  // Helper untuk memformat ukuran file
  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-6 bg-[#070d1a] text-white relative overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-indigo-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      {/* --- MODAL PRATINJAU INTEGRASI --- */}
      <AnimatePresence>
        {selectedDocUrl && (
          <div className="fixed inset-0 z-[110000] flex items-center justify-center p-3 sm:p-6 md:p-12">
            {/* Overlay Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDocUrl(null)}
              className="absolute inset-0 bg-[#070d1a]/95 backdrop-blur-md"
            />
            
            {/* Content Container */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-[#0c1426] border border-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl z-10"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-white/10 bg-[#0c1426]/90 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 shrink-0">
                    <FileText size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase italic tracking-wider text-blue-400 leading-none mb-0.5">Pratinjau Arsip</h3>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tight">Dokumen Resmi PB Bilibili 162</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDocUrl(null)}
                  className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-all active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Iframe View */}
              <div className="flex-1 bg-[#070d1a]">
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedDocUrl)}&embedded=true`} 
                  className="w-full h-full border-none"
                  title="Document Preview"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 relative z-10 flex flex-col h-full justify-between min-h-0">
        
        {/* Header Section Compact */}
        <div className="text-center mb-2 sm:mb-3 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-0.5 sm:py-1 rounded-full mb-1"
          >
            <FileCheck size={12} className="text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Arsip Digital Resmi</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase text-white"
          >
            DOKUMEN <span className="text-blue-500">PENTING</span>
          </motion.h2>

          <p className="text-slate-400 max-w-xl mx-auto uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5">
            Unduh Berkas Administrasi, Surat & Panduan PB Bilibili 162
          </p>
        </div>

        {/* --- SEARCH BAR --- */}
        <div className="relative w-full max-w-xl mx-auto mb-2 sm:mb-3 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
          <input 
            type="text" 
            value={search}
            placeholder="Cari dokumen atau berkas..." 
            className="w-full bg-[#0b1224]/90 border border-white/10 rounded-xl py-2 sm:py-2.5 pl-10 pr-8 outline-none focus:border-blue-500 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 font-medium shadow-md transition-all"
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* --- DOCUMENT LIST CONTAINER --- */}
        <div className="flex-1 bg-[#0b1224]/90 p-2.5 sm:p-4 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-0 overflow-hidden relative">
          
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="animate-spin text-blue-500" size={28} />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Memuat Arsip Dokumen...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center p-4">
              <AlertCircle size={36} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-400 uppercase italic">Dokumen Tidak Ditemukan</h3>
              <p className="text-slate-500 text-[10px] sm:text-xs">Gunakan kata kunci lain atau bersihkan pencarian</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 space-y-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {filteredDocs.map((doc, index) => (
                  <motion.div
                    key={doc.id || index}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.02 }}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-white/5 border border-white/5 p-2.5 sm:p-3.5 rounded-xl hover:border-blue-500/30 transition-all duration-200 shadow-sm group"
                  >
                    {/* Left Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-100 truncate leading-snug">
                          {doc.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5">
                          <span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                            {doc.file_type || 'PDF'}
                          </span>
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock size={10} className="text-blue-400" /> 
                            {new Date(doc.created_at).toLocaleDateString('id-ID')}
                          </span>
                          <span className="text-slate-500">{formatFileSize(doc.file_size)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
                      <button 
                        onClick={() => setSelectedDocUrl(doc.file_url)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Eye size={13} /> View
                      </button>
                      <a 
                        href={doc.file_url} 
                        download 
                        className="flex-1 sm:flex-none flex items-center justify-center gap-1 text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-all shadow-md shadow-blue-600/20"
                      >
                        <DownloadCloud size={13} /> Download
                      </a>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Bottom Bar */}
          <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="text-blue-400">Total {filteredDocs.length} Dokumen Tersedia</span>
            <span>PB Bilibili 162 Parepare</span>
          </div>
        </div>

      </div>
    </section>
  );
}
