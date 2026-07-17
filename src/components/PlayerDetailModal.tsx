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
      <div className="fixed inset-0 z-[110000] flex items-center justify-center p-0 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="relative w-full max-w-lg bg-white md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[100dvh] md:h-[90vh]"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex-1 overflow-y-auto bg-white text-slate-800 scrollbar-hide">
            {/* Photo - Looks cooler now */}
            <div className="relative w-full h-[40vh] md:h-[60vh] overflow-hidden rounded-b-3xl shadow-lg">
              {player.img ? (
                <img src={player.img} className="w-full h-full object-cover object-top" alt={player.name} />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                  <User size={80} />
                </div>
              )}
              {/* Subtle Gradient Overlay for Title Clarity */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <h2 className="absolute bottom-4 left-6 text-2xl font-bold text-white uppercase tracking-tight">
                {player.name}
              </h2>
            </div>

            {/* Details List - Compact & Neat */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 rounded-xl"><p className="text-[9px] text-slate-500 uppercase font-medium">Kategori</p><p className="text-xs font-bold text-slate-900">{player.ageGroup}</p></div>
                <div className="bg-slate-50 p-2 rounded-xl"><p className="text-[9px] text-slate-500 uppercase font-medium">Rank</p><p className="text-xs font-bold text-slate-900">#{rank}</p></div>
                <div className="bg-slate-50 p-2 rounded-xl"><p className="text-[9px] text-slate-500 uppercase font-medium">Points</p><p className="text-xs font-bold text-slate-900">{player.displayPoints.toLocaleString()}</p></div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <p className="text-[9px] text-slate-500 uppercase font-medium">Status</p>
                  <p className={`text-xs font-bold mt-0.5 ${
                    (player.status || 'Active').toLowerCase() === 'active' ? 'text-green-600' :
                    (player.status || '').toLowerCase() === 'on leave' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {player.status || 'Active'}
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <h3 className="text-xs font-bold text-slate-900 uppercase mb-1">Biografi Singkat</h3>
                <p className="text-[11px] text-slate-600 leading-snug text-justify line-clamp-3">{player.bio}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
