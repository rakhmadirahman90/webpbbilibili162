import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu as MenuIcon } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  email: string;
}

export default function AdminLayout({ children, email }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="h-[100dvh] flex bg-slate-50 overflow-hidden">
      <Sidebar 
        email={email} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-hidden">
        <header className="md:hidden flex-shrink-0 px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2"
              aria-label="Open Menu"
            >
              <MenuIcon size={20} />
              <span className="text-xs font-bold uppercase tracking-wider">Menu</span>
            </button>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
            Admin Portal
          </span>
        </header>
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}
