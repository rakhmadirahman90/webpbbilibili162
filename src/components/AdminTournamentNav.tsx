import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, ClipboardList, Medal, Swords, Tv, BarChart3 } from 'lucide-react';

const menus = [
  { label: 'Pusat Turnamen', path: '/admin/kelola-turnamen', icon: Trophy, desc: 'Data turnamen & peserta' },
  { label: 'Pendaftaran Peserta', path: '/admin/pendaftaran-turnamen', icon: ClipboardList, desc: 'Verifikasi & pembayaran' },
  { label: 'Peserta Seeded', path: '/admin/seeded-peserta', icon: Medal, desc: 'Kelola seeded turnamen' },
  { label: 'Turnamen & Liga', path: '/admin/turnamen-liga', icon: BarChart3, desc: 'Klasemen, bracket & jadwal' },
  { label: 'Pertandingan & Skor', path: '/admin/skor', icon: Swords, desc: 'Input hasil pertandingan' },
  { label: 'Live Score', path: '/admin/live-score', icon: Tv, desc: 'Pantau skor lapangan' },
];

export default function AdminTournamentNav() {
  return (
    <section className="sticky top-0 z-30 border-b border-amber-400/10 bg-[#07101f]/95 px-3 py-2.5 shadow-lg backdrop-blur-xl sm:px-5 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300">
            <Trophy size={15} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Manajemen Turnamen</p>
            <p className="hidden text-[9px] text-slate-500 sm:block">Semua fitur turnamen terpusat dalam satu menu</p>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin" aria-label="Menu turnamen admin">
          {menus.map(({ label, path, icon: Icon, desc }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `group flex min-w-[145px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-all sm:min-w-[175px] ${isActive ? 'border-amber-400/40 bg-amber-400/10 text-white shadow-lg shadow-amber-900/10' : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-amber-400/25 hover:bg-slate-800/90 hover:text-white'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-slate-400 group-hover:text-amber-300'}`}>
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[9px] font-black uppercase tracking-wide">{label}</span>
                    <span className="block truncate text-[8px] text-slate-500">{desc}</span>
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </section>
  );
}
