import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
  email: string;
}

export default function AdminLayout({ children, email }: AdminLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar 
        email={email} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden p-4 bg-white border-b border-slate-100 flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
             {/* Menu Icon could be here */}
             Menu
          </button>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
