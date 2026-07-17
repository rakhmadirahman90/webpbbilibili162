import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { FileDown, Search, Eye, FileText, Clock, DownloadCloud, X, Loader2, AlertCircle } from 'lucide-react';
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
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setDocs(data || []);
      setLoading(false);
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
    <div id="dokumen-section" className="max-w-7xl mx-auto px-6 py-24 min-h-screen text-slate-100 relative bg-[#070d1a]">
      
      {/* --- MODAL PRATINJAU INTEGRASI --- */}
      <AnimatePresence>
        {selectedDocUrl && (
          <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4 md:p-12">
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
              className="relative w-full max-w-6xl h-[90vh] bg-[#0c1426] border border-slate-800 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.5)]"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-[#0c1426]/80 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase italic tracking-[0.2em] text-blue-500 leading-none mb-1">Pratinjau Arsip</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Dokumen Resmi PB Bilibili 162</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDocUrl(null)}
                  className="p-3 hover:bg-white/5 text-slate-400 hover:text-white rounded-full transition-all active:scale-90"
                >
                  <X size={24} />
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

      {/* --- HEADER SECTION --- */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-24"
      >
        <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-6 text-slate-100">
          DOKUMEN <span className="text-blue-500">PENTING</span>
        </h2>
        <div className="flex items-center justify-center gap-4">
          <div className="h-[2px] w-16 bg-gradient-to-r from-transparent to-blue-500"></div>
          <p className="text-slate-400 uppercase text-[11px] font-black tracking-[0.4em]">Arsip Digital Authority Panel</p>
          <div className="h-[2px] w-16 bg-gradient-to-l from-transparent to-blue-500"></div>
        </div>
      </motion.div>

      {/* --- SEARCH BAR --- */}
      <div className="relative max-w-3xl mx-auto mb-20 group">
        <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full group-hover:bg-blue-500/30 transition-all -z-10"></div>
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400" size={24} />
        <input 
          type="text" 
          placeholder="Cari judul dokumen atau deskripsi..." 
          className="w-full bg-slate-900/60 border border-slate-700 rounded-[2rem] py-6 pl-16 pr-8 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all backdrop-blur-3xl text-slate-100 placeholder:text-slate-500 font-medium shadow-lg"
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* --- GRID LIST --- */}
      {loading ? (
        <div className="grid md:grid-cols-2 gap-8">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-60 bg-[#0c1426]/40 rounded-[3rem] border border-slate-800/50 animate-pulse"></div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <AnimatePresence mode='popLayout'>
              {filteredDocs.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03 }}
                  className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 bg-[#0c1426]/30 border border-slate-800/80 p-6 rounded-2xl hover:border-blue-600/50 hover:bg-[#0c1426]/60 transition-all duration-300 shadow-sm"
                >
                  {/* File Icon */}
                  <div className="w-12 h-12 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                    <FileText size={20} />
                  </div>

                  {/* Document Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-bold text-slate-100 truncate mb-1">
                      {doc.title}
                    </h3>
                    <div className="flex flex-wrap gap-3 items-center text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider">
                      <span className="bg-slate-800/50 px-2 py-0.5 rounded text-slate-300">
                        {doc.file_type || 'PDF'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-blue-500" /> 
                        {new Date(doc.created_at).toLocaleDateString('id-ID')}
                      </span>
                      <span>{formatFileSize(doc.file_size)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => setSelectedDocUrl(doc.file_url)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-6 py-3 rounded-xl transition-all"
                    >
                      <Eye size={14} /> View
                    </button>
                    <a 
                      href={doc.file_url} 
                      download 
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20"
                    >
                      <DownloadCloud size={14} /> Download
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* --- EMPTY STATE --- */}
          {filteredDocs.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-40 bg-[#0c1426]/10 rounded-[4rem] border border-dashed border-slate-800"
            >
              <div className="w-24 h-24 bg-slate-800/30 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-700">
                <AlertCircle size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-500 uppercase italic">Hasil Tidak Ditemukan</h3>
              <p className="text-slate-600 text-xs mt-3 font-bold uppercase tracking-widest">Coba gunakan kata kunci arsip yang lain</p>
            </motion.div>
          )}
        </>)}


      {/* --- FOOTER INFO --- */}
      <div className="mt-32 p-12 rounded-[4rem] bg-gradient-to-br from-[#0c1426] to-black border border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10 group-hover:bg-blue-600/10 transition-colors"></div>
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-[0_10px_20px_rgba(37,99,235,0.3)]">
            <DownloadCloud size={28} className="text-white" />
          </div>
          <div>
            <h4 className="font-black italic uppercase text-lg leading-none mb-2 text-slate-100">Pusat Informasi Dokumen</h4>
            <p className="text-sm text-slate-500 max-w-sm font-medium leading-relaxed text-justify">
              Arsip ini dikelola oleh tim administrasi **Authority Panel PB Bilibili 162**. Hubungi sekretariat jika membutuhkan akses dokumen fisik.
            </p>
          </div>
        </div>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-10 py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all duration-500 shadow-xl"
        >
          Kembali Ke Atas
        </button>
      </div>
    </div>
  );
}