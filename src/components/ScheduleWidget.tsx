import React, { useState, useEffect } from 'react';
import { Timer, Radio, X, Calendar, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { computeScheduleInfo, ScheduleInfo } from '../utils/schedule';

function AnimatedDigit({ value }: { value: string }) {
  return (
    <div className="h-4 relative flex items-center justify-center overflow-hidden min-w-[20px]">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.9 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm font-black text-amber-400 font-mono leading-none block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function ScheduleWidget() {
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>(() => computeScheduleInfo());
  const [showSchedulePopup, setShowSchedulePopup] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleInfo(computeScheduleInfo());
    }, 1000);

    const handleOpenSchedule = () => {
      setShowSchedulePopup(true);
    };

    window.addEventListener('pb-open-schedule', handleOpenSchedule);

    return () => {
      clearInterval(timer);
      window.removeEventListener('pb-open-schedule', handleOpenSchedule);
    };
  }, []);

  return (
    <AnimatePresence>
      {showSchedulePopup ? (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[380px] bg-[#0b1224]/95 backdrop-blur-2xl border border-amber-500/40 rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] z-50 overflow-hidden"
        >
          {/* Ambient Background Glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full pointer-events-none" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10 relative z-10 mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-xl border shrink-0 ${
                scheduleInfo.isOngoing
                  ? 'bg-red-500/20 border-red-500/40 text-red-400 animate-pulse'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}>
                <Timer size={16} />
              </div>
              <div>
                <h4 className="text-xs font-black text-white italic uppercase tracking-wider flex items-center gap-1.5">
                  <span>Jadwal Latihan PB 162</span>
                  {scheduleInfo.isOngoing ? (
                    <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[8px] font-black uppercase animate-pulse">
                      LIVE
                    </span>
                  ) : scheduleInfo.isTodayFinished ? (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[8px] font-black uppercase">
                      SELESAI HARI INI
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[8px] font-black uppercase">
                      COUNTDOWN
                    </span>
                  )}
                </h4>
                <p className="text-[9px] text-slate-400">
                  {scheduleInfo.isOngoing
                    ? 'Sesi sedang berlangsung!'
                    : scheduleInfo.isTodayFinished
                    ? `Sesi hari ini selesai. Menuju: Hari ${scheduleInfo.nextSessionDay}`
                    : `Berikutnya: Hari ${scheduleInfo.nextSessionDay}`}
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowSchedulePopup(false)}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer active:scale-95"
              title="Tutup Jadwal Latihan"
            >
              <X size={14} />
            </button>
          </div>

          {/* Countdown Box */}
          <div className="bg-slate-950/80 p-2.5 rounded-2xl border border-amber-500/20 mb-3 text-center relative z-10">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
              <Radio size={10} className="text-amber-400 animate-pulse" />
              <span>
                {scheduleInfo.isOngoing
                  ? scheduleInfo.activeSessionName
                  : scheduleInfo.isTodayFinished
                  ? `Sesi Hari Ini Selesai • Next: ${scheduleInfo.nextSessionName}`
                  : scheduleInfo.nextSessionName}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              <div className="bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[46px] flex flex-col items-center justify-center">
                <AnimatedDigit value={String(scheduleInfo.days).padStart(2, '0')} />
                <span className="text-[7px] font-black text-slate-400 uppercase block mt-1">HARI</span>
              </div>
              <span className="text-slate-500 font-black text-xs">:</span>
              <div className="bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[46px] flex flex-col items-center justify-center">
                <AnimatedDigit value={String(scheduleInfo.hours).padStart(2, '0')} />
                <span className="text-[7px] font-black text-slate-400 uppercase block mt-1">JAM</span>
              </div>
              <span className="text-slate-500 font-black text-xs">:</span>
              <div className="bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[46px] flex flex-col items-center justify-center">
                <AnimatedDigit value={String(scheduleInfo.minutes).padStart(2, '0')} />
                <span className="text-[7px] font-black text-slate-400 uppercase block mt-1">MENIT</span>
              </div>
              <span className="text-slate-500 font-black text-xs">:</span>
              <div className="bg-slate-900 border border-white/10 px-2.5 py-1.5 rounded-xl min-w-[46px] flex flex-col items-center justify-center">
                <AnimatedDigit value={String(scheduleInfo.seconds).padStart(2, '0')} />
                <span className="text-[7px] font-black text-slate-400 uppercase block mt-1">DETIK</span>
              </div>
            </div>
          </div>

          {/* List Mini Jadwal - Separated for Rabu, Jumat & Ahad */}
          <div className="space-y-1.5 text-[10px] relative z-10">
            {/* Rabu */}
            <div className="bg-slate-900/80 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="font-black text-white flex items-center gap-1">
                  <Calendar size={11} className="text-blue-400" />
                  Hari Rabu (08.00 - 12.00 WITA)
                </p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} className="text-slate-500" /> GOR SMAN 4 Parepare
                </p>
              </div>
              {scheduleInfo.isRabuActive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Aktif
                </span>
              ) : scheduleInfo.isRabuFinished ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Selesai
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Akan Datang
                </span>
              )}
            </div>

            {/* Jumat */}
            <div className="bg-slate-900/80 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="font-black text-white flex items-center gap-1">
                  <Calendar size={11} className="text-indigo-400" />
                  Hari Jumat (08.00 - 12.00 WITA)
                </p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} className="text-slate-500" /> GOR SMAN 4 Parepare
                </p>
              </div>
              {scheduleInfo.isJumatActive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Aktif
                </span>
              ) : scheduleInfo.isJumatFinished ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Selesai
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Akan Datang
                </span>
              )}
            </div>

            {/* Ahad */}
            <div className="bg-slate-900/80 border border-white/5 p-2 rounded-xl flex items-center justify-between gap-2">
              <div>
                <p className="font-black text-white flex items-center gap-1">
                  <Calendar size={11} className="text-emerald-400" />
                  Hari Ahad (08.00 - 12.00 WITA)
                </p>
                <p className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} className="text-slate-500" /> GOR A4 Soreang
                </p>
              </div>
              {scheduleInfo.isAhadActive ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                  Aktif
                </span>
              ) : scheduleInfo.isAhadFinished ? (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Selesai
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wide flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Akan Datang
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => setShowSchedulePopup(true)}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-12 h-12 rounded-2xl bg-[#0b1224]/95 hover:bg-[#121c38] text-amber-400 border border-amber-500/40 shadow-[0_10px_25px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50 flex items-center justify-center transition-all active:scale-95 cursor-pointer group hover:border-amber-400 hover:shadow-amber-500/20"
          title="Jadwal & Countdown Latihan PB 162"
        >
          <Timer size={22} className="group-hover:scale-110 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#0b1224] flex items-center justify-center">
            <span className="w-full h-full rounded-full bg-amber-400 animate-ping opacity-75" />
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
