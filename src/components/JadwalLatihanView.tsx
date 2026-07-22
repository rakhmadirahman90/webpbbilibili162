import React, { useState, useEffect } from 'react';
import { Timer, Calendar, MapPin, Clock, Users, ShieldCheck, Zap, Radio, ChevronRight, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { computeScheduleInfo, ScheduleInfo } from '../utils/schedule';

export default function JadwalLatihanView() {
  const [scheduleInfo, setScheduleInfo] = useState<ScheduleInfo>(() => computeScheduleInfo());

  useEffect(() => {
    const timer = setInterval(() => {
      setScheduleInfo(computeScheduleInfo());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const schedules = [
    {
      id: 'rabu',
      day: 'Rabu',
      time: '08.00 - 12.00 WITA',
      location: 'GOR SMAN 4 Parepare',
      address: 'Jl. Pemuda, Kota Parepare',
      badgeColor: 'blue',
      program: 'Latihan Teknik & Stamina',
      activities: [
        'Pemanasan & Agility Footwork (30 Menit)',
        'Drill Pukulan Drive, Drop & Smash (60 Menit)',
        'Game Simulasi Ganda & Tunggal (120 Menit)',
        'Pendinginan & Evaluasi Pelatih (30 Menit)'
      ],
      isActive: scheduleInfo.isRabuActive,
      isFinished: scheduleInfo.isRabuFinished
    },
    {
      id: 'jumat',
      day: 'Jumat',
      time: '08.00 - 12.00 WITA',
      location: 'GOR SMAN 4 Parepare',
      address: 'Jl. Pemuda, Kota Parepare',
      badgeColor: 'indigo',
      program: 'Drill Taktis & Fisik Intensif',
      activities: [
        'Stretching & Warm Up Dinamis (30 Menit)',
        'Drill Pertahanan & Serangan Cepat (60 Menit)',
        'Sparring Internal Anggota (120 Menit)',
        'Cooling Down & Briefing Skuad (30 Menit)'
      ],
      isActive: scheduleInfo.isJumatActive,
      isFinished: scheduleInfo.isJumatFinished
    },
    {
      id: 'ahad',
      day: 'Ahad',
      time: '08.00 - 12.00 WITA',
      location: 'GOR A4 Soreang',
      address: 'Kec. Soreang, Kota Parepare',
      badgeColor: 'emerald',
      program: 'Match Day & Turnamen Internal',
      activities: [
        'Pemanasan & Stretching Bebas (30 Menit)',
        'Pertandingan Beregu & Point System (150 Menit)',
        'Pencatatan Poin Ranking Atlet (30 Menit)',
        'Evaluasi & Foto Bersama Anggota (30 Menit)'
      ],
      isActive: scheduleInfo.isAhadActive,
      isFinished: scheduleInfo.isAhadFinished
    }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 font-sans text-white pb-12">
      {/* HEADER TITLE CARD */}
      <div className="bg-gradient-to-r from-[#0b1224] via-[#101a35] to-[#0b1224] border border-white/10 rounded-3xl p-5 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-widest">
              <Calendar size={14} />
              <span>Agenda Resmi Klub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tight uppercase text-white">
              Jadwal Latihan <span className="text-amber-400">PB Bilibili 162</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              Jadwal rutin latihan bulutangkis terpadu setiap pekan. Dilengkapi sistem countdown real-time, lokasi GOR resmi, serta panduan porsi latihan seluruh anggota.
            </p>
          </div>

          {/* REALTIME STATUS CARD */}
          <div className="bg-slate-950/80 border border-amber-500/30 p-4 sm:p-5 rounded-2xl shadow-xl min-w-[280px] shrink-0">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/10 mb-3">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                <Radio size={12} className="text-amber-400 animate-pulse" /> Status Latihan
              </span>
              {scheduleInfo.isOngoing ? (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase tracking-wider animate-pulse">
                  SESI LIVE
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
                  COUNTDOWN
                </span>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-300">
                {scheduleInfo.isOngoing
                  ? scheduleInfo.activeSessionName
                  : scheduleInfo.isTodayFinished
                  ? `Sesi Hari Ini Selesai • Next: ${scheduleInfo.nextSessionName}`
                  : scheduleInfo.nextSessionName}
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                <div className="bg-slate-900 border border-white/10 px-2 py-1 rounded-xl min-w-[40px]">
                  <span className="text-sm font-black text-amber-400 font-mono block">{String(scheduleInfo.days).padStart(2, '0')}</span>
                  <span className="text-[7px] text-slate-500 font-bold block">HARI</span>
                </div>
                <span className="text-slate-600 font-black text-xs">:</span>
                <div className="bg-slate-900 border border-white/10 px-2 py-1 rounded-xl min-w-[40px]">
                  <span className="text-sm font-black text-amber-400 font-mono block">{String(scheduleInfo.hours).padStart(2, '0')}</span>
                  <span className="text-[7px] text-slate-500 font-bold block">JAM</span>
                </div>
                <span className="text-slate-600 font-black text-xs">:</span>
                <div className="bg-slate-900 border border-white/10 px-2 py-1 rounded-xl min-w-[40px]">
                  <span className="text-sm font-black text-amber-400 font-mono block">{String(scheduleInfo.minutes).padStart(2, '0')}</span>
                  <span className="text-[7px] text-slate-500 font-bold block">MENIT</span>
                </div>
                <span className="text-slate-600 font-black text-xs">:</span>
                <div className="bg-slate-900 border border-white/10 px-2 py-1 rounded-xl min-w-[40px]">
                  <span className="text-sm font-black text-amber-400 font-mono block">{String(scheduleInfo.seconds).padStart(2, '0')}</span>
                  <span className="text-[7px] text-slate-500 font-bold block">DETIK</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 DAYS SCHEDULE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {schedules.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`bg-[#0b1224] border rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:border-amber-500/50 hover:shadow-2xl ${
              item.isActive
                ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
                : 'border-white/10'
            }`}
          >
            {/* Ambient Corner Blur */}
            <div className={`absolute top-0 right-0 w-32 h-32 blur-2xl rounded-full pointer-events-none ${
              item.id === 'rabu' ? 'bg-blue-600/10' : item.id === 'jumat' ? 'bg-indigo-600/10' : 'bg-emerald-600/10'
            }`} />

            <div>
              {/* Header Badge */}
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl font-black text-xs uppercase tracking-wider ${
                    item.id === 'rabu'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : item.id === 'jumat'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic tracking-wider text-white">
                      Hari {item.day}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold">{item.program}</p>
                  </div>
                </div>

                {item.isActive ? (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[9px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    LIVE
                  </span>
                ) : item.isFinished ? (
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[9px] font-black uppercase tracking-wider">
                    Selesai
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black uppercase tracking-wider">
                    Mendatang
                  </span>
                )}
              </div>

              {/* Time & Location Details */}
              <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 mb-5">
                <div className="flex items-center gap-2.5 text-xs text-slate-200">
                  <Clock size={15} className="text-amber-400 shrink-0" />
                  <span className="font-bold">{item.time}</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-slate-300">
                  <MapPin size={15} className="text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white">{item.location}</p>
                    <p className="text-[10px] text-slate-400">{item.address}</p>
                  </div>
                </div>
              </div>

              {/* Program Activities */}
              <div className="space-y-2 mb-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <Zap size={12} className="text-amber-400" />
                  <span>Rangkaian Sesi Latihan</span>
                </p>
                <div className="space-y-1.5">
                  {item.activities.map((act, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-300 bg-white/5 p-2 rounded-xl border border-white/5">
                      <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] font-medium leading-tight">{act}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-semibold text-slate-400">Seragam: Jersey PB 162</span>
              <span className="font-bold text-blue-400 flex items-center gap-1">
                Kota Parepare
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* RULES & FAQ SECTION */}
      <div className="bg-[#0b1224] border border-white/10 rounded-3xl p-5 sm:p-8 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase italic tracking-wider text-white">
              Tata Tertib & Ketentuan Sesi Latihan
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Harap dipatuhi oleh seluruh anggota demi kelancaran dan ketertiban latihan bersama.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Kehadiran Tepat Waktu
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Tiba di GOR 15 menit sebelum pukul 08.00 WITA untuk pemanasan bersama.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Atribut Jersey Resmi
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Wajib mengenakan Jersey Resmi PB Bilibili 162 saat mengikuti sesi game internal.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Kebersihan GOR
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Menjaga kebersihan lapangan dan buang sampah shuttlecock/botol pada tempatnya.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-white/5 space-y-1">
            <p className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Sportivitas Tinggi
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Saling mendukung sesama anggota, menghormati keputusan wasit/panitia sparring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
