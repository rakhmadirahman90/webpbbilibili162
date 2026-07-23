import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleQuestion, Plus, Minus, Search, X, HelpCircle, Sparkles } from 'lucide-react';
import { supabase } from '../supabase';

export default function PublicFAQ() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const { data, error } = await supabase.from('faq').select('*').order('urutan', { ascending: true });
        if (error) throw error;
        if (data && data.length > 0) {
            setFaqs(data);
        } else {
            throw new Error("No data");
        }
      } catch (e) {
        const local = JSON.parse(localStorage.getItem('faq_local_v3') || '[]');
        if (local.length > 0) {
            setFaqs(local);
        } else {
            setFaqs([
              { id: 'f1', pertanyaan: 'Apakah pemula yang tidak punya pengalaman bermain bulutangkis boleh bergabung?', jawaban: 'Tentu saja! Kami memiliki program reguler khusus untuk pemula. Pelatih kami akan membimbing mulai dari cara memegang raket (grip), langkah kaki (footwork), hingga teknik pukulan dasar.', urutan: 1 },
              { id: 'f2', pertanyaan: 'Berapa biaya pendaftaran dan iuran bulanan?', jawaban: 'Biaya pendaftaran awal adalah Rp 150.000 (sudah termasuk administrasi dan kaos latihan). Untuk iuran bulanan sebesar Rp 100.000 untuk kelas reguler, dan Rp 250.000 untuk kelas prestasi (intensif).', urutan: 2 },
              { id: 'f3', pertanyaan: 'Apa saja perlengkapan yang perlu disiapkan saat latihan?', jawaban: 'Anggota wajib membawa raket sendiri, sepatu khusus bulutangkis (non-marking shoes), pakaian olahraga, dan air minum. Shuttlecock sudah disediakan oleh klub.', urutan: 3 },
              { id: 'f4', pertanyaan: 'Kapan jadwal latihannya?', jawaban: 'Jadwal latihan reguler kami adalah hari Rabu (08.00-12.00), Jumat (08.00-12.00), dan Ahad (08.00-12.00 WITA).', urutan: 4 },
              { id: 'f5', pertanyaan: 'Apakah ada batasan usia untuk bergabung?', jawaban: 'Kami menerima anggota mulai dari usia dini (7 tahun) hingga dewasa tanpa batasan usia maksimal, asalkan sehat jasmani.', urutan: 5 },
              { id: 'f6', pertanyaan: 'Apakah PB Bilibili 162 rutin mengikuti turnamen?', jawaban: 'Ya, klub kami rutin mengirimkan atlet untuk mengikuti kejuaraan tingkat kota, provinsi, hingga nasional.', urutan: 6 }
            ]);
        }
      }
    };
    fetchFaqs();
  }, []);

  const filteredFaqs = faqs.filter(faq => 
    (faq.pertanyaan || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
    (faq.jawaban || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-4 bg-[#070d1a] text-white relative overflow-hidden select-none flex-grow min-h-0">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[240px] sm:w-[400px] h-[240px] sm:h-[400px] bg-cyan-500/10 blur-[80px] rounded-full pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-[240px] sm:w-[350px] h-[240px] sm:h-[350px] bg-blue-600/10 blur-[80px] rounded-full pointer-events-none -ml-16 -mb-16" />

      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-6 relative z-10 flex flex-col h-full min-h-0 justify-between">
        
        {/* Compact Header Card with Search Integration */}
        <div className="bg-[#0b1224]/80 border border-white/5 p-4 sm:p-5 rounded-2xl md:rounded-3xl backdrop-blur-xl shadow-xl shrink-0 mb-3 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full mb-1.5 shrink-0">
                <Sparkles size={10} className="text-cyan-400" />
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-cyan-400">Pusat Bantuan & Edukasi</span>
              </div>
              
              <h1 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                <MessageCircleQuestion className="text-cyan-500 shrink-0" size={20} />
                <span>Pertanyaan <span className="text-cyan-500">Umum</span></span>
              </h1>
              <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5 leading-snug">
                Jawaban lengkap seputar pendaftaran, jadwal latihan, dan keanggotaan klub.
              </p>
            </div>

            {/* Premium Integrated Search Bar */}
            <div className="relative w-full sm:w-64 md:w-80 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text"
                placeholder="Cari pertanyaan atau kata kunci..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpenIndex(null); // Close accordion on search to keep view neat
                }}
                className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 focus:bg-black/60 focus:ring-1 focus:ring-cyan-500/20 transition-all font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Container with exact remaining height */}
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-1.5 space-y-2.5 custom-scrollbar pb-20 min-h-0">
          <AnimatePresence mode="popLayout">
            {filteredFaqs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 bg-[#0b1224]/30 border border-white/5 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-full bg-slate-500/10 flex items-center justify-center text-slate-500 mb-3">
                  <HelpCircle size={22} />
                </div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-1">Pertanyaan Tidak Ditemukan</h3>
                <p className="text-[11px] text-slate-500 max-w-sm mb-4 leading-relaxed">
                  Maaf, kata kunci "{searchQuery}" tidak cocok dengan pertanyaan atau jawaban yang ada di basis pengetahuan kami.
                </p>
                <button 
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-[10px] uppercase tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  Reset Pencarian
                </button>
              </motion.div>
            ) : (
              filteredFaqs.map((item, index) => {
                const isOpen = openIndex === index;
                return (
                  <motion.div 
                    key={item.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isOpen 
                        ? 'bg-[#0b1224]/95 border-cyan-500/30 shadow-lg shadow-cyan-950/10' 
                        : 'bg-[#0b1224]/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <button 
                      onClick={() => setOpenIndex(isOpen ? null : index)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left cursor-pointer transition-colors hover:bg-white/[0.01]"
                    >
                      <span className={`font-bold text-xs sm:text-sm md:text-base pr-4 leading-snug transition-colors duration-300 ${isOpen ? 'text-cyan-400' : 'text-slate-200'}`}>
                        {item.pertanyaan}
                      </span>
                      <span className={`shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isOpen 
                          ? 'bg-cyan-500 text-white scale-110 shadow-[0_0_12px_rgba(6,182,212,0.4)]' 
                          : 'bg-white/5 text-slate-400'
                      }`}>
                        {isOpen ? <Minus size={12} className="stroke-[2.5]" /> : <Plus size={12} className="stroke-[2.5]" />}
                      </span>
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeInOut' }}
                        >
                          <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-[11px] sm:text-xs md:text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-3 mx-1 font-medium text-justify">
                            {item.jawaban}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

