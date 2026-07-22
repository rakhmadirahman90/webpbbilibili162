import { motion, AnimatePresence } from "framer-motion";
import { X, User } from "lucide-react";
import { useState, useEffect } from "react";

export const PlayerDetailModal = ({ player, processedPlayers, onClose }: any) => {
  const [activeTab, setActiveTab] = useState<'profil' | 'stats'>('profil');

  useEffect(() => {
    setActiveTab('profil');
  }, [player]);

  if (!player) return null;

  const rank = processedPlayers.findIndex((x: any) => x.id === player.id) + 1;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110000] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-[#0b1224] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90dvh]"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-50 p-2 bg-black/60 hover:bg-blue-600 text-white rounded-full transition-all border border-white/20 shadow-lg cursor-pointer active:scale-95"
            title="Tutup Modal"
          >
            <X size={18} />
          </button>

          <div className="flex-1 overflow-y-auto custom-scrollbar text-white">
            {/* Photo Section */}
            <div className="relative w-full h-[32vh] sm:h-[40vh] overflow-hidden bg-[#1a1d26]">
              {player.img ? (
                <img src={player.img} className="w-full h-full object-cover object-top" alt={player.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">
                  <User size={80} />
                </div>
              )}
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1224] via-[#0b1224]/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-12">
                <p className="text-blue-400 text-[9px] font-black uppercase tracking-widest mb-0.5">{player.ageGroup}</p>
                <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight line-clamp-2">
                  {player.name}
                </h2>
              </div>
            </div>

            {/* Details Grid */}
            <div className="p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div className="bg-[#141b2d] border border-white/5 p-3 rounded-2xl">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Kategori</p>
                  <p className="text-xs font-black text-blue-400 mt-0.5">{player.ageGroup}</p>
                </div>
                <div className="bg-[#141b2d] border border-white/5 p-3 rounded-2xl">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Peringkat Klub</p>
                  <p className="text-xs font-black text-amber-400 mt-0.5">#{rank}</p>
                </div>
                <div className="bg-[#141b2d] border border-white/5 p-3 rounded-2xl">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Total Poin</p>
                  <p className="text-xs font-black text-emerald-400 mt-0.5">{player.displayPoints.toLocaleString()} PTS</p>
                </div>
                <div className="bg-[#141b2d] border border-white/5 p-3 rounded-2xl">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Status Atlet</p>
                  <p className={`text-xs font-black mt-0.5 ${
                    (player.status || 'Active').toLowerCase() === 'active' ? 'text-emerald-400' :
                    (player.status || '').toLowerCase() === 'on leave' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {player.status || 'Active'}
                  </p>
                </div>
              </div>

              <div className="bg-[#141b2d] border border-white/5 p-3.5 rounded-2xl">
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-wider mb-1">Profil & Bio Atlet</h3>
                <p className="text-xs text-slate-300 leading-relaxed text-justify">{player.bio}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
