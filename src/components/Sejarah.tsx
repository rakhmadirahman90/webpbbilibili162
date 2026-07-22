import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Loader2, History, BookOpen, Award, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sejarah() {
  const [loading, setLoading] = useState(true);
  const [dynamicContent, setDynamicContent] = useState<any>({});

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
            sejarah_title: val.sejarah_title,
            sejarah: val.sejarah_desc,
            sejarah_image: val.sejarah_img,
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
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Memuat Sejarah Klub...</span>
      </div>
    );
  }

  const title = dynamicContent.sejarah_title || "Jejak Langkah Kami";
  const rawText = dynamicContent.sejarah || "PB Bilibili 162 didirikan di Kota Parepare sebagai wadah pembinaan olahraga bulutangkis yang profesional, berkomitmen melahirkan atlet berbakat yang menjunjung tinggi kebersamaan, disiplin, dan semangat juang di setiap ajang kejuaraan.";
  const paragraphs = rawText.split('\n').filter((p: string) => p.trim() !== '');

  return (
    <section className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-6 bg-[#070d1a] text-white relative overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-indigo-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 relative z-10 flex flex-col h-full justify-between">
        {/* Header Section Compact */}
        <div className="text-center mb-2 sm:mb-3 lg:mb-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-0.5 sm:py-1 rounded-full mb-1"
          >
            <History size={12} className="text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Rekam Jejak Klub</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-lg sm:text-2xl md:text-4xl lg:text-5xl font-black tracking-tighter italic uppercase text-white"
          >
            {title.includes(" ") ? (
              <>
                {title.substring(0, title.lastIndexOf(" "))}{" "}
                <span className="text-blue-500">{title.substring(title.lastIndexOf(" ") + 1)}</span>
              </>
            ) : (
              <span className="text-blue-500">{title}</span>
            )}
          </motion.h2>

          <p className="text-slate-400 max-w-xl mx-auto uppercase tracking-widest text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5">
            PB Bilibili 162 Parepare - Perjalanan, Dedikasi & Prestasi
          </p>
        </div>

        {/* Content Layout Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 md:gap-6 min-h-0 items-stretch">
          
          {/* --- VISUAL IMAGE CARD (5 COLS ON LG, ADAPTIVE PROPORTIONAL WITH FACE FOCUS) --- */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 flex flex-col justify-between bg-[#0b1224]/90 p-2.5 sm:p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl overflow-hidden relative shrink-0 max-h-[170px] xs:max-h-[210px] sm:max-h-[280px] md:max-h-none"
          >
            <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 blur-2xl pointer-events-none" />

            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 group bg-slate-900">
              <img 
                src={dynamicContent.sejarah_image || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=2070"} 
                alt="Pendiri & Sejarah PB Bilibili 162" 
                className="w-full h-full object-cover object-[center_20%] group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#070d1a]/90 via-black/10 to-transparent" />

              {/* Badge Resmi PB Bilibili 162 Overlay */}
              <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-blue-500/30 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-400 shadow-lg">
                <ShieldCheck size={13} className="text-blue-400" />
                <span>Dokumentasi Resmi</span>
              </div>

              {/* Bottom Badge Overlay */}
              <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between gap-1">
                <div className="bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 text-[9px] sm:text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5 shadow-xl">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  <span>PB Bilibili 162</span>
                </div>
                <div className="bg-blue-600/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-blue-400/40 text-[8px] sm:text-[10px] font-bold text-white flex items-center gap-1 shadow-xl">
                  <Sparkles size={11} className="text-amber-300" />
                  <span>Sejarah & Pendiri</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* --- NARRATIVE CONTENT CARD (7 COLS ON LG, FLEX-1 ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex-1 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-0 overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 border-b border-white/10 shrink-0 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
                <h3 className="text-xs sm:text-base md:text-lg font-black uppercase tracking-tight italic text-white flex items-center gap-2">
                  <BookOpen size={15} className="text-blue-400 hidden xs:inline" />
                  Filosofi & Sejarah Perjalanan
                </h3>
              </div>
              <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-[8px] sm:text-[10px] font-bold text-slate-300">
                <Award size={11} className="text-amber-400" />
                <span>Parepare</span>
              </div>
            </div>

            {/* Scrollable Narrative Body */}
            <div className="flex-1 overflow-y-auto pr-1.5 sm:pr-2 space-y-2 sm:space-y-3 custom-scrollbar">
              {paragraphs.length > 0 ? (
                paragraphs.map((para: string, idx: number) => (
                  <p key={idx} className="text-slate-200 text-xs sm:text-sm md:text-base leading-relaxed font-medium text-justify">
                    {para}
                  </p>
                ))
              ) : (
                <p className="text-slate-400 text-xs sm:text-sm italic font-medium">
                  Belum ada data sejarah yang ditambahkan.
                </p>
              )}
            </div>

            {/* Bottom Highlight Tag */}
            <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                PB Bilibili 162 Parepare
              </span>
              <span>Pembinaan Atlet Terpadu</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}

