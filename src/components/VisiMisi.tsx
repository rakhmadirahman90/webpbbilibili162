import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Target, CheckCircle2, Loader2, Compass, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VisiMisi() {
  const [loading, setLoading] = useState(true);
  const [dynamicContent, setDynamicContent] = useState<any>({ visi: '', misi: [] });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'about_content')
          .maybeSingle();
        if (data?.value) {
          const val = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
          setDynamicContent({
            visi: val.vision || val.visi || "Menjadi klub bulutangkis terdepan di Sulawesi Selatan yang mencetak atlet-atlet bertaraf nasional, berkarakter kuat, berprestasi tinggi, serta mengedepankan sportivitas dan kebersamaan.",
            misi: Array.isArray(val.missions || val.misi) && (val.missions || val.misi).length > 0 
              ? (val.missions || val.misi) 
              : [
                  "Menyelenggarakan program pelatihan bulutangkis yang terstruktur dan berkelanjutan.",
                  "Membina kedisiplinan, mental juara, dan karakter unggul pada setiap atlet muda.",
                  "Menyediakan sarana & prasarana latihan berstandar baik bagi seluruh anggota.",
                  "Membangun sinergi aktif dengan orang tua, masyarakat, dan pengurus PBSI Parepare."
                ],
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Memuat Visi & Misi...</span>
      </div>
    );
  }

  return (
    <section className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-6 bg-[#070d1a] text-white relative overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-amber-500/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 relative z-10 flex flex-col h-full justify-between">
        {/* Header Section Compact */}
        <div className="text-center mb-2 sm:mb-3 lg:mb-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-0.5 sm:py-1 rounded-full mb-1"
          >
            <Compass size={12} className="text-amber-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Prinsip & Tujuan Klub</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase text-white"
          >
            VISI & <span className="text-amber-400">MISI KAMI</span>
          </motion.h2>

          <p className="text-slate-400 max-w-xl mx-auto uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5">
            Landasan Pembinaan & Cita-Cita PB Bilibili 162 Parepare
          </p>
        </div>

        {/* Content Layout Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 md:gap-6 min-h-0 items-stretch">
          
          {/* --- VISI CARD (5 COLS ON LG, COMPACT HEIGHT ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 flex flex-col justify-between bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-amber-500/20 backdrop-blur-xl shadow-xl overflow-hidden relative shrink-0"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 blur-2xl pointer-events-none" />

            <div className="flex items-center gap-2 pb-1.5 sm:pb-2.5 border-b border-white/10 shrink-0 mb-2">
              <span className="w-1.5 h-5 sm:h-6 bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.6)]"></span>
              <div className="flex items-center gap-1.5 text-amber-400 font-black text-xs sm:text-base md:text-lg uppercase tracking-tight italic">
                <Target size={16} />
                <span>Visi Utama</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 my-auto custom-scrollbar flex items-center">
              <blockquote className="text-slate-200 text-xs sm:text-sm md:text-base font-semibold leading-relaxed italic text-justify border-l-2 border-amber-500/50 pl-3 sm:pl-4 py-1">
                "{dynamicContent.visi}"
              </blockquote>
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-amber-400 flex items-center gap-1">
                <Award size={11} /> Standar Keunggulan
              </span>
              <span>Cita-Cita Utama</span>
            </div>
          </motion.div>

          {/* --- MISI CARD (7 COLS ON LG, FLEX-1 ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex-1 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-blue-500/20 backdrop-blur-xl shadow-xl flex flex-col min-h-0 overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 border-b border-white/10 shrink-0 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
                <div className="flex items-center gap-1.5 text-blue-400 font-black text-xs sm:text-base md:text-lg uppercase tracking-tight italic">
                  <CheckCircle2 size={16} />
                  <span>Misi & Strategi Pembinaan</span>
                </div>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {dynamicContent.misi.length} Poin
              </span>
            </div>

            {/* Scrollable Misi List */}
            <div className="flex-1 overflow-y-auto pr-1.5 sm:pr-2 space-y-2 sm:space-y-3 custom-scrollbar">
              {dynamicContent.misi.map((item: any, i: number) => {
                const text = typeof item === 'string' ? item : item.text || item.title || item;
                return (
                  <div 
                    key={i} 
                    className="flex items-start gap-2.5 sm:gap-3 bg-white/5 p-2.5 sm:p-3.5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-colors shadow-sm group"
                  >
                    <div className="w-5 h-5 sm:w-6 sm:h-6 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0 border border-blue-500/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors text-[10px] sm:text-xs font-black">
                      {i + 1}
                    </div>
                    <p className="text-slate-200 text-xs sm:text-sm font-medium leading-snug sm:leading-relaxed text-justify flex-1">
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                PB Bilibili 162
              </span>
              <span>Langkah Nyata</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
