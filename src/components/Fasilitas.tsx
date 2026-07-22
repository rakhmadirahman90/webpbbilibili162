import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Zap, Loader2, Building, Sparkles, CheckCircle2, Eye, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Fasilitas() {
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState<string | null>(null);
  const [dynamicContent, setDynamicContent] = useState<any>({
    fasilitas_title: "Fasilitas Unggulan",
    fasilitas_main_image: "",
    fasilitas_img1: "",
    fasilitas_img2: "",
    fasilitas_list: []
  });

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
            fasilitas_title: val.fasilitas_title || "Fasilitas Unggulan",
            fasilitas_main_image: val.fasilitas_img1 || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1200",
            fasilitas_img1: val.fasilitas_img2 || "https://images.unsplash.com/photo-1544033527-b192daee1f5b?q=80&w=1200",
            fasilitas_img2: val.fasilitas_img3 || "https://images.unsplash.com/photo-1521537634581-0dced2efa2a3?q=80&w=1200",
            fasilitas_list: Array.isArray(val.fasilitas_list) && val.fasilitas_list.length > 0 
              ? val.fasilitas_list 
              : [
                  "Lapangan Bulutangkis Standar PBSI",
                  "Pencahayaan LED Bebas Silau",
                  "Karpet Lapangan Karpet Vynil Pro",
                  "Tribun Penonton & Ruang Tunggu",
                  "Peralatan Latihan & Shuttlecock",
                  "Ruang Ganti & Toilet Bersih"
                ]
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
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Memuat Fasilitas...</span>
      </div>
    );
  }

  const images = [
    dynamicContent.fasilitas_main_image, 
    dynamicContent.fasilitas_img1, 
    dynamicContent.fasilitas_img2
  ].filter(Boolean);

  const title = dynamicContent.fasilitas_title || "Fasilitas Unggulan";

  return (
    <section className="w-full h-full flex flex-col justify-between py-1 sm:py-3 md:py-6 bg-[#070d1a] text-white relative overflow-hidden select-none">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-blue-600/10 blur-[90px] rounded-full pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-[280px] sm:w-[400px] h-[280px] sm:h-[400px] bg-indigo-600/10 blur-[90px] rounded-full pointer-events-none -ml-20 -mb-20" />

      {/* --- IMAGE MODAL PREVIEW --- */}
      <AnimatePresence>
        {selectedImg && (
          <div className="fixed inset-0 z-[110000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedImg(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden border border-white/20 z-10"
            >
              <button 
                onClick={() => setSelectedImg(null)}
                className="absolute top-3 right-3 p-2 bg-black/70 hover:bg-black text-white rounded-full z-20"
              >
                <X size={20} />
              </button>
              <img src={selectedImg} alt="Preview Fasilitas" className="w-full h-full object-contain max-h-[80vh]" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-4 md:px-6 relative z-10 flex flex-col h-full justify-between min-h-0">
        {/* Header Section Compact */}
        <div className="text-center mb-2 sm:mb-3 lg:mb-6 shrink-0">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-1.5 bg-blue-600/10 border border-blue-500/20 px-3 py-0.5 sm:py-1 rounded-full mb-1"
          >
            <Building size={12} className="text-blue-400" />
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Sarana & Prasarana</span>
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
            Peralatan & Lapangan Latihan PB Bilibili 162 Parepare
          </p>
        </div>

        {/* Content Layout Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-4 md:gap-6 min-h-0 items-stretch">
          
          {/* --- LEFT: GALLERY CARD (5 COLS ON LG, COMPACT HEIGHT ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-5 bg-[#0b1224]/90 p-2.5 sm:p-4 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between shrink-0 max-h-[170px] xs:max-h-[200px] sm:max-h-[260px] md:max-h-none overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-white/10 shrink-0 mb-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-tight italic text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> Visual Sarana
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase">{images.length} Foto</span>
            </div>

            {/* Images Grid */}
            <div className="flex-1 grid grid-cols-3 gap-1.5 sm:gap-2 min-h-0 overflow-hidden">
              {images.map((img, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSelectedImg(img)}
                  className="group relative w-full h-full rounded-xl overflow-hidden border border-white/10 cursor-pointer bg-slate-900"
                >
                  <img 
                    src={img} 
                    alt={`Fasilitas ${idx + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={18} className="text-white" />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-blue-400">Standar Nasional PBSI</span>
              <span>Parepare</span>
            </div>
          </motion.div>

          {/* --- RIGHT: LIST CARD (7 COLS ON LG, FLEX-1 ON MOBILE) --- */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-7 flex-1 bg-[#0b1224]/90 p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-3xl border border-white/10 backdrop-blur-xl shadow-xl flex flex-col min-h-0 overflow-hidden relative"
          >
            <div className="flex items-center justify-between pb-1.5 sm:pb-2.5 border-b border-white/10 shrink-0 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 sm:h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"></span>
                <h3 className="text-xs sm:text-base md:text-lg font-black uppercase tracking-tight italic text-white flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-blue-400" />
                  Kelengkapan & Fasilitas Terpadu
                </h3>
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                {dynamicContent.fasilitas_list.length} Item
              </span>
            </div>

            {/* Scrollable Facility Grid */}
            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
                {dynamicContent.fasilitas_list.map((item: any, i: number) => {
                  const text = typeof item === 'string' ? item : item.title || item.text || item;
                  return (
                    <div 
                      key={i} 
                      className="bg-white/5 p-2.5 sm:p-3 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all flex items-center gap-2.5 group shadow-sm"
                    >
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                        <Zap size={14} />
                      </div>
                      <p className="text-slate-200 text-[10px] sm:text-xs font-bold uppercase tracking-tight leading-snug line-clamp-2">
                        {text}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Highlight Tag */}
            <div className="mt-2 pt-2 border-t border-white/10 shrink-0 flex items-center justify-between text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="text-blue-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping"></span>
                PB Bilibili 162
              </span>
              <span>Sarana Terawat & Siap Pakai</span>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
