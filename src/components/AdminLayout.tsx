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

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = isSidebarOpen ? 'hidden' : previous;
    return () => { document.body.style.overflow = previous; };
  }, [isSidebarOpen]);

  return (
    <div className="h-[100dvh] min-h-0 flex bg-slate-50 overflow-hidden">
      <Sidebar email={email} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 min-h-0 h-[100dvh] overflow-hidden">
        <header className="md:hidden sticky top-0 flex-shrink-0 px-4 py-3 bg-white/95 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between z-40 shadow-sm">
          <button type="button" onClick={() => setIsSidebarOpen(true)} className="min-w-11 min-h-11 p-2 text-slate-700 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors flex items-center gap-2 touch-manipulation" aria-label="Buka menu navigasi" aria-expanded={isSidebarOpen}>
            <MenuIcon size={22} />
            <span className="hidden xs:inline text-xs font-bold uppercase tracking-wider">Menu</span>
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-full whitespace-nowrap">Admin Portal</span>
        </header>
        <main className="admin-main flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col overscroll-contain">
          {isDashboard ? children : <AdminRouteView session={{ user: { email } }} />}
        </main>
      </div>
    </div>
  );
}
