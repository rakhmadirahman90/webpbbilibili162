import React from 'react';
import { 
  Wallet, 
  BrainCircuit, 
  Trophy, 
  UserCheck, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp,
  Award,
  Zap,
  HelpCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface LandingFeaturesProps {
  onNavigate: (sectionId: string, subPath?: string) => void;
}

export default function LandingFeatures({ onNavigate }: LandingFeaturesProps) {
  return (
    <section className="relative py-12 md:py-20 px-4 sm:px-6 md:px-8 bg-[#070d1a] text-white overflow-hidden border-t border-b border-white/5">
      {/* Glow Effects Background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-10 sm:space-y-12 relative z-10">
        {/* Section Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span>Fitur Unggulan & Transparansi Klub</span>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tight"
          >
            Akses Keuangan Transparan & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Game Quiz Interaktif</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed"
          >
            Nikmati keterbukaan informasi kas klub secara real-time dan asah wawasan bulutangkis Anda melalui quiz interaktif PB Bilibili 162.
          </motion.p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {/* Card 1: Transparansi Laporan Kas */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="group relative bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)] transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30 group-hover:scale-110 transition-transform">
                <Wallet size={24} />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Real-Time & Akurat
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-wide text-white group-hover:text-blue-400 transition-colors">
                  Laporan Kas Klub
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Transparansi penuh iuran bulanan, pengeluaran kok, cetak laporan PDF resmi, dan rincian saldo kas klub.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Iuran Anggota & Binaan</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-blue-400 shrink-0" />
                  <span>Unduh Rekap Laporan PDF</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('kas')}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer group-hover:translate-x-0.5 active:scale-95"
            >
              <span>Buka Laporan Kas</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>

          {/* Card 2: Quiz Badminton Interaktif */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="group relative bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 group-hover:scale-110 transition-transform">
                <BrainCircuit size={24} />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  10 Level Teka-Teki
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-wide text-white group-hover:text-indigo-400 transition-colors">
                  Quiz Badminton
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Tantang pengetahuan bulutangkis Anda dari istilah teknik, aturan servis, hingga strategi pertandingan.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Zap size={14} className="text-amber-400 shrink-0" />
                  <span>Tts & Trivia Bulutangkis</span>
                </li>
                <li className="flex items-center gap-2">
                  <Award size={14} className="text-purple-400 shrink-0" />
                  <span>Sistem Bintang & Sertifikat</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('quiz')}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <span>Mainkan Quiz</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>

          {/* Card 3: Peringkat & Poin Atlet */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="group relative bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.2)] transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <Trophy size={24} />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  Klasemen Turnamen
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-wide text-white group-hover:text-amber-400 transition-colors">
                  Peringkat Atlet
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Pantau posisi klasemen, akumulasi poin pertandingan resmi, dan prestasi atlet PB Bilibili 162.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <Trophy size={14} className="text-amber-400 shrink-0" />
                  <span>Top Ranking Senior & Muda</span>
                </li>
                <li className="flex items-center gap-2">
                  <TrendingUp size={14} className="text-emerald-400 shrink-0" />
                  <span>Audit Poin Pertandingan</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('peringkat')}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-amber-500/30 transition-all cursor-pointer active:scale-95"
            >
              <span>Lihat Ranking</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>

          {/* Card 4: Portal Profil Anggota */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="group relative bg-[#0b1224]/90 border border-white/10 rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-300"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 group-hover:scale-110 transition-transform">
                <UserCheck size={24} />
              </div>

              <div className="space-y-2">
                <div className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Portal Keanggotaan
                </div>
                <h3 className="text-lg font-black uppercase italic tracking-wide text-white group-hover:text-emerald-400 transition-colors">
                  Profil Anggota
                </h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Akses khusus anggota terdaftar untuk melihat Kartu Anggota (KTA), atur PIN, dan statistik pribadi.
                </p>
              </div>

              <ul className="space-y-2 pt-2 border-t border-white/5 text-[11px] text-slate-300 font-medium">
                <li className="flex items-center gap-2">
                  <UserCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>KTA Digital Resmi</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-blue-400 shrink-0" />
                  <span>Akses Terproteksi PIN</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="mt-6 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
            >
              <span>Akses Halaman Anggota</span>
              <ArrowRight size={15} />
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
