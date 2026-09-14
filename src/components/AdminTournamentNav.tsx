import React from 'react';
import { NavLink } from 'react-router-dom';
import { Trophy, CalendarDays, ClipboardList, Medal, Tv, Swords, WalletCards, Handshake, FileText } from 'lucide-react';

const menus = [
  { label: 'Dashboard Turnamen', path: '/admin/pusat-turnamen', icon: Trophy, desc: 'Pusat workflow event' },
  { label: 'Atur Event Turnamen', path: '/admin/kelola-turnamen', icon: CalendarDays, desc: 'Buat & aktifkan event' },
  { label: 'Pendaftaran Peserta', path: '/admin/pendaftaran-turnamen', icon: ClipboardList, desc: 'Verifikasi & pembayaran' },
  { label: 'Kelola Seeded', path: '/admin/seeded-turnamen', icon: Medal, desc: 'Peserta unggulan event' },
  { label: 'Live Score Lapangan', path: '/admin/live-score', icon: Tv, desc: 'Pantau skor realtime' },
  { label: 'Hasil & Skor', path: '/admin/skor', icon: Swords, desc: 'Hasil pertandingan' },
  { label: 'Keuangan Turnamen', path: '/admin/keuangan-turnamen', icon: WalletCards, desc: 'Kas & pertanggungjawaban' },
  { label: 'Sponsorship Event', path: '/admin/sponsorship', icon: Handshake, desc: 'Sponsor & dukungan event' },
  { label: 'Laporan Turnamen', path: '/admin/laporan', icon: FileText, desc: 'Laporan & rekap' },
];

export default function AdminTournamentNav() {
  return (
    <section className="sticky top-0 z-30 border-b border-amber-400/10 bg-[#07101f]/95 px-3 py-2.5 shadow-lg backdrop-blur-xl sm:px-5 md:px-8">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/10 text-amber-300"><Trophy size={15} /></div>
          <div className="min-w-0"><p className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Pusat Turnamen</p><p className="hidden text-[9px] text-slate-500 sm:block">Semua menu event turnamen terpusat di sini</p></div>
        </div>
        <nav className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-thin" aria-label="Menu turnamen admin">
          {menus.map(({ label, path, icon: Icon, desc }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `group flex min-w-[145px] shrink-0 items-center gap-2 rounded-xl border px-3 py-2 transition-all sm:min-w-[175px] ${isActive ? 'border-amber-400/40 bg-amber-400/10 text-white shadow-lg shadow-amber-900/10' : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-amber-400/25 hover:bg-slate-800/90 hover:text-white'}`}>
              {({ isActive }) => <><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-amber-400/15 text-amber-300' : 'bg-white/5 text-slate-400 group-hover:text-amber-300'}`}><Icon size={16} /></span><span className="min-w-0"><span className="block truncate text-[9px] font-black uppercase tracking-wide">{label}</span><span className="block truncate text-[8px] text-slate-500">{desc}</span></span></>}
            </NavLink>
          ))}
        </nav>
      </div>
    </section>
  );
}
