import React from 'react';
import { LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FooterProps {
  onNavigate?: (sectionId: string, subPath?: string) => void;
}

export default function Footer({ onNavigate }: FooterProps) {
  const navigate = useNavigate();

  return (
    <footer className="w-full py-5 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] border-t border-white/5 bg-[#070d1a] flex-shrink-0 z-10 relative flex flex-col sm:flex-row items-center justify-between px-6 lg:px-12 gap-3">
      <p>© 2026 PB BILIBILI 162. ALL RIGHTS RESERVED.</p>
      
      <button 
        onClick={() => navigate('/login')} 
        className="flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors cursor-pointer py-1.5 px-3 rounded-full bg-slate-900/80 border border-white/10 hover:border-blue-500/30 text-[9px] font-bold tracking-wider"
      >
        <LogIn size={12} className="text-blue-400" />
        <span>Portal Login System</span>
      </button>
    </footer>
  );
}