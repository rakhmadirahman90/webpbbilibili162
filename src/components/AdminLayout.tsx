import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminRouteView from './AdminRouteView';
import { Menu as MenuIcon, Handshake } from 'lucide-react';

interface AdminLayoutProps { children: React.ReactNode; email: string; }

function cleanupDuplicateTournamentMenu() {
  if (typeof document === 'undefined') return;
  const sidebar = document.getElementById('admin-sidebar') || document.querySelector('[data-admin-sidebar]');
  if (!sidebar) return;
  const links = Array.from(sidebar.querySelectorAll('a')) as HTMLAnchorElement[];
  const normalize = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase();
  const tournamentLinks = links.filter((link) => { const text = normalize(link.textContent || ''); const href = (link.getAttribute('href') || '').toLowerCase(); return text === 'pendaftaran peserta turnamen' || href.endsWith('/admin/pendaftaran-turnamen') || href.endsWith('/admin/peserta-turnamen'); });
  if (tournamentLinks.length <= 1) return;
  const preferred = tournamentLinks.find((link) => (link.getAttribute('href') || '').toLowerCase().endsWith('/admin/pendaftaran-turnamen')) || tournamentLinks[0];
  tournamentLinks.forEach((link) => { if (link !== preferred) link.remove(); });
  const groups = Array.from(sidebar.querySelectorAll('button'));
  groups.forEach((button) => { const section = button.parentElement?.parentElement; if (!section) return; const linksInSection = section.querySelectorAll('a').length; const count = button.querySelector('.font-mono'); if (count) count.textContent = String(linksInSection); });
}

export default function AdminLayout({ children, email }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); const location = useLocation(); const adminPath = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '').toLowerCase(); const isDashboard = adminPath === '' || adminPath === 'dashboard';
  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);
  useEffect(() => { if (typeof document === 'undefined') return; document.body.style.overflow = isSidebarOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isSidebarOpen]);
  useEffect(() => { cleanupDuplicateTournamentMenu(); const observer = new MutationObserver(() => cleanupDuplicateTournamentMenu()); const root = document.getElementById('admin-sidebar') || document.body; observer.observe(root, { childList: true, subtree: true }); const timer = window.setTimeout(cleanupDuplicateTournamentMenu, 1000); return () => { observer.disconnect(); window.clearTimeout(timer); }; }, [location.pathname]);
  return <div className="h-[100dvh] min-h-0 flex bg-[#07101f] overflow-hidden">
    <div className={`admin-sidebar-shell ${isSidebarOpen ? 'is-open' : 'is-closed'}`} aria-hidden={!isSidebarOpen}><Sidebar email={email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /></div>
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh] overflow-hidden bg-[#07101f]">
      <header className="admin-mobile-header md:hidden sticky top-0 flex-shrink-0 px-4 py-2.5 backdrop-blur-xl border-b flex items-center justify-between z-40 shadow-lg">
        <button type="button" onClick={() => setIsSidebarOpen(true)} className="admin-mobile-menu-btn min-w-11 min-h-11 p-2 rounded-xl transition-colors flex items-center gap-2 touch-manipulation" aria-label="Buka menu navigasi" aria-expanded={isSidebarOpen}><MenuIcon size={22}/><span className="hidden xs:inline text-xs font-bold uppercase tracking-wider">Menu</span></button>
        <a href="/admin/sponsorship" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200" aria-label="Kelola sponsorship"><Handshake size={14}/> Sponsorship</a>
        <span className="admin-mobile-badge text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap">Admin Portal</span>
      </header>
      <a href="/admin/sponsorship" className="fixed right-5 top-4 z-50 hidden md:inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-[#0b1224]/95 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-xl backdrop-blur hover:border-amber-300/40" aria-label="Kelola sponsorship"><Handshake size={14}/> Sponsorship</a>
      <main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">{isDashboard ? children : <AdminRouteView session={{ user: { email } }}/>}</main>
    </div>
  </div>;
}
