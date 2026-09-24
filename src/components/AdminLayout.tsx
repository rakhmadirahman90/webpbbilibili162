import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminRouteView from './AdminRouteView';
import AdminAgendaPB162 from './AdminAgendaPB162';
import { Menu as MenuIcon, Handshake, Bell } from 'lucide-react';

interface AdminLayoutProps { children: React.ReactNode; email: string; }

type LocalPortalSession = { user?: { email?: string; user_metadata?: { role?: string; [key: string]: any }; [key: string]: any } };

function readLocalPortalSession(): LocalPortalSession | null {
  try {
    const raw = localStorage.getItem('local_admin_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const [portalSession, setPortalSession] = useState<LocalPortalSession | null>(() => readLocalPortalSession());
  const [portalReady, setPortalReady] = useState(false);
  const role = portalSession?.user?.user_metadata?.role === 'anggota' ? 'anggota' : 'admin';
  const isAdmin = role === 'admin';
  const portalEmail = portalSession?.user?.email || email || '';
  const adminPath = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '').toLowerCase();
  const isDashboard = adminPath === '' || adminPath === 'dashboard';
  useEffect(() => {
    const syncPortalSession = () => {
      setPortalSession(readLocalPortalSession());
      setPortalReady(true);
    };
    syncPortalSession();
    window.addEventListener('local-session-changed', syncPortalSession);
    window.addEventListener('storage', syncPortalSession);
    return () => {
      window.removeEventListener('local-session-changed', syncPortalSession);
      window.removeEventListener('storage', syncPortalSession);
    };
  }, []);
  useEffect(() => {
    const session = readLocalPortalSession();
    if (!session?.user?.id) return;

    const metadata = session.user.user_metadata || {};
    const activityRaw = localStorage.getItem('pb_login_activity');
    let activity: any = {};
    try { activity = activityRaw ? JSON.parse(activityRaw) : {}; } catch {}

    const presence = supabase.channel('pb-bilibili-162-online-users', {
      config: { presence: { key: String(session.user.id) } }
    });

    const track = async () => {
      const now = new Date().toISOString();
      const payload = {
        user_id: String(session.user.id),
        email: session.user.email || '',
        nama: metadata.nama || session.user.email || 'User',
        role: metadata.role || role,
        foto_url: metadata.foto_url || '',
        login_at: activity.login_at || now,
        last_seen_at: now,
        pathname: typeof window !== 'undefined' ? window.location.pathname : '/admin'
      };
      try {
        await presence.track(payload);
        localStorage.setItem('pb_login_activity', JSON.stringify({
          user_id: String(session.user.id),
          login_at: payload.login_at,
          last_seen_at: now
        }));
      } catch {}
    };

    presence.subscribe((status) => {
      if (status === 'SUBSCRIBED') void track();
    });

    const heartbeat = window.setInterval(() => { void track(); }, 30000);

    return () => {
      window.clearInterval(heartbeat);
      void presence.untrack();
      void supabase.removeChannel(presence);
    };
  }, [portalSession?.user?.id]);
  useEffect(() => { setIsSidebarOpen(false); }, [location.pathname]);
  useEffect(() => { if (typeof document === 'undefined') return; document.body.style.overflow = isSidebarOpen ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [isSidebarOpen]);
  useEffect(() => { cleanupDuplicateTournamentMenu(); const observer = new MutationObserver(() => cleanupDuplicateTournamentMenu()); const root = document.getElementById('admin-sidebar') || document.body; observer.observe(root, { childList: true, subtree: true }); const timer = window.setTimeout(cleanupDuplicateTournamentMenu, 1000); return () => { observer.disconnect(); window.clearTimeout(timer); }; }, [location.pathname]);
  const content = isDashboard
    ? children
    : adminPath === 'agenda'
      ? (isAdmin ? <AdminAgendaPB162 /> : <AdminDashboard />)
      : <AdminRouteView session={{ user: { email: portalEmail, user_metadata: portalSession?.user?.user_metadata || { role } } }} />;
  if (!portalReady) return <div className="h-[100dvh] flex items-center justify-center bg-[#07101f] text-slate-300 text-sm">Memuat portal...</div>;
  if (!portalSession) { window.location.replace('/login'); return null; }

  return <div className="h-[100dvh] min-h-0 flex bg-[#07101f] overflow-hidden">
    <div className={`admin-sidebar-shell ${isSidebarOpen ? 'is-open' : 'is-closed'}`} aria-hidden={!isSidebarOpen}><Sidebar email={portalEmail} role={role} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /></div>
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh] overflow-hidden bg-[#07101f]">
      <header className="admin-mobile-header md:hidden sticky top-0 flex-shrink-0 px-4 py-2.5 backdrop-blur-xl border-b flex items-center justify-between z-40 shadow-lg">
        <button type="button" onClick={() => setIsSidebarOpen(true)} className="admin-mobile-menu-btn min-w-11 min-h-11 p-2 rounded-xl transition-colors flex items-center gap-2 touch-manipulation" aria-label="Buka menu navigasi" aria-expanded={isSidebarOpen}><MenuIcon size={22}/><span className="hidden xs:inline text-xs font-bold uppercase tracking-wider">Menu</span></button>
        <div className="flex items-center gap-2 min-w-0">
          <a href="/admin/notifications" className="admin-mobile-notification-btn relative inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-emerald-400/25 bg-emerald-400/10 px-2.5 text-emerald-200 shadow-sm transition hover:bg-emerald-400/15" aria-label="Buka notifikasi WhatsApp" title="Notifikasi WhatsApp"><Bell size={17}/><span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#07101f]" aria-hidden="true" /></a>
          {isAdmin && <a href="/admin/sponsorship" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200" aria-label="Kelola sponsorship"><Handshake size={14}/> Sponsorship</a>}
        </div>
        <span className="admin-mobile-badge text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap">{isAdmin ? 'Admin Portal' : 'Portal Anggota'}</span>
      </header>
      {isAdmin && <a href="/admin/sponsorship" className="fixed right-5 top-4 z-50 hidden md:inline-flex items-center gap-2 rounded-xl border border-amber-400/20 bg-[#0b1224]/95 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-amber-200 shadow-xl backdrop-blur hover:border-amber-300/40" aria-label="Kelola sponsorship"><Handshake size={14}/> Sponsorship</a>}
      <main className="admin-main flex-1 min-w-0 min-h-0 h-0 overflow-y-scroll overflow-x-hidden flex flex-col overscroll-auto touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y', overscrollBehaviorY: 'auto', scrollbarGutter: 'stable' }}>{content}</main>
    </div>
  </div>;
}