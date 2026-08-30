import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import AdminRouteView from './AdminRouteView';
import { Menu as MenuIcon } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  email: string;
}

export default function AdminLayout({ children, email }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const adminPath = location.pathname.replace(/^\/admin\/?/, '').replace(/\/$/, '').toLowerCase();
  const isDashboard = adminPath === '' || adminPath === 'dashboard';

  // A route change must always close the mobile drawer first. This prevents
  // the backdrop from remaining over the newly selected admin page.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = isSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  return (
    <div className="h-[100dvh] min-h-0 flex bg-[#07101f] overflow-hidden">
      <Sidebar email={email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh] overflow-hidden bg-[#07101f]">
        <header className="admin-mobile-header md:hidden sticky top-0 flex-shrink-0 px-4 py-2.5 backdrop-blur-xl border-b flex items-center justify-between z-40 shadow-lg">
          <button type="button" onClick={() => setIsSidebarOpen(true)} className="admin-mobile-menu-btn min-w-11 min-h-11 p-2 rounded-xl transition-colors flex items-center gap-2 touch-manipulation" aria-label="Buka menu navigasi" aria-expanded={isSidebarOpen}>
            <MenuIcon size={22} />
            <span className="hidden xs:inline text-xs font-bold uppercase tracking-wider">Menu</span>
          </button>
          <span className="admin-mobile-badge text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full whitespace-nowrap">Admin Portal</span>
        </header>
        <main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">
          {isDashboard ? children : <AdminRouteView session={{ user: { email } }} />}
        </main>
      </div>
    </div>
  );
}
